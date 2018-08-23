import { app, session, ipcMain } from 'electron';
import MainWindow from './MainWindow';
import * as Util from './Util';
import { AppConfig } from '../shared/config/AppConfig';
import { IAppConfigData } from '../shared/config/IAppConfigData';
import BackgroundServices from './BackgroundServices';
import FlashPlayer from './FlashPlayer';
import checkSanity from './checkSanity';

export class Main {
  private _mainWindow: MainWindow = new MainWindow(this);
  private _backgroundServices: BackgroundServices;
  private _flashPlayer: FlashPlayer;
  private _config?: IAppConfigData;

  public get config(): IAppConfigData {
    if (!this._config) { throw new Error('You must not try to access config before it is loaded!'); }
    return this._config;
  }

  constructor() {
    // Add app event listeners
    app.once('ready', this.onAppReady.bind(this));
    app.once('window-all-closed', this.onAppWindowAllClosed.bind(this));

    // Add IPC event listeners
    ipcMain.on('launch-game-sync', this.onLaunchGameSync.bind(this));
    ipcMain.on('get-config', this.onGetConfig.bind(this));
    ipcMain.on('get-config-sync', this.onGetConfigSync.bind(this));

    // Load config file
    this.loadConfig();

    // Check if we are ready to launch or not.
    // TODO: Launch the setup wizard when a check failed.
    checkSanity(this.config).then(console.log, console.error);

    // Create FlashPlayer class
    this._flashPlayer = new FlashPlayer(this.config.flashpointPath);

    // Start background services
    this._backgroundServices = new BackgroundServices(this.config.flashpointPath);
    this._backgroundServices.start();
  }

  private onAppReady() {
    if (!session.defaultSession) {
      throw new Error('Default session is missing!');
    }

    // Reject all permission requests since we don't need any permissions.
    session.defaultSession.setPermissionRequestHandler(
      (webContents, permission, callback) => callback(false)
    );

    // Stop non-local resources from being fetched (as long as their response has at least one header?)
    // Only allow local scripts to execute (Not sure what this allows? "file://"? "localhost"?)
    // (TypeScript type information is missing, check the link below for the type info)
    // https://github.com/electron/electron/blob/master/docs/api/web-request.md#webrequestonheadersreceivedfilter-listener
    session.defaultSession.webRequest.onHeadersReceived(
      (details: any, callback: Function) => callback({
        responseHeaders: `script-src 'self'`,
        cancel: true
      })
    );

    this._mainWindow.createWindow();
  }

  private onAppWindowAllClosed() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
      this._backgroundServices.stop();
    }
  }

  /**
   * Load the application config in SYNC.
   *
   * @TODO: Make this function more sync-like.
   */
  private loadConfig() {
    Util.readConfigFile((err, data) => {
      // Check if config data failed to load
      if (err || !data) {
        // Set the config data to the default
        data = AppConfig.createCopyOfDefaults(process.platform);
        // Create a new config file with the default configs
        Util.saveConfigFile(data, false);
      }
      // Set config data
      this._config = data;
      //
      console.log('Configs:', data);
    });
  }

  /** Launch a game using some if its properties */
  private onLaunchGameSync(event: Electron.IpcMessageEvent, applicationPath: string, args: string[]) {
    console.log('Launch game:', applicationPath, args);

    this._flashPlayer.launch(applicationPath, args);

    // Set return value (this makes the renderer process "unpause")
    event.returnValue = null;
  }

  private onGetConfig(event: Electron.IpcMessageEvent, arg: any): void {
    // WARNING: Maybe this should make sure that the config doesn't contain anything dangerous.
    // (Maybe convert it to a JSON string and back?)
    event.sender.send('get-config-response', this.config);
  }

  private onGetConfigSync(event: Electron.IpcMessageEvent, arg: any): void {
    // WARNING: Maybe this should make sure that the config doesn't contain anything dangerous.
    // (Maybe convert it to a JSON string and back?)
    event.returnValue = this.config;
  }
}
