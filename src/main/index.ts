import { ChildProcess, fork } from 'child_process';
import { randomBytes } from 'crypto';
import { app, BrowserWindow, ipcMain, IpcMainEvent, session, shell, WebContents } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as WebSocket from 'ws';
import { BackIn, BackInitArgs, BackOut, GetMainInitDataResponse, SetLocaleData, WrappedRequest, WrappedResponse } from '../shared/back/types';
import { IAppConfigData } from '../shared/config/interfaces';
import { APP_TITLE } from '../shared/constants';
import { IMiscData, MiscIPC, WindowIPC } from '../shared/interfaces';
import { InitRendererChannel, InitRendererData } from '../shared/IPC';
import { IAppPreferencesData } from '../shared/preferences/interfaces';
import * as Util from './Util';

type MainState = {
  window?: BrowserWindow;
  _installed?: boolean;
  /** The port that the back is listening on. */
  _backPort: number;
  _secret: string;
  /** Version of the launcher (timestamp of when it was built). Negative value if not found or not yet loaded. */
  _version: number;
  preferences?: IAppPreferencesData;
  config?: IAppConfigData;
  socket?: WebSocket;
  backProc?: ChildProcess;
  _sentLocaleCode: boolean;
}

const state: MainState = {
  window: undefined,
  _installed: undefined,
  /** The port that the back is listening on. */
  _backPort: -1,
  _secret: randomBytes(2048).toString('hex'),
  /** Version of the launcher (timestamp of when it was built). Negative value if not found or not yet loaded. */
  _version: -2,
  preferences: undefined,
  config: undefined,
  socket: undefined,
  backProc: undefined,
  _sentLocaleCode: false,
};

main();

function main() {
  // Add app event listeners
  app.once('ready', onAppReady);
  app.once('window-all-closed', onAppWindowAllClosed);
  app.once('will-quit', onAppWillQuit);
  app.once('web-contents-created', onAppWebContentsCreated);
  app.on('activate', onAppActivate);

  // Add IPC event listeners
  ipcMain.on(MiscIPC.REQUEST_MISC_SYNC, onRequestMisc);
  ipcMain.on(InitRendererChannel, onInit);

  // ---- Initialize ----
  // Check if installed
  exists('./.installed')
  .then(exists => { state._installed = exists; })
  // Load version number
  .then(() => new Promise(resolve => {
    const folderPath = (Util.isDev)
      ? process.cwd()
      : path.dirname(app.getPath('exe'));
    fs.readFile(path.join(folderPath, '.version'), (error, data) => {
      state._version = (data)
        ? parseInt(data.toString().replace(/[^\d]/g, ''), 10) // (Remove all non-numerical characters, then parse it as a string)
        : -1; // (Version not found error code)
      resolve();
    });
  }))
  // Start back process
  .then(() => new Promise((resolve, reject) => {
    state.backProc = fork(path.join(__dirname, '../back/index.js'), undefined, { detached: true });
    // Wait for process to initialize
    state.backProc.once('message', (port) => {
      if (port >= 0) {
        state._backPort = port;
        resolve();
      } else {
        reject(new Error('Failed to start server in back process. Perhaps because it could not find an available port.'));
      }
    });
    // On windows you have to wait for app to be ready before you call app.getLocale() (so it will be sent later)
    let localeCode: string = 'en';
    if (process.platform === 'win32' && !app.isReady()) {
      localeCode = 'en';
    } else {
      localeCode = app.getLocale().toLowerCase();
      state._sentLocaleCode = true;
    }
    // Send initialize message
    const msg: BackInitArgs = {
      configFolder: Util.getConfigFolderPath(!!state._installed),
      secret: state._secret,
      isDev: Util.isDev,
      // On windows you have to wait for app to be ready before you call app.getLocale() (so it will be sent later)
      localeCode: localeCode,
      exePath: path.dirname(app.getPath('exe')),
    };
    state.backProc.send(JSON.stringify(msg));
  }))
  // Connect to back process
  .then<WebSocket>(() => new Promise((resolve, reject) => {
    const url = new URL('ws://localhost');
    url.host = 'localhost';
    url.port = state._backPort+'';
    const ws = new WebSocket(url.href);
    ws.onclose = () => { reject(new Error('Failed to authenticate to the back.')); };
    ws.onerror = (event) => { reject(event.error); };
    ws.onopen  = () => {
      ws.onmessage = () => {
        ws.onclose = (event) => { console.log('socket closed', event.code, event.reason); };
        ws.onerror = (event) => { console.log('socket error', event.error); };
        resolve(ws);
      };
      ws.send(state._secret);
    };
  }))
  // Send init message
  .then(ws => new Promise((resolve, reject) => {
    ws.onmessage = (event) => {
      const res: WrappedResponse = JSON.parse(event.data.toString());
      if (res.type === BackOut.GET_MAIN_INIT_DATA) {
        const data: GetMainInitDataResponse = res.data;
        state.preferences = data.preferences;
        state.config = data.config;
        state.socket = ws;
        state.socket.onmessage = onMessage;
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
    // Create main window when ready
    Util.waitUntilReady()
    .then(() => { createMainWindow(); });
  })
  .catch((error) => {
    console.error(error);
    app.quit();
  });
}

function onMessage(message: WebSocket.MessageEvent): void {
  const res: WrappedResponse = JSON.parse(message.data.toString());
  switch (res.type) {
    case BackOut.QUIT: {
      state.socket = undefined;
      state.backProc = undefined;
      app.quit();
    } break;
  }
}

function onAppReady(): void {
  if (!session.defaultSession) {
    throw new Error('Default session is missing!');
  }
  // Send locale code (if it has no been sent already)
  if (process.platform === 'win32' && !state._sentLocaleCode && state.socket) {
    state._sentLocaleCode = true;
    sendReq<SetLocaleData>({
      id: '',
      type: BackIn.SET_LOCALE,
      data: app.getLocale().toLowerCase(),
    });
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

function onAppWindowAllClosed(): void {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
}

function onAppWillQuit(event: Event): void {
  if (state.socket) {
    event.preventDefault();
    sendReq<undefined>({
      id: '',
      type: BackIn.QUIT,
    });
  }
}

function onAppWebContentsCreated(event: Electron.Event, webContents: Electron.WebContents): void {
  // Open links to web pages in the OS-es default browser
  // (instead of navigating to it with the electron window that opened it)
  webContents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
}

function onAppActivate(): void {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!state.window) { createMainWindow(); }
}

function onRequestMisc(event: IpcMainEvent): void {
  if (state._installed === undefined) { throw new Error('installed is undefined.'); }
  const misc: IMiscData = {
    installed: state._installed,
    version: state._version,
  };
  event.returnValue = misc;
}

function onInit(event: IpcMainEvent) {
  const data: InitRendererData = {
    port: state._backPort,
    secret: state._secret,
  };
  event.returnValue = data;
}

function sendReq<U = any>(request: WrappedRequest<U>): void {
  if (state.socket) {
    state.socket.send(JSON.stringify(request));
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

function createMainWindow(): BrowserWindow {
  if (!state.preferences) { throw new Error('Preferences must be set before you can open a window.'); }
  if (!state.config)      { throw new Error('Configs must be set before you can open a window.'); }
  const mw = state.preferences.mainWindow;
  // Create the browser window.
  let width:  number = mw.width  ? mw.width  : 1000;
  let height: number = mw.height ? mw.height :  650;
  if (mw.width && mw.height && !state.config.useCustomTitlebar) {
    width  += 8; // Add the width of the window-grab-things,
    height += 8; // they are 4 pixels wide each (at least for me @TBubba)
  }
  const window = new BrowserWindow({
    title: APP_TITLE,
    x: mw.x,
    y: mw.y,
    width: width,
    height: height,
    frame: !state.config.useCustomTitlebar,
    icon: path.join(__dirname, '../window/images/icon.png'),
    webPreferences: {
      preload: path.resolve(__dirname, './MainWindowPreload.js'),
      nodeIntegration: true,
    },
  });
  // Remove the menu bar
  window.setMenu(null);
  // and load the index.html of the app.
  window.loadFile(path.join(__dirname, '../window/index.html'));
  // Open the DevTools. Don't open if using a remote debugger (like vscode)
  if (Util.isDev && !process.env.REMOTE_DEBUG) {
    window.webContents.openDevTools();
  }
  // Maximize window
  if (mw.maximized) {
    window.maximize();
  }
  // Relay window's maximize/unmaximize events to the renderer (as a single event with a flag)
  window.on('maximize', (event: BrowserWindowEvent) => {
    event.sender.send(WindowIPC.WINDOW_MAXIMIZE, true);
  });
  window.on('unmaximize', (event: BrowserWindowEvent) => {
    event.sender.send(WindowIPC.WINDOW_MAXIMIZE, false);
  });
  // Replay window's move event to the renderer
  window.on('move', () => {
    if (!window) { throw new Error(); }
    const pos = window.getPosition();
    const isMaximized = window.isMaximized();
    window.webContents.send(WindowIPC.WINDOW_MOVE, pos[0], pos[1], isMaximized);
  });
  // Replay window's move event to the renderer
  window.on('resize', () => {
    if (!window) { throw new Error(); }
    const size = window.getSize();
    const isMaximized = window.isMaximized();
    window.webContents.send(WindowIPC.WINDOW_RESIZE, size[0], size[1], isMaximized);
  });
  // Derefence window when closed
  window.on('closed', () => {
    if (state.window === window) {
      state.window = undefined;
    }
  });
  return window;
}

/**
 * Type of the event emitted by BrowserWindow for the "maximize" and "unmaximize" events.
 * This type is not defined by Electron, so I guess I have to do it here instead.
 */
type BrowserWindowEvent = {
  preventDefault: () => void;
  sender: WebContents;
};
