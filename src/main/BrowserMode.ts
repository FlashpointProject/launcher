import { ConfigFile } from '@back/ConfigFile';
import { CONFIG_FILENAME, PREFERENCES_FILENAME } from '@back/constants';
import * as remoteMain from '@electron/remote/main';
import { AppConfigData } from '@shared/config/interfaces';
import { AppPreferencesData } from '@shared/preferences/interfaces';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { createErrorProxy } from '@shared/Util';
import { app, BrowserWindow, session, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Init } from './types';
import { getMainFolderPath } from './Util';

type State = {
  window?: BrowserWindow;
  entry: string;
  url: string;
  mainFolderPath: string;
  config: AppConfigData;
  prefs: AppPreferencesData;
}

export async function startBrowserMode(init: Init): Promise<void> {
  const state: State = {
    window: undefined,
    url: init.args.browser_url || '',
    entry: init.rest,
    mainFolderPath: createErrorProxy('mainFolderPath'),
    config: createErrorProxy('config'),
    prefs: createErrorProxy('prefs'),
  };

  await startup();

  // -- Functions --

  async function startup() {
    app.once('ready', onAppReady);
    app.once('window-all-closed', onAppWindowAllClosed);
    app.once('web-contents-created', onAppWebContentsCreated);
    app.on('activate', onAppActivate);

    const installed = fs.existsSync('./.installed');
    state.mainFolderPath = getMainFolderPath(installed);
    state.config = ConfigFile.readOrCreateFileSync(path.join(state.mainFolderPath, CONFIG_FILENAME));
    state.prefs = PreferencesFile.readOrCreateFileSync(path.join(state.config.flashpointPath, PREFERENCES_FILENAME));

    let extension = '';
    switch (process.platform) {
      case 'win32':
        extension = '.dll';
        break;
      case 'linux':
        extension = '.so';
        break;
      case 'darwin':
        extension = '.plugin';
        break;
      default:
        console.error(`No plugin file extension is assigned to the current operating system (platform: "${process.platform}").`);
        break;
    }

    app.commandLine.appendSwitch('ppapi-flash-path', path.resolve(state.config.flashpointPath, 'Plugins', `flash${extension}`));
  }

  function onAppReady(): void {
    if (!session.defaultSession) { throw new Error('Default session is missing!'); }

    // Reject all permission requests since we don't need any permissions.
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(false));

    console.log(state.prefs.browserModeProxy);
    session.defaultSession.setProxy({
      pacScript: '',
      proxyRules: state.prefs.browserModeProxy, // @TODO Make the proxy not hard coded?
      proxyBypassRules: '',
    });

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({ ...details.responseHeaders });
    });

    createBrowserWindow();
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
    if (!state.window) { createBrowserWindow(); }
  }

  function createBrowserWindow(): BrowserWindow {
    const window = new BrowserWindow({
      title: 'Flashpoint Browser Mode',
      icon: path.join(__dirname, '../window/images/icon.png'),
      useContentSize: true,
      width: init.args.width,
      height: init.args.height,
      webPreferences: {
        nodeIntegration: false,
        plugins: true,
      },
    });
    remoteMain.enable(window.webContents);
    window.setMenu(null); // Remove the menu bar
    window.loadURL(state.url);

    // window.webContents.openDevTools();

    window.on('closed', () => {
      if (state.window === window) {
        state.window = undefined;
      }
    });

    return window;
  }
}
