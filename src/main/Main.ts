import { ChildProcess, fork } from 'child_process';
import { app, ipcMain, IpcMainEvent, session, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as WebSocket from 'ws';
import { BackIn, BackInitArgs, BackOut } from '../shared/back/types';
import checkSanity from '../shared/checkSanity';
import { IMiscData, MiscIPC } from '../shared/interfaces';
import { InitRendererChannel, InitRendererData } from '../shared/IPC';
import { ILogPreEntry } from '../shared/Log/interface';
import { LogMainApi } from '../shared/Log/LogMainApi';
import { IAppPreferencesData } from '../shared/preferences/interfaces';
import { AppConfigMain } from './config/AppConfigMain';
import MainWindow from './MainWindow';
import { ServicesMainApi } from './service/ServicesMainApi';
import * as Util from './Util';

export class Main {
  private _mainWindow: MainWindow = new MainWindow(this);
  private _services?: ServicesMainApi;
  private _config: AppConfigMain = new AppConfigMain();
  private _installed: boolean = fs.existsSync('./.installed');
  /** The port that the back is listening on. */
  private _backPort: number = -1;
  /** Version of the launcher (timestamp of when it was built). Negative value if not found or not yet loaded. */
  private _version: number = -2;
  private _log: LogMainApi = new LogMainApi(this.sendToMainWindowRenderer.bind(this));
  public preferences?: IAppPreferencesData;
  public socket?: WebSocket;
  public backProc: ChildProcess | undefined;

  public get config(): AppConfigMain {
    return this._config;
  }

  public get installed(): boolean {
    return this._installed;
  }

  public get version(): number {
    return this._version;
  }

  constructor() {
    // Add app event listeners
    app.once('ready', this.onAppReady.bind(this));
    app.once('window-all-closed', this.onAppWindowAllClosed.bind(this));
    app.once('will-quit', this.onAppWillQuit.bind(this));
    app.once('web-contents-created', this.onAppWebContentsCreated.bind(this));
    // Add IPC event listeners
    this._log.bindListeners();
    ipcMain.on(MiscIPC.REQUEST_MISC_SYNC, this.onRequestMisc.bind(this));
    ipcMain.on(InitRendererChannel, this.onInit.bind(this));
    // Load various files and prepare the back
    Promise.all([
      this._config.load(this.installed),
      this.loadVersion(),
    ])
    .then(() => new Promise((resolve, reject) => {
      this.backProc = fork(path.join(__dirname, '../back/index.js'), undefined, {
        detached: false,
      });
      // Wait for process to initialize
      this.backProc.once('message', (port) => {
        if (port >= 0) {
          this._backPort = port;
          resolve();
        } else {
          reject(new Error(`Failed to start server in back process. Perhaps because it could not find an available port (range: [${msg.portMin}, ${msg.portMax}]).`));
        }
      });
      // Send initialize message
      const msg: BackInitArgs = {
        portMin: this._config.data.backPortMin,
        portMax: this._config.data.backPortMax,
        preferencesPath: Util.getPreferencesFilePath(this.installed),
      };
      this.backProc.send(JSON.stringify(msg));
    }))
    .then(() => new Promise((resolve, reject) => {
      const url = new URL('ws://localhost');
      url.host = 'localhost';
      url.port = this._backPort+'';
      this.socket = new WebSocket(url.href);
      this.socket.onopen = () => { resolve(); };
    }))
    .then(() => new Promise((resolve, reject) => {
      if (!this.socket) { throw new Error('socket is undefined'); }
      const socket = this.socket;
      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data.toString());
        if (msg[0] === BackOut.LOAD_PREFERENCES_RESPONSE) {
          this.preferences = msg[1];
          socket.onmessage = this.onMessage;
          resolve();
        } else { reject(new Error(`Failed to initialize. Did not expect messge type "${BackOut[msg[0]]}".`)); }
      };
      socket.send(JSON.stringify([
        BackIn.LOAD_PREFERENCES,
        Util.getPreferencesFilePath(this._installed)
      ]));
    }))
    .then(() => {
      // Check if we are ready to launch or not.
      // @TODO Launch the setup wizard when a check failed.
      checkSanity(this._config.data)
      .then(console.log, console.error);
      // Start background services
      this._services = new ServicesMainApi(this.sendToMainWindowRenderer.bind(this));
      this._services.on('output', this.pushLogData.bind(this));
      this._services.start(this._config.data);
      // Create main window when ready
      this._services.waitUntilDoneStarting()
      .then(Util.waitUntilReady)
      .then(() => {
        if (!this.preferences) { throw new Error('preferences is undefined'); }
        this._mainWindow.createWindow(this.preferences.mainWindow);
      });
    })
    .catch((error) => {
      console.log(error);
      app.quit();
    });
  }

  private onAppReady(): void {
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
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      // Parse URL
      let url: URL | undefined;
      try { url = new URL(details.url); }
      catch (e) { /* Do nothing. */ }
      // Don't accept any connections other than WebSocket to localhost
      if (url && url.protocol === 'ws:' && url.hostname === 'localhost') {
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

  private onAppWillQuit(): void {
    if (this._services) {
      this._services.stopAll();
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

  /** Fetch and store the value of the version file. */
  private loadVersion(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Select which folder to load the version from
      // (depending on if this is running in a build, or in "development mode")
      const folderPath = Util.isDev
        ? process.cwd()
        : path.dirname(app.getPath('exe'));
      // Try reading the version from the file
      fs.readFile(path.join(folderPath, '.version'), (error, data) => {
        this._version = data
          // (Remove all non-numerical characters, then parse it as a string)
          ? parseInt(data.toString().replace(/[^\d]/g, ''), 10)
          // (Version not found error code)
          : -1;
        resolve();
      });
    });
  }

  private onRequestMisc = (event: IpcMainEvent) => {
    const misc: IMiscData = {
      installed: this._installed,
      version: this._version,
    };
    event.returnValue = misc;
  };

  private onInit(event: IpcMainEvent) {
    const data: InitRendererData = {
      port: this._backPort,
    };
    event.returnValue = data;
  }

  private onMessage = (message: any) => {
    const msg = JSON.parse(message);
    switch (msg[0]) {
      case BackOut.UPDATE_PREFERENCES_RESPONSE:
        this.preferences = msg[1];
        break;
    }
  }

  /**
   * Append the output to the internal log data object and tell the main window
   * about the updated log data. The main window will display the log data in
   * the "Logs" tab. Also print the output to stdout.
   * @param output The log entry to be added. Must end with a new line.
   */
  private pushLogData(output: ILogPreEntry): void {
    // process.stdout.write(output);
    this._log.addEntry(output);
  }

  /** Send a message to the main windows renderer */
  private sendToMainWindowRenderer(channel: string , ...rest: any[]): boolean {
    if (!this._mainWindow.window) { return false; }
    this._mainWindow.window.webContents.send(channel, ...rest);
    return true;
  }
}
