import { app, BrowserWindow } from 'electron';
import * as path from 'path';
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
    this.sendLogDataToRenderer =this.sendLogDataToRenderer.bind(this);
  }

  /** Create the window */
  public createWindow(): void {
    if (this._window) {
      throw new Error('Window already created!');
    }
    // Create the browser window.
    let width: number = 1000;
    let height: number = 650;
    if (!this._main.config.useCustomTitlebar) {
      width += 8;  // Add the width of the window-grab-things,
      height += 8; // they are 4 pixels wide each (at least for me @TBubba)
    }
    this._window = new BrowserWindow({
      title: AppConstants.appTitle,
      width: width,
      height: height,
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
    // Emitted when the window is closed.
    this._window.on('closed', () => {
      this._window = undefined; // (Dereference the window object)
    });
  }

  private onAppActivate(): void {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (this._window == null) {
      this.createWindow();
    }
  }
  
  /**
   * Add data to the log and send the full log to the window (if it is created)
   * @param data Text to add to the end of the log
   */
  public appendLogData(data: string): void {
    this._logData += data;
    this.sendLogDataToRenderer();
  }

  /** Send the log data to the renderer (this silently fails if the window is missing) */
  public sendLogDataToRenderer() {
    if (this._window) {
      this._window.webContents.send('log-data-update', this._logData);
    }
  }
}
