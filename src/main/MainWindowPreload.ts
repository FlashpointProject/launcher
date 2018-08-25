import * as Electron from 'electron';
import * as fs from 'fs';
import { IAppConfigData } from '../shared/config/IAppConfigData';
import { IGameInfo } from '../shared/game/interfaces';
import { ElectronOpenDialogCallback } from '../shared/interfaces';

/**
 * Object with functions that bridge between this and the Main processes
 */
window.External = Object.freeze({
  /** @inheritDoc */
  launchGameSync(game: IGameInfo) {
    // Send a "Launch Game" event to the main process
    Electron.ipcRenderer.sendSync('launch-game-sync', game.applicationPath || '', [game.launchCommand || '']);
  },

  /** @inheritDoc */
  getConfigSync(): IAppConfigData {
    // Send a "Get Config Sync" event to the main process
    return Electron.ipcRenderer.sendSync('get-config-sync');
  },

  /** @inheritDoc */
  platform: Electron.remote.process.platform+'' as NodeJS.Platform, // (Coerce to string to make sure its not a remote object)

  /** @inheritDoc */
  minimize() {
    const currentWindow = Electron.remote.getCurrentWindow();
    currentWindow.minimize();
  },

  /** @inheritDoc */
  maximize() {
    const currentWindow = Electron.remote.getCurrentWindow();
    if(currentWindow.isMaximized()) {
      currentWindow.unmaximize();
    } else {
      currentWindow.maximize();
    }
  },

  /** @inheritDoc */
  close() {
    const currentWindow = Electron.remote.getCurrentWindow();
    currentWindow.close();
  },

  /** @inheritDoc */
  showOpenDialog(options: Electron.OpenDialogOptions, callback?: ElectronOpenDialogCallback): string[]|undefined {
    // (Slicing a "remote object" array will make a local copy of it - i think)
    if (callback) {
      // (Returns undefined if a callback is passed)
      Electron.remote.dialog.showOpenDialog(options, 
        (filePaths: string[], bookmarks: string[]) => {
          callback(filePaths && filePaths.slice(), 
                   bookmarks && bookmarks.slice());
        }
      );
    } else {
      // (Returns either undefined or string[] if no callback is passed)
      const val = Electron.remote.dialog.showOpenDialog(options);
      return val && val.slice();
    }
  },

  /** @inheritDoc */
  existsSync(path: string): boolean {
    return fs.existsSync(path);
  }
});
