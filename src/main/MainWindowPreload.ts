import * as electron from 'electron';
import { OpenDialogOptions } from 'electron';
import { AppConfigApi } from '../shared/config/AppConfigApi';
import { MiscIPC } from '../shared/interfaces';
import { LogRendererApi } from '../shared/Log/LogRendererApi';
import { AppPreferencesApi } from '../shared/preferences/AppPreferencesApi';
import { isDev } from './Util';

// Set up Preferences API
const preferences = new AppPreferencesApi();
preferences.initialize();

// Set up Config API
const config = new AppConfigApi();
config.initialize();

//
const log = new LogRendererApi();
log.bindListeners();

/**
 * Object with functions that bridge between this and the Main processes
 * (Note: This is mostly a left-over from when "node integration" was disabled.
 *        It might be a good idea to move this to the Renderer?)
 */
window.External = Object.freeze({
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

  preferences,

  config,

  log,

  isDev,
});
