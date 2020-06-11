import { ConfigFile } from '@back/ConfigFile';
import { IAppConfigData } from '@shared/config/interfaces';
import { FlashInitChannel, FlashInitData } from '@shared/IPC';
import { createErrorProxy } from '@shared/Util';
import { app, BrowserWindow, ipcMain, IpcMainEvent, session, shell } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Init } from './types';
import { getMainFolderPath } from './Util';

type State = {
  window?: BrowserWindow;
  plugin: string;
  entry: string;
  mainFolderPath: string;
  config: IAppConfigData;
}

export function flash(init: Init): void {
  const state: State = {
    window: undefined,
    plugin: init.args.plugin || 'flash',
    entry: init.rest,
    mainFolderPath: createErrorProxy('mainFolderPath'),
    config: createErrorProxy('config'),
  };

  startup();

  // -- Functions --

  function startup() {
    app.once('ready', onAppReady);
    app.once('window-all-closed', onAppWindowAllClosed);
    app.once('web-contents-created', onAppWebContentsCreated);
    app.on('activate', onAppActivate);

    ipcMain.on(FlashInitChannel, onInit);

    const installed = fs.existsSync('./.installed');
    state.mainFolderPath = getMainFolderPath(installed);
    state.config = ConfigFile.readOrCreateFileSync(path.join(state.mainFolderPath, 'config.json'));

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
    app.commandLine.appendSwitch('ppapi-flash-path', path.resolve(state.config.flashpointPath, 'Plugins', state.plugin + extension));
  }

  function onAppReady(): void {
    if (!session.defaultSession) { throw new Error('Default session is missing!'); }

    // Reject all permission requests since we don't need any permissions.
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(false));

    session.defaultSession.setProxy({
      pacScript: '',
      proxyRules: '127.0.0.1:22500', // @TODO Make the proxy not hard coded?
      proxyBypassRules: '',
    });

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({ ...details.responseHeaders });
    });

    createFlashWindow();
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
    if (!state.window) { createFlashWindow(); }
  }

  function onInit(event: IpcMainEvent): void {
    const data: FlashInitData = {
      entry: state.entry,
    };
    event.returnValue = data;
  }

  function createFlashWindow(): BrowserWindow {
    const window = new BrowserWindow({
      title: `Flashpoint Flash Player (${state.plugin})`,
      icon: path.join(__dirname, '../window/images/icon.png'),
      useContentSize: true,
      width: init.args.width,
      height: init.args.height,
      webPreferences: {
        preload: path.resolve(__dirname, './FlashWindowPreload.js'),
        nodeIntegration: false,
        plugins: true,
      },
    });
    window.setMenu(null); // Remove the menu bar
    window.loadFile(path.join(__dirname, '../window/flash_index.html'));

    // window.webContents.openDevTools();

    return window;
  }
}
