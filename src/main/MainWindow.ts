import { app, session, BrowserWindow, WebContents, PermissionRequestHandlerDetails } from 'electron';
import * as path from 'path';
import { IAppConfigData } from '../shared/config/IAppConfigData';
import { Main } from './Main';
import * as Util from './Util';

export class MainWindow {
  private _main: Main;
  private _window: Electron.BrowserWindow|null = null;

  public get window(): Electron.BrowserWindow|null {
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
      title: 'Library Thingie',
      height: 600,
      width: 800,
      frame: false,
      webPreferences: {
        preload: path.resolve(__dirname, '../main/MainWindowPreload.js'),
        // Security
        nodeIntegration: false,
        contextIsolation: false,
      },
    });
    // and load the index.html of the app.
    this._window.loadFile(path.join(__dirname, '../renderer/index.html'));
    // Open the DevTools.
    if (Util.isDev) {
      this._window.webContents.openDevTools();
    }
    // Emitted when the window is closed.
    this._window.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      this._window = null;
    });
  }

  private onAppActivate(): void {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (this._window === null) {
      this.createWindow();
    }
  }

  public getConfig(): IAppConfigData {
    return this._main.config;
  }
}