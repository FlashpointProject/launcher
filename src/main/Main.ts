import * as remoteMain from '@electron/remote/main';
import { InitRendererChannel, InitRendererData } from '@shared/IPC';
import { createErrorProxy } from '@shared/Util';
import { SocketClient } from '@shared/back/SocketClient';
import { BackIn, BackInitArgs, BackOut } from '@shared/back/types';
import { AppConfigData } from '@shared/config/interfaces';
import { APP_TITLE } from '@shared/constants';
import { CustomIPC, WindowIPC } from '@shared/interfaces';
import { ChildProcess, fork } from 'child_process';
import { randomBytes } from 'crypto';
import { BrowserWindow, IpcMainEvent, WebContents, app, dialog, ipcMain, session, shell } from 'electron';
import { REACT_DEVELOPER_TOOLS, installExtension } from 'electron-extension-installer';
import { AppPreferencesData } from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import * as path from 'path';
import { argv } from 'process';
import * as WebSocket from 'ws';
import * as Util from './Util';
import { Init } from './types';

const TIMEOUT_DELAY = 60_000;

const ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  // Devtools installer
  'clients2.googleusercontent.com',
  'clients2.google.com',
  // React Devtools
  'react-developer-tools',
  'cdn.discordapp.com',
];

type LaunchOptions = {
  backend: boolean;
  frontend: boolean;
}

type MainState = {
  window?: BrowserWindow;
  _installed?: boolean;
  backHost: URL;
  _secret: string;
  /** Version of the launcher (timestamp of when it was built). Negative value if not found or not yet loaded. */
  _version: number;
  preferences?: AppPreferencesData;
  config?: AppConfigData;
  socket: SocketClient<WebSocket>;
  backProc?: ChildProcess;
  _sentLocaleCode: boolean;
  /** If the main is about to quit. */
  isQuitting: boolean;
  /** Path of the folder containing the config and preferences files. */
  mainFolderPath: string;
  /** Stdout output */
  output: string;
}

export function main(init: Init): void {
  const state: MainState = {
    window: undefined,
    _installed: undefined,
    backHost: init.args['connect-remote'] ? new URL('ws://'+init.args['connect-remote']) : new URL('ws://localhost'),
    _secret: '',
    /** Version of the launcher (timestamp of when it was built). Negative value if not found or not yet loaded. */
    _version: -2,
    preferences: undefined,
    config: undefined,
    socket: new SocketClient(WebSocket),
    backProc: undefined,
    _sentLocaleCode: false,
    isQuitting: false,
    mainFolderPath: createErrorProxy('mainFolderPath'),
    output: '',
  };

  startup({
    backend: !init.args['host-remote'],
    frontend: !init.args['back-only'],
  })
  .catch((error) => {
    console.error(error);
    if (!Util.isDev) {
      dialog.showMessageBoxSync({
        title: 'Failed to start launcher!',
        type: 'error',
        message: 'Something went wrong while starting the launcher.\n\n' + error,
      });
    }
    state.socket.disconnect();
    app.quit();
  });

  // -- Functions --

  async function startup(opts: LaunchOptions) {
    app.disableHardwareAcceleration();

    // Single process
    // No more than one "main" instance should exist at any time. Multiple "flash" instances are fine.
    if (!app.requestSingleInstanceLock()) {
      app.exit();
      return;
    }

    // Add app event listener(s)
    app.once('ready', onAppReady);
    app.once('window-all-closed', onAppWindowAllClosed);
    app.once('will-quit', onAppWillQuit);
    app.once('web-contents-created', onAppWebContentsCreated);
    app.on('activate', onAppActivate);
    app.on('second-instance', onAppSecondInstance);
    app.on('open-url', onAppOpenUrl);

    // Add IPC event listener(s)
    ipcMain.on(InitRendererChannel, onInit);
    ipcMain.handle(CustomIPC.SHOW_MESSAGE_BOX, async (event, opts) => {
      return dialog.showMessageBox(opts);
    });
    ipcMain.handle(CustomIPC.SHOW_OPEN_DIALOG, async (event, opts) => {
      return dialog.showOpenDialog(opts);
    });
    ipcMain.handle(CustomIPC.SHOW_SAVE_DIALOG, async (event, opts) => {
      return dialog.showSaveDialog(opts);
    });
    ipcMain.handle(CustomIPC.REGISTER_PROTOCOL, async (event, register) => {
      return setProtocolRegistrationState(register);
    });
    ipcMain.handle(CustomIPC.RELOAD_WINDOW, async (event) => {
      // Tell back to ignore exit call for 1000ms
      state.socket.request(BackIn.PREP_RELOAD_WINDOW)
      .then(() => {
        if (state.window) {
          state.window.once('closed', () => {
            state.window = createMainWindow();
          });
          state.window.close();
        }
      });
    });

    // Add Socket event listener(s)
    state.socket.register(BackOut.QUIT, () => {
      state.isQuitting = true;
      state.socket.allowDeath();
      app.quit();
    });

    app.commandLine.appendSwitch('ignore-connections-limit', 'localhost');

    state.mainFolderPath = Util.getMainFolderPath();

    // ---- Initialize ----
    // Load custom version text file
    await fs.promises.readFile(path.join(state.mainFolderPath, '.version'))
    .then((data) => {
      state._version = (data)
        ? parseInt(data.toString().replace(/[^\d]/g, ''), 10) // (Remove all non-numerical characters, then parse it as a string)
        : -1; // (Version not found error code)
    })
    .catch(() => { /** No file, ignore */ });

    // Load or generate secret
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

    // Start backend
    if (opts.backend) {
      await new Promise<void>((resolve, reject) => {
        // Fork backend, init.rest will contain possible flashpoint:// message
        // Increase memory limit in dev instance (mostly for developer page functions)
        const env = Util.isDev ? Object.assign({ 'NODE_OPTIONS' : '--max-old-space-size=6144' }, process.env ) : process.env;
        state.backProc = fork(path.join(__dirname, '../back/index.js'), [init.rest], { detached: true, env, stdio: 'pipe' });
        state.backProc.on('exit', (code) => {
          if (!code || code === 0) {
            console.log('Back proc exited cleanly, killing self.');
            process.exit(process.pid);
          } else {
            console.log(`Back proc exited unclean (${code}), killing self after 60 seconds to allow time to view message.`);
            setTimeout(() => {
              process.exit(process.pid);

            }, 60000);
          }
        });
        if (state.backProc.stdout) {
          state.backProc.stdout.on('data', (chunk) => {
            process.stdout.write(chunk);
            state.output += chunk.toString();
          });
        }
        if (state.backProc.stderr) {
          state.backProc.stderr.on('data', (chunk) => {
            process.stderr.write(chunk);
            state.output += chunk.toString();
          });
        }
        const initHandler = (message: any) => {
          // Stop listening after a port, quit or other message arrives, keep going for preferences checks
          if (state.backProc && !message.preferencesRefresh) {
            state.backProc.removeListener('message', initHandler);
          }
          if (message.port) {
            state.backHost.port = message.port as string;
            state.config = message.config as AppConfigData;
            state.preferences = message.prefs as AppPreferencesData;
            resolve();
          } else if (message.quit) {
            if (message.errorMessage) {
              dialog.showErrorBox('Flashpoint Startup Error', message.errorMessage);
            }
            app.quit();
          } else if (message.preferencesRefresh) {
            dialog.showMessageBox({
              title: 'Preferences File Invalid',
              message: 'Preferences file failed to load. Use defaults?',
              buttons: ['Use Default Preferences', 'Cancel'],
              cancelId: 1
            }).then((res) => {
              if (state.backProc) {
                state.backProc.send(res.response);
              }
            });
          } else {
            reject(new Error('Failed to start server in back process. Perhaps because it could not find an available port.'));
          }
        };
        // Wait for process to prep, handle any queries, store config and prefs after finishing
        state.backProc.on('message', initHandler);
        // On windows you have to wait for app to be ready before you call app.getLocale() (so it will be sent later)
        let localeCode: string;
        if (process.platform === 'win32' && !app.isReady()) {
          localeCode = 'en';
        } else {
          localeCode = app.getLocale().toLowerCase();
          state._sentLocaleCode = true;
        }
        // Send prep message
        const msg: BackInitArgs = {
          configFolder: state.mainFolderPath,
          secret: state._secret,
          isDev: Util.isDev,
          verbose: !!init.args['verbose'],
          // On windows you have to wait for app to be ready before you call app.getLocale() (so it will be sent later)
          localeCode: localeCode,
          exePath: app.getPath('exe'),
          acceptRemote: !!init.args['host-remote'],
          version: app.getVersion(), // @TODO Manually load this from the package.json file while in a dev environment (so it doesn't use Electron's version)
        };
        state.backProc.send(JSON.stringify(msg));
      })
      .then(() => {
        if (!state.preferences) { throw new Error('Preferences not loaded by backend.'); }
        // Update flashpoint:// protocol registration state
        setProtocolRegistrationState(state.preferences.registerProtocol);
      });
    }

    // Open websocket to backend, for communication between front and back
    const ws = await timeout<WebSocket>(new Promise((resolve, reject) => {
      const sock = new WebSocket(state.backHost.href);
      sock.onclose = () => { reject(new Error('Failed to authenticate connection to back.')); };
      sock.onerror = (event) => { reject(event.error); };
      sock.onopen  = () => {
        sock.onmessage = () => {
          sock.onclose = noop;
          sock.onerror = noop;
          resolve(sock);
        };
        sock.send(state._secret);
      };
    }), TIMEOUT_DELAY);
    state.socket.setSocket(ws);
    state.socket.killOnDisconnect = true;

    // Start frontend
    if (opts.frontend) {
      await app.whenReady();
      // Create main window
      if (!state.window) {
        state.window = createMainWindow();
      }
    } else {
      // Frontend not running, give Backend init message from Main
      state.socket.send(BackIn.INIT_LISTEN);
    }
  }

  async function onAppReady() {
    // Enable DoH
    // app.configureHostResolver({
    //   secureDnsMode: 'secure',
    //   secureDnsServers: ['https://cloudflare-dns.com/dns-query', 'https://dns.google/dns-query']
    // });

    if (Util.isDev) {
      installExtension(REACT_DEVELOPER_TOOLS, {
        loadExtensionOptions: {
          allowFileAccess: true
        }
      })
      .then((ext) => console.log(`Installed Extension - ${ext}`))
      .catch((ext) => console.log(`Failed to install Extension - ${ext}`));
    }

    // Send locale code (if it has no been sent already)
    if (process.platform === 'win32' && !state._sentLocaleCode && state.socket.client.socket) {
      state.socket.send(BackIn.SET_LOCALE, app.getLocale().toLowerCase());
      state._sentLocaleCode = true;
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
    // Stop non-local resources from being fetched
    // CSP HTTP Header example at https://www.electronjs.org/docs/tutorial/security#csp-http-header
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      let url: URL | undefined;
      try { url = new URL(details.url); }
      catch (e) { /* Do nothing. */ }

      // Only accept connections to:
      // * Local files ("file:///")
      // * The back server(s)
      // * DevTools (I have no idea if this is safe or not, but DevTools won't work without it)
      const remoteHostname = state.backHost.hostname;
      const allowedHosts = [ ...ALLOWED_HOSTS ];
      if (state.preferences && state.preferences.onlineManual) {
        const hostname = new URL(state.preferences.onlineManual).hostname;
        allowedHosts.push(hostname);
      }
      if (state.preferences && state.preferences.fpfssBaseUrl) {
        const hostname = new URL(state.preferences.fpfssBaseUrl).hostname;
        allowedHosts.push(hostname);
      }
      const allow = (
        url && (
          (url.protocol === 'file:') ||
          (url.protocol === 'devtools:') ||
          (
            url.hostname === remoteHostname ||
            (allowedHosts.includes(url.hostname) && allowedHosts.includes(remoteHostname))
          )
        )
      );
      if (!allow && !Util.isDev) {
        console.log(`Request Denied to ${url?.hostname || remoteHostname}`);
      }

      callback({
        ...details,
        cancel: Util.isDev ? false : !allow,
      });
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
    if (!init.args['connect-remote'] && !state.isQuitting && state.socket.client.socket) { // (Local back)
      state.socket.send(BackIn.QUIT);
      event.preventDefault();
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
    if (!state.window) {
      state.window = createMainWindow();
    }
  }

  function onAppSecondInstance(event: Electron.Event, argv: string[]): void {
    if (state.window) {
      if (process.platform !== 'darwin') {
        // Find the arg that is our custom protocol url and store it
        const url = argv.find((arg) => arg.startsWith('flashpoint://'));
        if (state.window.webContents) {
          state.window.webContents.send(WindowIPC.PROTOCOL, url);
        }
      }
      // Focus the window
      // (this is a hacky work around because focusing is kinda broken in win10, see https://github.com/electron/electron/issues/2867 )
      state.window.setAlwaysOnTop(true);
      state.window.show();
      state.window.setAlwaysOnTop(false);
      app.focus();
    }
  }

  function onAppOpenUrl(event: Electron.Event, url: string) {
    event.preventDefault();
    dialog.showErrorBox('Welcome Back', `Mac - You arrived from: ${url}`);
  }

  function onInit(event: IpcMainEvent) {
    // Find the arg that is our custom protocol url and store it
    const url = argv.find((arg) => arg.startsWith('flashpoint://'));
    const data: InitRendererData = {
      isBackRemote: !!init.args['connect-remote'],
      installed: !!state._installed,
      version: state._version,
      host: state.backHost.href,
      secret: state._secret,
      url
    };
    event.returnValue = data;
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
        contextIsolation: false
      },
    });
    remoteMain.enable(window.webContents);
    // Enable crash reporter
    ipcMain.on(WindowIPC.MAIN_OUTPUT, () => {
      window.webContents.send(WindowIPC.MAIN_OUTPUT, state.output);
    });
    // Add protocol report func
    ipcMain.on(WindowIPC.PROTOCOL, () => {
      if (init.protocol) {
        window.webContents.send(WindowIPC.PROTOCOL, init.protocol);
      }
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
    // Dereference window when closed
    window.on('closed', () => {
      if (state.window === window) {
        state.window = undefined;
      }
    });
    return window;
  }

  /**
   * Resolves/Rejects when the wrapped promise does. Rejects if the timeout happens before that.
   *
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

  function setProtocolRegistrationState(registered: boolean) : boolean {
    // Check how the Launcher was started
    const procDefault = process.defaultApp;
    const procArgCount = process.argv.length;

    if (procDefault && procArgCount < 2) {
      return true; // Don't need to change
    }

    /*
     * The return value of app.removeAsDefaultProtocolClient() is really inconsistent
     * between platforms, so we wrap it to consistently match:
     *
     * true - The app was set as the default handler for 'protocol' and was successfully
     *        removed, or was not the default handler in the first place.
     * false - The app was set as the default handler for 'protocol' and there was an
     *         issue removing it.
     */
    function normalizedRemove(protocol: string, path: string, args: string[]) : boolean {
      const needsRemove = app.isDefaultProtocolClient(protocol, path, args);
      if (!needsRemove || process.platform === 'linux') {
        /*
         * Electron has not implemented app.removeAsDefaultProtocolClient() on Linux so
         * it always fails; however, for our purposes we return true as we've done all
         * we can and nothing unexpected has occurred.
         *
         * https://github.com/electron/electron/blob/a867503af63bcf24f935ae32fc8d88fe5e7a786a/shell/browser/browser_linux.cc#L118
         */
        return true;
      }

      return app.removeAsDefaultProtocolClient(protocol, path, args);
    }

    // Add/remove protocol registration
    type ProtocolFunction = (protocol: string, path: string, args: string[]) => boolean;

    const func: ProtocolFunction = registered ? app.setAsDefaultProtocolClient : normalizedRemove;
    const verb = registered ? 'set' : 'unset';
    const scheme = 'flashpoint';
    const pPath = process.execPath;
    const pArgs = procDefault ? [path.resolve(process.argv[1])] : [];

    const res = func(scheme, pPath, pArgs);
    if (res) {
      console.log('Successfully ' + verb + ' app as protocol handler.');
    } else {
      console.warn('Could not ' + verb + ' app as protocol handler.');
    }

    return res;
  }

  function noop() { /* Do nothing. */ }
}

/**
 * Type of the event emitted by BrowserWindow for the "maximize" and "unmaximize" events.
 * This type is not defined by Electron, so I guess I have to do it here instead.
 */
type BrowserWindowEvent = {
  preventDefault: () => void;
  sender: WebContents;
}
