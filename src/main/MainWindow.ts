import { app, BrowserWindow, WebContents } from 'electron';
import * as path from 'path';
import * as AppConstants from '../shared/AppConstants';
import { WindowIPC } from '../shared/interfaces';
import { Main } from './Main';
import * as Util from './Util';

export default class MainWindow {
  private _main: Main;
  private _window?: Electron.BrowserWindow;

  public get window(): Electron.BrowserWindow | undefined {
    return this._window;
  }

  constructor(main: Main) {
    // Keep a reference to main
    this._main = main;
    // Add app event listener(s)
    app.on('activate', this.onAppActivate.bind(this));
  }

  /** Create the window */
  public createWindow(): void {
    if (this._window) {
      throw new Error('Window already created!');
    }
    // Create the browser window.
    const mw = this._main.preferences.data.mainWindow;
    let width:  number = (mw.width  !== undefined) ? mw.width  : 1000;
    let height: number = (mw.height !== undefined) ? mw.height :  650;
    if (mw.width === undefined && mw.height === undefined &&
        !this._main.config.data.useCustomTitlebar) {
      width  += 8; // Add the width of the window-grab-things,
      height += 8; // they are 4 pixels wide each (at least for me @TBubba)
    }
    this._window = new BrowserWindow({
      title: AppConstants.appTitle,
      x: mw.x,
      y: mw.y,
      width: width,
      height: height,
      frame: !this._main.config.data.useCustomTitlebar,
      webPreferences: {
        preload: path.resolve(__dirname, './MainWindowPreload.js'),
        nodeIntegration: true,
      },
    });
    // Remove the menu bar
    this._window.setMenu(null);
    // and load the index.html of the app.
    this._window.loadFile(path.join(__dirname, '../window/index.html'));
    // Open the DevTools.
    if (Util.isDev) {
      this._window.webContents.openDevTools();
    }
    // Maximize window
    if (mw.maximized) {
      this._window.maximize();
    }
    // Relay window's maximize/unmaximize events to the renderer (as a single event with a flag)
    this._window.on('maximize', (event: BrowserWindowEvent) => {
      event.sender.send(WindowIPC.WINDOW_MAXIMIZE, true);
    });
    this._window.on('unmaximize', (event: BrowserWindowEvent) => {
      event.sender.send(WindowIPC.WINDOW_MAXIMIZE, false);
    });
    // Replay window's move event to the renderer
    this._window.on('move', () => {
      if (!this._window) { throw new Error(); }
      const pos = this._window.getPosition();
      const isMaximized = this._window.isMaximized();
      this._window.webContents.send(WindowIPC.WINDOW_MOVE, pos[0], pos[1], isMaximized);
    });
    // Replay window's move event to the renderer
    this._window.on('resize', () => {
      if (!this._window) { throw new Error(); }
      const size = this._window.getSize();
      const isMaximized = this._window.isMaximized();
      this._window.webContents.send(WindowIPC.WINDOW_RESIZE, size[0], size[1], isMaximized);
    });
    // Emitted when the window is closed.
    this._window.on('closed', () => {
      this._window = undefined; // (Dereference the window object)
    });
  }

  private onAppActivate(): void {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (!this._window) {
      this.createWindow();
    }
  }
}

/**
 * Type of the event emitted by BrowserWindow for the "maximize" and "unmaximize" events.
 * This type is not defined by Electron, so I guess I have to do it here instead.
 */
type BrowserWindowEvent = {
  preventDefault: () => void;
  sender: WebContents;
};
