import { SharedSocket } from '@shared/back/SharedSocket';
import { BackIn, BackOut, GetRendererInitDataResponse, OpenDialogData, OpenDialogResponseData, OpenExternalData, OpenExternalResponseData, WrappedResponse } from '@shared/back/types';
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

  back: new SharedSocket(WebSocket),

  fileServerPort: -1,

  backUrl: createErrorProxy('backUrl'),

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

  waitUntilInitialized() {
    if (!isInitDone) { return onInit; }
  }
};

let isInitDone: boolean = false;
const onInit = (async () => {
  // Fetch data from main process
  const data: InitRendererData = electron.ipcRenderer.sendSync(InitRendererChannel);
  // Store value(s)
  window.Shared.installed = data.installed;
  window.Shared.version = data.version;
  window.Shared.isBackRemote = data.isBackRemote;
  window.Shared.backUrl = new URL(data.host);
  // Connect to the back
  const socket = await SharedSocket.connect(WebSocket, data.host, data.secret);
  window.Shared.back.url = data.host;
  window.Shared.back.secret = data.secret;
  window.Shared.back.setSocket(socket);
})()
.then(() => new Promise((resolve, reject) => {
  window.Shared.back.on('message', onMessage);
  // Fetch the config and preferences
  window.Shared.back.send<GetRendererInitDataResponse>(BackIn.GET_RENDERER_INIT_DATA, undefined, response => {
    if (response.data) {
      window.Shared.preferences.data = response.data.preferences;
      window.Shared.config = {
        data: response.data.config,
        // @FIXTHIS This should take if this is installed into account
        fullFlashpointPath: path.resolve(response.data.config.flashpointPath),
        fullJsonFolderPath: path.resolve(response.data.config.flashpointPath, response.data.config.jsonFolderPath),
      };
      window.Shared.fileServerPort = response.data.fileServerPort;
      window.Shared.log.entries = response.data.log;
      window.Shared.services = response.data.services;
      window.Shared.initialLang = response.data.language;
      window.Shared.initialLangList = response.data.languages;
      window.Shared.initialThemes = response.data.themes;
      window.Shared.initialPlaylists = response.data.playlists;
      window.Shared.initialLibraries = response.data.libraries;
      window.Shared.initialServerNames = response.data.serverNames;
      window.Shared.initialMad4fpEnabled = response.data.mad4fpEnabled;
      window.Shared.initialPlatforms = response.data.platforms;
      window.Shared.initialLocaleCode = response.data.localeCode;
      window.Shared.initialTagCategories = response.data.tagCategories;
      if (window.Shared.preferences.data.currentTheme) { setTheme(window.Shared.preferences.data.currentTheme); }
      resolve();
    } else { reject(new Error('"Get Renderer Init Data" response does not contain any data.')); }
  });
}))
.then(() => { isInitDone = true; });

function onMessage(this: WebSocket, res: WrappedResponse): void {
  switch (res.type) {
    case BackOut.UPDATE_PREFERENCES_RESPONSE: {
      window.Shared.preferences.data = res.data;
    } break;

    case BackOut.OPEN_DIALOG: {
      const resData: OpenDialogData = res.data;

      electron.remote.dialog.showMessageBox(resData)
      .then(r => {
        window.Shared.back.sendReq<any, OpenDialogResponseData>({
          id: res.id,
          type: BackIn.GENERIC_RESPONSE,
          data: r.response,
        });
      });
    } break;

    case BackOut.OPEN_EXTERNAL: {
      const resData: OpenExternalData = res.data;

      electron.remote.shell.openExternal(resData.url, resData.options)
      .then(() => {
        window.Shared.back.sendReq<OpenExternalResponseData>({
          id: res.id,
          type: BackIn.GENERIC_RESPONSE,
          data: {},
        });
      })
      .catch(error => {
        window.Shared.back.sendReq<OpenExternalResponseData>({
          id: res.id,
          type: BackIn.GENERIC_RESPONSE,
          data: { error },
        });
      });
    } break;
  }
}
