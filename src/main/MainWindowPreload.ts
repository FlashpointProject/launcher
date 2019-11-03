import * as electron from 'electron';
import { OpenDialogOptions } from 'electron';
import { SharedSocket } from '../shared/back/SharedSocket';
import { BackIn, BackOut, WrappedResponse } from '../shared/back/types';
import { AppConfigApi } from '../shared/config/AppConfigApi';
import { MiscIPC } from '../shared/interfaces';
import { InitRendererChannel, InitRendererData } from '../shared/IPC';
import { LogRendererApi } from '../shared/Log/LogRendererApi';
import { IAppPreferencesData } from '../shared/preferences/interfaces';
import { ServicesApi } from '../shared/service/ServicesApi';
import { isDev } from './Util';

// Set up Config API
const config = new AppConfigApi();
config.initialize();

// Set up Services API
const services = new ServicesApi();
services.initialize();

//
const log = new LogRendererApi();
log.bindListeners();

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

  config,

  services,

  log,

  isDev,

  backSocket: createErrorProxy('backSocket'),

  waitUntilInitialized() {
    if (!isInitDone) { return onInit; }
  }
};

let isInitDone: boolean = false;
const onInit = new Promise<WebSocket>((resolve, reject) => {
  // Fetch data from main process
  const data: InitRendererData = electron.ipcRenderer.sendSync(InitRendererChannel);

  // Connect to the back API
  const url = new URL('ws://localhost');
  url.port = data.port+'';

  const ws = new WebSocket(url.href);
  ws.onopen = (event) => {
    ws.onmessage = () => { resolve(ws); };
    ws.onclose   = () => { reject(new Error('Failed to authenticate to the back.')); };
    ws.send(data.secret);
  };
  window.External.backSocket = new SharedSocket(ws);
  // Register preferences update listener
  window.External.backSocket.on('response', onMessage);
})
.then(() => new Promise((resolve) => {
  // Fetch the preferences
  window.External.backSocket.send(BackIn.GET_PREFERENCES, undefined, (response) => {
    window.External.preferences.data = response.data;
    resolve();
  });
}))
.then(() => { isInitDone = true; });

function createErrorProxy(title: string): any {
  return new Proxy({}, {
    get: (target, p, receiver) => {
      throw new Error(`You must not get a value from ${title} before it is initialzed (property: "${p.toString()}").`);
    },
    set: (target, p, value, receiver) => {
      throw new Error(`You must not set a value from ${title} before it is initialzed (property: "${p.toString()}").`);
    },
  });
}

function onMessage(this: WebSocket, res: WrappedResponse): void {
  switch (res.responseType) {
    case BackOut.UPDATE_PREFERENCES_RESPONSE:
      window.External.preferences.data = res.data;
      break;
  }
}

type ParsedMessage = (
  [BackOut.UPDATE_PREFERENCES_RESPONSE, IAppPreferencesData]
);
