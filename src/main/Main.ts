import { app, session, BrowserWindow, WebContents, PermissionRequestHandlerDetails, ipcMain, ipcRenderer } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';
import { MainWindow } from './MainWindow';
import * as Util from './Util';
import * as fs from 'fs';
import { AppConfig } from '../shared/config/AppConfig';
import { IAppConfigData } from '../shared/config/IAppConfigData';
import BackgroundServices from './BackgroundServices';
import FlashPlayer from './FlashPlayer';

export class Main {
  private _mainWindow: MainWindow = new MainWindow(this);
  private _backgroundServices: BackgroundServices;
  private _flashPlayer: FlashPlayer;
  private _confing: IAppConfigData|undefined;

  public get config(): IAppConfigData {
    if (!this._confing) { throw new Error('You must not try to access config before it is loaded!'); }
    return this._confing;
  }

  constructor() {
    // Add app event listeners
    app.once('ready', this.onAppReady.bind(this));
    app.once('window-all-closed', this.onAppWindowAllClosed.bind(this));
    app.on('web-contents-created', this.onAppWebContentsCreated.bind(this));
    // Add IPC event listeners
    ipcMain.on('launch-game-sync', this.onLaunchGameSync.bind(this));
    ipcMain.on('get-config', this.onGetConfig.bind(this));
    ipcMain.on('get-config-sync', this.onGetConfigSync.bind(this));
    // Load config file
    this.loadConfig();
    // Create FlashPlayer class
    this._flashPlayer = new FlashPlayer(this.config.flashpointPath);
    // Start background services
    this._backgroundServices = new BackgroundServices(this.config.flashpointPath);
    this._backgroundServices.start();
  }

  private onAppReady() {
    // Create the main window
    this._mainWindow.createWindow();
    //
    const defaultSession: Electron.Session = session.fromPartition('');
    //
    defaultSession.webRequest.onHeadersReceived(onHeaderReceived);
    function onHeaderReceived() {
      console.log('Header Received:', arguments)
    }
    // Set permission request handler for the default partition
    // (Renderer requests for things like webcam, microphone etc.)
    defaultSession.setPermissionRequestHandler(onPermissionRequest);
    function onPermissionRequest(webContents: WebContents, permission: string, callback: (permissionGranted: boolean) => void, details: PermissionRequestHandlerDetails): void | null {
      console.log('Permission Request:', arguments);
      // Disable all (other) permissions
      return callback(false);
      /*
      const url = webContents.getURL();
      if (!url.startsWith('https://my-website.com')) {
        return callback(false); // Denies the permissions request
      } 
      if (permission === 'notifications') {
        callback(true); // Approves the permissions request
      }
      */
    }
  }

  private onAppWindowAllClosed() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
      this._backgroundServices.stop();
    }
  }

  private onAppWebContentsCreated(event: Electron.Event, contents: Electron.WebContents) {
    contents.on('will-attach-webview', (event: Electron.Event, webPreferences: any, params: any) => {
      // Remove preload scripts (if any)
      delete webPreferences.preload;
      delete webPreferences.preloadURL;
      // Disable Node.js integration
      webPreferences.nodeIntegration = false;
    });
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
        data = AppConfig.createCopyOfDefaults();
        // Create a new config file with the default configs
        Util.saveConfigFile(data, false);
      }
      // Set config data
      this._confing = data;
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
    // WARNING: Maybe this should make sure that the config doesnt contain anything dangerous.
    // (Maybe convert it to a JSON string and back?)
    event.sender.send('get-config-response', this.config);
  }
  
  private onGetConfigSync(event: Electron.IpcMessageEvent, arg: any): void {
    // WARNING: Maybe this should make sure that the config doesnt contain anything dangerous.
    // (Maybe convert it to a JSON string and back?)
    event.returnValue = this.config;
  }
}