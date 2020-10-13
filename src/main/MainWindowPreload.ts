import { SocketClient } from '@shared/back/SocketClient';
import { BackIn, BackOut } from '@shared/back/types';
import { InitRendererChannel, InitRendererData } from '@shared/IPC';
import { setTheme } from '@shared/Theme';
import { createErrorProxy } from '@shared/Util';
import * as electron from 'electron';
import { OpenDialogOptions } from 'electron';
import * as path from 'path';
import { isDev } from './Util';

/**
 * Object with functions that bridge between this and the Main processes
 * (Note: This is mostly a left-over from when "node integration" was disabled.
 *        It might be a good idea to move this to the Renderer?)
 */

window.Shared = {
  installed: createErrorProxy('installed'),

  version: createErrorProxy('version'),

  platform: electron.remote.process.platform+'' as NodeJS.Platform, // (Coerce to string to make sure its not a remote object)

  minimize() {
    const currentWindow = electron.remote.getCurrentWindow();
    currentWindow.minimize();
  },

  maximize() {
    const currentWindow = electron.remote.getCurrentWindow();
    if (currentWindow.isMaximized()) {
      currentWindow.unmaximize();
    } else {
      currentWindow.maximize();
    }
  },

  close() {
    const currentWindow = electron.remote.getCurrentWindow();
    currentWindow.close();
  },

  restart() {
    electron.remote.app.relaunch();
    electron.remote.app.quit();
  },

  showOpenDialogSync(options: OpenDialogOptions): string[] | undefined {
    // @HACK: Electron set the incorrect return type for "showOpenDialogSync".
    return electron.remote.dialog.showOpenDialogSync(options) as any;
  },

  toggleDevtools(): void {
    electron.remote.getCurrentWindow().webContents.toggleDevTools();
  },

  preferences: {
    data: createErrorProxy('preferences.data'),
    onUpdate: undefined,
  },

  config: createErrorProxy('config'),

  log: {
    entries: [],
    offset: 0,
  },

  services: createErrorProxy('services'),

  isDev,

  isBackRemote: createErrorProxy('isBackRemote'),

  back: new SocketClient(WebSocket),

  fileServerPort: -1,

  backUrl: createErrorProxy('backUrl'),

  customVersion: undefined,

  initialLang: createErrorProxy('initialLang'),
  initialLangList: createErrorProxy('initialLangList'),
  initialThemes: createErrorProxy('initialThemes'),
  initialPlaylists: createErrorProxy('initialPlaylists'),
  initialLibraries: createErrorProxy('initialLibraries'),
  initialServerNames: createErrorProxy('initialServerNames'),
  initialMad4fpEnabled: createErrorProxy('initialMad4fpEnabled'),
  initialPlatforms: createErrorProxy('initialPlatforms'),
  initialLocaleCode: createErrorProxy('initialLocaleCode'),
  initialTagCategories: createErrorProxy('initialTagCategories'),
  initialExtensions: createErrorProxy('initialExtensions'),
  initialDevScripts: createErrorProxy('initialDevScripts'),
  initialLogoSets: createErrorProxy('initialLogoSets'),
  initialCurations: createErrorProxy('initialCurations'),

  waitUntilInitialized() {
    if (!isInitDone) { return onInit; }
  }
};

let isInitDone = false;
const onInit = (async () => {
  // Fetch data from main process
  const data: InitRendererData = electron.ipcRenderer.sendSync(InitRendererChannel);
  // Store value(s)
  window.Shared.installed = data.installed;
  window.Shared.version = data.version;
  window.Shared.isBackRemote = data.isBackRemote;
  window.Shared.backUrl = new URL(data.host);
  // Connect to the back
  const socket = await SocketClient.connect(WebSocket, data.host, data.secret);
  window.Shared.back.url = data.host;
  window.Shared.back.secret = data.secret;
  window.Shared.back.setSocket(socket);
})()
.then(() => new Promise((resolve, reject) => {
  registerHandlers();

  // Fetch the config and preferences
  window.Shared.back.request(BackIn.GET_RENDERER_INIT_DATA)
  .then(data => {
    if (data) {
      window.Shared.preferences.data = data.preferences;
      window.Shared.config = {
        data: data.config,
        // @FIXTHIS This should take if this is installed into account
        fullFlashpointPath: path.resolve(data.config.flashpointPath),
        fullJsonFolderPath: path.resolve(data.config.flashpointPath, data.config.jsonFolderPath),
      };
      window.Shared.fileServerPort = data.fileServerPort;
      window.Shared.log.entries = data.log;
      window.Shared.services = data.services;
      window.Shared.customVersion = data.customVersion;
      window.Shared.initialLang = data.language;
      window.Shared.initialLangList = data.languages;
      window.Shared.initialThemes = data.themes;
      window.Shared.initialPlaylists = data.playlists;
      window.Shared.initialLibraries = data.libraries;
      window.Shared.initialServerNames = data.serverNames;
      window.Shared.initialMad4fpEnabled = data.mad4fpEnabled;
      window.Shared.initialPlatforms = data.platforms;
      window.Shared.initialLocaleCode = data.localeCode;
      window.Shared.initialTagCategories = data.tagCategories;
      window.Shared.initialExtensions = data.extensions;
      window.Shared.initialDevScripts = data.devScripts;
      window.Shared.initialLogoSets = data.logoSets;
      window.Shared.initialCurations = data.curations;
      if (window.Shared.preferences.data.currentTheme) {
        const theme = window.Shared.initialThemes.find(t => t.id === window.Shared.preferences.data.currentTheme);
        if (theme) { setTheme(theme); }
      }
      resolve();
    } else { reject(new Error('"Get Renderer Init Data" response does not contain any data.')); }
  });
}))
.then(() => { isInitDone = true; });

function registerHandlers(): void {
  window.Shared.back.register(BackOut.UPDATE_PREFERENCES_RESPONSE, (event, data) => {
    window.Shared.preferences.data = data;
  });

  window.Shared.back.register(BackOut.OPEN_MESSAGE_BOX, async (event, data) => {
    const result = await electron.remote.dialog.showMessageBox(data);
    return result.response;
  });

  window.Shared.back.register(BackOut.OPEN_SAVE_DIALOG, async (event, data) => {
    const result = await electron.remote.dialog.showSaveDialog(data);
    return result.filePath;
  });

  window.Shared.back.register(BackOut.OPEN_OPEN_DIALOG, async (event, data) => {
    const result = await electron.remote.dialog.showOpenDialog(data);
    return result.filePaths;
  });

  window.Shared.back.register(BackOut.OPEN_EXTERNAL, async (event, url, options) => {
    await electron.remote.shell.openExternal(url, options);
  });
}
