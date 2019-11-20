import * as electron from 'electron';
import { OpenDialogOptions } from 'electron';
import * as path from 'path';
import { SharedSocket } from '../shared/back/SharedSocket';
import { BackIn, BackOut, GetRendererInitDataResponse, WrappedResponse } from '../shared/back/types';
import { MiscIPC } from '../shared/interfaces';
import { InitRendererChannel, InitRendererData } from '../shared/IPC';
import { createErrorProxy } from '../shared/Util';
import { isDev } from './Util';

/**
 * Object with functions that bridge between this and the Main processes
 * (Note: This is mostly a left-over from when "node integration" was disabled.
 *        It might be a good idea to move this to the Renderer?)
 */
window.External = {
  misc: electron.ipcRenderer.sendSync(MiscIPC.REQUEST_MISC_SYNC),

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
    data: createErrorProxy('preferences'),
    onUpdate: undefined,
  },

  config: createErrorProxy('config'),

  log: {
    entries: [],
    offset: 0,
  },

  services: createErrorProxy('services'),

  isDev,

  back: createErrorProxy('backSocket'),

  imageServerPort: -1,

  waitUntilInitialized() {
    if (!isInitDone) { return onInit; }
  }
};

let isInitDone: boolean = false;
const onInit = new Promise<SharedSocket>((resolve, reject) => {
  // Fetch data from main process
  const data: InitRendererData = electron.ipcRenderer.sendSync(InitRendererChannel);

  // Connect to the back API
  const url = new URL('ws://localhost');
  url.port = data.port+'';

  const ws = new WebSocket(url.href);
  ws.onopen = () => {
    ws.onmessage = () => { resolve(new SharedSocket(ws)); };
    ws.onclose   = () => { reject(new Error('Failed to authenticate to the back.')); };
    ws.send(data.secret);
  };
})
.then((socket) => new Promise((resolve) => {
  window.External.back = socket;
  window.External.back.on('message', onMessage);
  // Fetch the config and preferences
  window.External.back.send<GetRendererInitDataResponse>(BackIn.GET_RENDERER_INIT_DATA, undefined, response => {
    if (response.data) {
      window.External.preferences.data = response.data.preferences;
      window.External.config = {
        data: response.data.config,
        // @FIXTHIS This should take if this is installed into account
        fullFlashpointPath: path.resolve(response.data.config.flashpointPath),
        fullJsonFolderPath: path.resolve(response.data.config.flashpointPath, response.data.config.jsonFolderPath),
      };
      window.External.imageServerPort = response.data.imageServerPort;
      window.External.log.entries = response.data.log;
      window.External.services = response.data.services;
    }
    resolve();
  });
}))
.then(() => { isInitDone = true; });

function onMessage(this: WebSocket, res: WrappedResponse): void {
  switch (res.type) {
    case BackOut.UPDATE_PREFERENCES_RESPONSE:
      window.External.preferences.data = res.data;
      break;
  }
}
