import * as Electron from 'electron';
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
    if (callback) {
      return Electron.remote.dialog.showOpenDialog(options, 
        (filePaths: string[], bookmarks: string[]) => {
          callback(filePaths && filePaths.slice(), 
                   bookmarks && bookmarks.slice());
        }
      );
    } else {
      return Electron.remote.dialog.showOpenDialog(options).slice();
    }
  },
});
