import { app, session, BrowserWindow, WebContents, PermissionRequestHandlerDetails } from 'electron';
import * as path from 'path';
import { MainWindow } from './MainWindow';

export class Main {
  private _mainWindow: MainWindow = new MainWindow();

  constructor() {
    // Add app event listeners
    app.once('ready', this.onAppReady.bind(this));
    app.once('window-all-closed', this.onAppWindowAllClosed.bind(this));
    app.on('web-contents-created', this.onAppWebContentsCreated.bind(this));
  }

  private onAppReady() {
    const defaultSession: Electron.Session = session.fromPartition('');
    // Create the main window
    this._mainWindow.createWindow();
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
}