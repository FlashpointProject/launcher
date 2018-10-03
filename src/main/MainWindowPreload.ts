import * as electron from 'electron';
import { ElectronOpenDialogCallback } from '../shared/interfaces';
import { AppPreferencesApi } from '../shared/preferences/AppPreferencesApi';
import { AppConfigApi } from '../shared/config/AppConfigApi';

// Set up Preferences API
const preferences = new AppPreferencesApi();
preferences.initialize();

// Set up Config API
const config = new AppConfigApi();
config.initialize();

/**
 * Object with functions that bridge between this and the Main processes
 * (Note: This is mostly a left-over from when "node integration" was disabled.
 *        It might be a good idea to move this to the Renderer?)
 */
window.External = Object.freeze({
  /** @inheritdoc */
  appendLogData(data: string): void {
    electron.ipcRenderer.send('append-log-data', data);
  },

  /** @inheritdoc */
  resendLogDataUpdate() {
    electron.ipcRenderer.send('resend-log-data-update');
  },

  /** @inheritDoc */
  platform: electron.remote.process.platform+'' as NodeJS.Platform, // (Coerce to string to make sure its not a remote object)

  /** @inheritDoc */
  minimize() {
    const currentWindow = electron.remote.getCurrentWindow();
    currentWindow.minimize();
  },

  /** @inheritDoc */
  maximize() {
    const currentWindow = electron.remote.getCurrentWindow();
    if (currentWindow.isMaximized()) {
      currentWindow.unmaximize();
    } else {
      currentWindow.maximize();
    }
  },

  /** @inheritDoc */
  close() {
    const currentWindow = electron.remote.getCurrentWindow();
    currentWindow.close();
  },

  /** @inheritDoc */
  restart() {
    electron.remote.app.relaunch();
    electron.remote.app.quit();
  },

  /** @inheritDoc */
  showOpenDialog(options: electron.OpenDialogOptions, callback?: ElectronOpenDialogCallback): string[]|undefined {
    // (Slicing a "remote object" array will make a local copy of it - i think)
    if (callback) {
      // (Returns undefined if a callback is passed)
      electron.remote.dialog.showOpenDialog(options,
        (filePaths: string[], bookmarks: string[]) => {
          callback(filePaths && filePaths.slice(),
                   bookmarks && bookmarks.slice());
        }
      );
    } else {
      // (Returns either undefined or string[] if no callback is passed)
      const val = electron.remote.dialog.showOpenDialog(options);
      return val && val.slice();
    }
  },
  
  /** @inheritDoc */
  toggleDevtools(): void {
    electron.remote.getCurrentWindow().webContents.toggleDevTools();
  },

  /** @inheritDoc */
  preferences: preferences,

  /** @inheritDoc */
  config: config,
});
