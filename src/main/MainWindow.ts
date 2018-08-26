import { app, session, BrowserWindow, WebContents, PermissionRequestHandlerDetails } from 'electron';
import * as path from 'path';
import { IAppConfigData } from '../shared/config/IAppConfigData';
import { Main } from './Main';
import * as Util from './Util';
import * as AppConstants from '../shared/AppConstants';

export default class MainWindow {
  private _main: Main;
  private _window?: Electron.BrowserWindow;
  private _logData: string = '';

  public get window(): Electron.BrowserWindow | undefined {
    return this._window;
  }

  constructor(main: Main) {
    // Keep a reference to main
    this._main = main;
    // Add app event listener(s)
    app.on('activate', this.onAppActivate.bind(this));
  }

  public createWindow(): void {
    if (this._window) {
      throw new Error('Window already created!');
    }
    // Create the browser window.
    this._window = new BrowserWindow({
      title: AppConstants.appTitle,
      height: 650,
      width: 1000,
      frame: !this._main.config.useCustomTitlebar,
      webPreferences: {
        preload: path.resolve(__dirname, './MainWindowPreload.js'),
      },
    });
    // Remove the menu bar
    this._window.setMenu(null);
    // and load the index.html of the app.
    this._window.loadFile(path.join(__dirname, '../renderer/index.html'));
    // Open the DevTools.
    if (Util.isDev) {
      this._window.webContents.openDevTools();
    }
    // Send the window all of the log data that was emitted before its creation
    this.sendLogDataToWindow();
    // Emitted when the window is closed.
    this._window.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      this._window = undefined;
    });
  }

  private onAppActivate(): void {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (this._window == null) {
      this.createWindow();
    }
  }

  public getConfig(): IAppConfigData {
    return this._main.config;
  }

  /**
   * Store the updated log data and send it to the window if it's created.
   *
   * @param fullLog The full log data from start to finish. Lines are separated
   * with a new line.
   */
  public updateLogData(fullLog: string) {
    this._logData = fullLog;
    this.sendLogDataToWindow();
  }

  /**
   * Send the log data to the window. Will do nothing if the window is not
   * created. This function is safe to call at all times.
   */
  private sendLogDataToWindow() {
    if (this._window) {
      this._window.webContents.send('log-data-update', this._logData);
    }
  }
}
