import { SocketClient } from '@shared/back/SocketClient';
import { BackIn, BackOut } from '@shared/back/types';
import { CustomIPC, WindowIPC } from '@shared/interfaces';
import { InitRendererChannel, InitRendererData } from '@shared/IPC';
import { setTheme } from '@shared/Theme';
import { createErrorProxy } from '@shared/Util';
import * as electron from 'electron';
import { OpenDialogOptions } from 'electron';
import { ipcRenderer } from 'electron/renderer';
import { EventEmitter } from 'events';
import * as path from 'path';
import { isDev } from './Util';

/**
 * Object with functions that bridge between this and the Main processes
 * (Note: This is mostly a left-over from when "node integration" was disabled.
 *        It might be a good idea to move this to the Renderer?)
 */

// Fill unavailable web apis
navigator.clipboard.writeText = async (text: string) => {
  electron.clipboard.writeText(text);
};

// Register Electron API functions we might need later
window.electronAPI = {
  fileExists: (path: string) => {
    return ipcRenderer.invoke(CustomIPC.FILE_EXISTS, path);
  },
  openExternal: (url: string, opts?: Electron.OpenExternalOptions) => {
    ipcRenderer.send(CustomIPC.OPEN_EXTERNAL, url, opts);
  },
  showItemInFolder: (path: string) => {
    ipcRenderer.send(CustomIPC.SHOW_FILE_IN_FOLDER, path);
  },
  showOpenDialog: (opts: OpenDialogOptions) => {
    return ipcRenderer.invoke(CustomIPC.SELECT_FOLDER, opts) as Promise<string[] | undefined>;
  },
  restart: () => {
    ipcRenderer.send(CustomIPC.RELOAD_WINDOW);
  },
  protocolReady: () => {
    ipcRenderer.send(WindowIPC.PROTOCOL);
  },
  registerProtocol: async (enabled: boolean) => {
    const success = await ipcRenderer.invoke(CustomIPC.REGISTER_PROTOCOL, enabled);
    if (!success) {
      const regVerb = enabled ? 'add' : 'remove';
      alert('Failed to ' + regVerb + ' protocol registration');
    }
  },
  toggleDevTools: () => {
    ipcRenderer.send(CustomIPC.TOGGLE_DEVTOOLS);
  },
  minimize() {
    ipcRenderer.send(WindowIPC.WINDOW_MINIMIZE);
  },
  maximize() {
    ipcRenderer.send(WindowIPC.WINDOW_MAXIMIZE);
  },
  close() {
    ipcRenderer.send(WindowIPC.WINDOW_CLOSE);
  },
  ipcRenderer,
};

window.Shared = {
  version: createErrorProxy('version'),

  initialPreferences: createErrorProxy('initialPreferences'),

  config: createErrorProxy('config'),

  log: {
    entries: [],
    offset: 0,
  },

  isDev,

  isBackRemote: createErrorProxy('isBackRemote'),

  back: new SocketClient(WebSocket, () => {
    // Ask to send output to renderer if backend crashes
    ipcRenderer.send(WindowIPC.MAIN_OUTPUT);
  }),

  fileServerPort: -1,

  backUrl: createErrorProxy('backUrl'),

  customVersion: undefined,

  initialLogEntries: createErrorProxy('initialLogEntries'),
  initialLang: createErrorProxy('initialLang'),
  initialLangList: createErrorProxy('initialLangList'),
  initialThemes: createErrorProxy('initialThemes'),
  initialLocaleCode: createErrorProxy('initialLocaleCode'),

  dialogResEvent: new EventEmitter(),

  waitUntilInitialized() {
    if (!isInitDone) { return onInit; }
  }
};

let isInitDone = false;
const onInit = (async () => {
  // Fetch data from main process
  const data: InitRendererData = electron.ipcRenderer.sendSync(InitRendererChannel);
  // Store value(s)
  window.Shared.version = data.version;
  window.Shared.isBackRemote = data.isBackRemote;
  window.Shared.backUrl = new URL(data.host);
  window.Shared.url = data.url;
  // Connect to the back
  const socket = await SocketClient.connect(WebSocket, data.host, data.secret);
  window.Shared.back.url = data.host;
  window.Shared.back.secret = data.secret;
  window.Shared.back.setSocket(socket);
})()
.then(() => new Promise<void>((resolve, reject) => {
  registerHandlers();

  // Fetch the config and preferences
  window.Shared.back.request(BackIn.GET_RENDERER_INIT_DATA)
  .then(data => {
    if (data) {
      window.Shared.initialPreferences = data.preferences;
      window.Shared.config = {
        data: data.config,
        // @FIXTHIS This should take if this is installed into account
        fullFlashpointPath: path.resolve(data.config.flashpointPath),
        fullJsonFolderPath: path.resolve(data.config.flashpointPath, data.preferences.jsonFolderPath),
      };
      window.Shared.fileServerPort = data.fileServerPort;
      window.Shared.initialLogEntries = data.log;
      // window.Shared.initialServices = data.services;
      window.Shared.customVersion = data.customVersion;
      window.Shared.initialLang = data.language;
      window.Shared.initialLangList = data.languages;
      window.Shared.initialThemes = data.themes;
      // window.Shared.initialPlaylists = data.playlists;
      // window.Shared.initialLibraries = data.libraries;
      // window.Shared.initialServerNames = data.serverNames;
      // window.Shared.initialMad4fpEnabled = data.mad4fpEnabled;
      // window.Shared.initialPlatforms = data.platforms;
      window.Shared.initialLocaleCode = data.localeCode;
      // window.Shared.initialTagCategories = data.tagCategories;
      // window.Shared.initialExtensions = data.extensions;
      // window.Shared.initialDevScripts = data.devScripts;
      // window.Shared.initialContextButtons = data.contextButtons;
      // window.Shared.initialCurationTemplates = data.curationTemplates;
      // window.Shared.initialLogoSets = data.logoSets;
      // window.Shared.initialExtConfigs = data.extConfigs;
      // window.Shared.initialExtConfig = data.extConfig;
      // window.Shared.initialUpdateFeedMarkdown = data.updateFeedMarkdown;
      // window.Shared.initialCurations = data.curations;
      if (window.Shared.initialPreferences.currentTheme) {
        const theme = window.Shared.initialThemes.find(t => t.id === window.Shared.initialPreferences.currentTheme);
        if (theme) { setTheme(theme); }
      }
      resolve();
    } else { reject(new Error('"Get Renderer Init Data" response does not contain any data.')); }
  });
}))
.then(() => { isInitDone = true; });

function registerHandlers(): void {
  window.Shared.back.register(BackOut.OPEN_MESSAGE_BOX, async (event, data) => {
    const result = await ipcRenderer.invoke(CustomIPC.SHOW_MESSAGE_BOX, data);
    return result.response;
  });

  window.Shared.back.register(BackOut.OPEN_SAVE_DIALOG, async (event, data) => {
    const result = await ipcRenderer.invoke(CustomIPC.SHOW_SAVE_DIALOG, data);
    return result.filePath;
  });

  window.Shared.back.register(BackOut.OPEN_OPEN_DIALOG, async (event, data) => {
    const result = await ipcRenderer.invoke(CustomIPC.SHOW_OPEN_DIALOG, data);
    return result.filePaths;
  });

  window.Shared.back.register(BackOut.OPEN_EXTERNAL, async (event, url, options) => {
    window.electronAPI?.openExternal(url, options);
  });
}
