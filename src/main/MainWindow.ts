import { app, session, BrowserWindow, WebContents, PermissionRequestHandlerDetails } from 'electron';
import * as path from 'path';

export class MainWindow {
  private _window: Electron.BrowserWindow|null = null;

  public get window(): Electron.BrowserWindow|null {
    return this._window;
  }

  constructor() {
    // Add app event listener(s)
    app.on('activate', this.onAppActivate.bind(this));
  }

  public createWindow() {
    if (this._window) {
      throw new Error('Window already created!');
    }
    // Create the browser window.
    this._window = new BrowserWindow({
      title: 'Flash Electron',
      height: 600,
      width: 800,
      webPreferences: {
        // Security
        nodeIntegration: false,
        contextIsolation: true,
        // Enable flash player plugin
        plugins: true,
        // Misc
        zoomFactor: 1,
      },
    });
    // and load the index.html of the app.
    this._window.loadFile(path.join(__dirname, '../renderer/index.html'));
    // Open the DevTools.
    this._window.webContents.openDevTools();
    // Emitted when the window is closed.
    this._window.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      this._window = null;
    });
  }

  private onAppActivate() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (this._window === null) {
      this.createWindow();
    }
  }
}