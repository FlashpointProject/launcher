import { ChildProcess, fork } from 'child_process';
import { randomBytes } from 'crypto';
import { app, ipcMain, IpcMainEvent, session, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as WebSocket from 'ws';
import { BackIn, BackInitArgs, BackOut, GetMainInitDataResponse, WrappedRequest, WrappedResponse } from '../shared/back/types';
import { IAppConfigData } from '../shared/config/interfaces';
import { IMiscData, MiscIPC } from '../shared/interfaces';
import { InitRendererChannel, InitRendererData } from '../shared/IPC';
import { IAppPreferencesData } from '../shared/preferences/interfaces';
import MainWindow from './MainWindow';
import * as Util from './Util';

export class Main {
  private _mainWindow: MainWindow = new MainWindow(this);
  private _installed?: boolean;
  /** The port that the back is listening on. */
  private _backPort: number = -1;
  private _secret: string = randomBytes(2048).toString('hex');
  /** Version of the launcher (timestamp of when it was built). Negative value if not found or not yet loaded. */
  private _version: number = -2;
  public preferences?: IAppPreferencesData;
  public config?: IAppConfigData;
  public socket?: WebSocket;
  public backProc: ChildProcess | undefined;

  constructor() {
    // Add app event listeners
    app.once('ready', this.onAppReady.bind(this));
    app.once('window-all-closed', this.onAppWindowAllClosed.bind(this));
    app.once('will-quit', this.onAppWillQuit.bind(this));
    app.once('web-contents-created', this.onAppWebContentsCreated.bind(this));

    // Add IPC event listeners
    ipcMain.on(MiscIPC.REQUEST_MISC_SYNC, this.onRequestMisc.bind(this));
    ipcMain.on(InitRendererChannel, this.onInit.bind(this));

    // ---- Initialize ----
    // Check if installed
    exists('./.installed')
    .then(exists => { this._installed = exists; })
    // Load version number
    .then(() => new Promise((resolve, reject) => {
      const folderPath = (Util.isDev)
        ? process.cwd()
        : path.dirname(app.getPath('exe'));
      fs.readFile(path.join(folderPath, '.version'), (error, data) => {
        this._version = (data)
          ? parseInt(data.toString().replace(/[^\d]/g, ''), 10) // (Remove all non-numerical characters, then parse it as a string)
          : -1; // (Version not found error code)
        resolve();
      });
    }))
    // Start back process
    .then(() => new Promise((resolve, reject) => {
      this.backProc = fork(path.join(__dirname, '../back/index.js'), undefined, { detached: true });
      // Wait for process to initialize
      this.backProc.once('message', (port) => {
        if (port >= 0) {
          this._backPort = port;
          resolve();
        } else {
          reject(new Error('Failed to start server in back process. Perhaps because it could not find an available port.'));
        }
      });
      // Send initialize message
      const msg: BackInitArgs = {
        configFolder: Util.getConfigFolderPath(!!this._installed),
        secret: this._secret,
        isDev: Util.isDev,
        countryCode: app.getLocaleCountryCode().toLowerCase() || '',
        exePath: path.dirname(app.getPath('exe')),
      };
      this.backProc.send(JSON.stringify(msg));
    }))
    // Connect to back process
    .then<WebSocket>(() => new Promise((resolve, reject) => {
      const url = new URL('ws://localhost');
      url.host = 'localhost';
      url.port = this._backPort+'';
      const ws = new WebSocket(url.href);
      ws.onclose = () => { reject(new Error('Failed to authenticate to the back.')); };
      ws.onerror = (event) => { reject(event.error); };
      ws.onopen  = () => {
        ws.onmessage = () => {
          ws.onclose = (event) => { console.log('socket closed', event.code, event.reason); };
          ws.onerror = (event) => { console.log('socket error', event.error); };
          resolve(ws);
        };
        ws.send(this._secret);
      };
    }))
    // Send init message
    .then(ws => new Promise((resolve, reject) => {
      ws.onmessage = (event) => {
        const res: WrappedResponse = JSON.parse(event.data.toString());
        if (res.type === BackOut.GET_MAIN_INIT_DATA) {
          const data: GetMainInitDataResponse = res.data;
          this.preferences = data.preferences;
          this.config = data.config;
          this.socket = ws;
          this.socket.onmessage = this.onMessage;
          resolve();
        }// else { reject(new Error(`Failed to initialize. Did not expect message type "${BackOut[res.type]}".`)); }
      };
      const req: WrappedRequest = {
        id: 'init',
        type: BackIn.GET_MAIN_INIT_DATA,
      };
      ws.send(JSON.stringify(req));
    }))
    .then(() => {
      if (!this.config) { throw new Error('config is undefined'); }
      // Create main window when ready
      Util.waitUntilReady()
      .then(() => {
        if (!this.preferences) { throw new Error('preferences is undefined'); }
        this._mainWindow.createWindow(this.preferences.mainWindow);
      });
    })
    .catch((error) => {
      console.error(error);
      app.quit();
    });
  }

  onMessage = (message: WebSocket.MessageEvent): void => {
    const res: WrappedResponse = JSON.parse(message.data.toString());
    switch (res.type) {
      case BackOut.QUIT: {
        this.socket = undefined;
        this.backProc = undefined;
        app.quit();
      } break;
    }
  }

  private onAppReady(): void {
    if (!session.defaultSession) {
      throw new Error('Default session is missing!');
    }
    // Reject all permission requests since we don't need any permissions.
    session.defaultSession.setPermissionRequestHandler(
      (webContents, permission, callback) => callback(false)
    );
    // Ignore proxy settings with chromium APIs (makes WebSockets not close when the Redirector changes proxy settings)
    session.defaultSession.setProxy({
      pacScript: '',
      proxyRules: '',
      proxyBypassRules: '',
    });
    // Stop non-local resources from being fetched (as long as their response has at least one header?)
    // Only allow local scripts to execute (Not sure what this allows? "file://"? "localhost"?)
    // (TypeScript type information is missing, check the link below for the type info)
    // https://github.com/electron/electron/blob/master/docs/api/web-request.md#webrequestonheadersreceivedfilter-listener
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      let url: URL | undefined;
      try { url = new URL(details.url); }
      catch (e) { /* Do nothing. */ }
      // Don't accept any connections other than to localhost
      if (url && url.hostname === 'localhost') {
        callback({
          ...details.responseHeaders,
          responseHeaders: 'script-src \'self\'',
        });
      } else {
        callback({
          ...details.responseHeaders,
          responseHeaders: 'script-src \'self\'',
          cancel: true
        });
      }
    });
  }

  private onAppWindowAllClosed(): void {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  private onAppWillQuit(event: Event): void {
    if (this.socket) {
      event.preventDefault();
      const req: WrappedRequest = {
        id: '',
        type: BackIn.QUIT,
      };
      this.socket.send(JSON.stringify(req));
    }
  }

  private onAppWebContentsCreated(event: Electron.Event, webContents: Electron.WebContents): void {
    // Open links to web pages in the OS-es default browser
    // (instead of navigating to it with the electron window that opened it)
    webContents.on('will-navigate', (event, navigationUrl) => {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    });
  }

  private onRequestMisc = (event: IpcMainEvent) => {
    if (this._installed === undefined) { throw new Error('installed is undefined.'); }
    const misc: IMiscData = {
      installed: this._installed,
      version: this._version,
    };
    event.returnValue = misc;
  };

  private onInit(event: IpcMainEvent) {
    const data: InitRendererData = {
      port: this._backPort,
      secret: this._secret,
    };
    event.returnValue = data;
  }
}

function exists(filePath: string): Promise<boolean> {
  return new Promise(resolve => {
    fs.stat(filePath, (error, stats) => {
      if (error) { resolve(false); }
      else { resolve(stats.isFile()); }
    });
  });
}
