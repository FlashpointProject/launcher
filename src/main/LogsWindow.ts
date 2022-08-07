import { ConfigFile } from '@back/ConfigFile';
import { CONFIG_FILENAME, PREFERENCES_FILENAME } from '@back/constants';
import * as remoteMain from '@electron/remote/main';
import { SocketClient } from '@shared/back/SocketClient';
import { BackOut } from '@shared/back/types';
import { AppConfigData } from '@shared/config/interfaces';
import { InitRendererChannel, InitRendererData } from '@shared/IPC';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { createErrorProxy } from '@shared/Util';
import { randomBytes } from 'crypto';
import { app, BrowserWindow, ipcMain, IpcMainEvent, session, shell } from 'electron';
import { AppPreferencesData } from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as WebSocket from 'ws';
import { Init } from './types';
import { getMainFolderPath } from './Util';

const TIMEOUT_DELAY = 60_000;

type State = {
  window?: BrowserWindow;
  entry: string;
  _secret: string;
  url: string;
  backHost: URL;
  socket: SocketClient<WebSocket>;
  mainFolderPath: string;
  config: AppConfigData;
  isQuitting: boolean;
  prefs: AppPreferencesData;
}

export async function startLogger(init: Init): Promise<void> {
  const state: State = {
    window: undefined,
    url: path.join(__dirname, '../window/images/icon.png'),
    entry: init.rest,
    backHost: init.args['connect-remote'] ? new URL('ws://'+init.args['connect-remote']) : new URL('ws://localhost'),
    socket: new SocketClient(WebSocket),
    _secret: '',
    mainFolderPath: createErrorProxy('mainFolderPath'),
    config: createErrorProxy('config'),
    prefs: createErrorProxy('prefs'),
    isQuitting: false
  };

  function onInit(event: IpcMainEvent) {
    const data: InitRendererData = {
      isBackRemote: true,
      installed: false,
      version: 0,
      host: state.backHost.href,
      secret: state._secret,
    };
    event.returnValue = data;
  }

  await startup();

  // -- Functions --

  async function startup() {
    app.once('ready', onAppReady);
    app.once('window-all-closed', onAppWindowAllClosed);
    app.once('web-contents-created', onAppWebContentsCreated);
    app.on('activate', onAppActivate);

    state.backHost.port = '12001';

    state.mainFolderPath = getMainFolderPath();
    state.config = ConfigFile.readOrCreateFileSync(path.join(state.mainFolderPath, CONFIG_FILENAME));
    state.prefs = PreferencesFile.readOrCreateFileSync(path.join(state.config.flashpointPath, PREFERENCES_FILENAME));

    // Get secret to connect to backend
    const secretFilePath = path.join(state.mainFolderPath, 'secret.dat');
    try {
      state._secret = await fs.readFile(secretFilePath, { encoding: 'utf8' });
    } catch (e) {
      state._secret = randomBytes(2048).toString('hex');
      try {
        await fs.writeFile(secretFilePath, state._secret, { encoding: 'utf8' });
      } catch (e) {
        console.warn(`Failed to save new secret to disk.\n${e}`);
      }
    }

    // Connect to back process
    await timeout<WebSocket>(new Promise((resolve, reject) => {
      console.log('secret: ' + state._secret);
      const sock = new WebSocket(state.backHost.href);
      sock.onclose = () => { reject(new Error('Failed to authenticate connection to back.')); };
      sock.onerror = (event: any) => { reject(event.error); };
      sock.onopen  = () => {
        sock.onmessage = () => {
          sock.onclose = noop;
          sock.onerror = noop;
          resolve(sock);
        };
        sock.send(state._secret);
      };
    }), TIMEOUT_DELAY)
    .then(ws => state.socket.setSocket(ws))
    .then(() => {
      // Add Socket event listener(s)
      state.socket.register(BackOut.QUIT, () => {
        state.isQuitting = true;
        app.quit();
      });
    })
    .then(() => app.whenReady())
    .then(() => {
      if (!state.window) {
        state.window = createBrowserWindow();
      }
    });

    // Add IPC event listener(s)
    ipcMain.on(InitRendererChannel, onInit);
  }

  function onAppReady(): void {
    if (!session.defaultSession) { throw new Error('Default session is missing!'); }

    // Reject all permission requests since we don't need any permissions.
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(false));

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({ ...details.responseHeaders });
    });
  }

  function onAppWindowAllClosed(): void {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  function onAppWebContentsCreated(event: Electron.Event, webContents: Electron.WebContents): void {
    // Open links to web pages in the OS-es default browser
    // (instead of navigating to it with the electron window that opened it)
    webContents.on('will-navigate', onNewPage);
    webContents.on('new-window', onNewPage);

    function onNewPage(event: Electron.Event, navigationUrl: string): void {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  }

  function onAppActivate(): void {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (!state.window) { state.window = createBrowserWindow(); }
  }

  function createBrowserWindow(): BrowserWindow {
    const window = new BrowserWindow({
      title: 'Flashpoint Logger',
      icon: path.join(__dirname, '../window/images/icon.png'),
      useContentSize: true,
      width: init.args.width,
      height: init.args.height,
      webPreferences: {
        preload: path.resolve(__dirname, './MainWindowPreload.js'),
        nodeIntegration: true,
        contextIsolation: false
      },
    });
    remoteMain.enable(window.webContents);
    window.setMenu(null); // Remove the menu bar
    window.loadFile(path.join(__dirname, '../window/logger.html'));

    // window.webContents.openDevTools();

    window.on('closed', () => {
      if (state.window === window) {
        state.window = undefined;
      }
    });

    return window;
  }

  /**
   * Resolves/Rejects when the wrapped promise does. Rejects if the timeout happens before that.
   * @param promise Promise to wrap.
   * @param ms Time to wait before timing out (in ms).
   */
  function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const handle = setTimeout(() => {
        reject(new Error(`Timeout (${(ms / 1000).toFixed(1)} seconds).`));
      }, ms);
      promise.then(arg => {
        clearTimeout(handle);
        resolve(arg);
      }).catch(error => {
        clearTimeout(handle);
        reject(error);
      });
    });
  }

  function noop() { /* Do nothing. */ }
}
