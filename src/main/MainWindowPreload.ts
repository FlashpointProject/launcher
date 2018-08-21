import { ILaunchBoxGame } from '../shared/launchbox/interfaces';
import * as Electron from 'electron';
import { IAppConfigData } from '../shared/config/IAppConfigData';

/**
 * Object with functions that bridge between this and the Main processes
 */
window.External = Object.freeze({
  /** @inheritDoc */
  launchGameSync(game: ILaunchBoxGame) {
    // Send a "Launch Game" event to the main process
    Electron.ipcRenderer.sendSync('launch-game-sync', game.applicationPath || '', [game.commandLine || '']);
  },

  /** @inheritDoc */
  getConfig(callback: (config: IAppConfigData) => void) {
    throw new Error('Does not work yet!! :p');
    // Send a "Get Config" event to the main process
    Electron.ipcRenderer.send('get-config', (config: IAppConfigData) => {
      callback(config);
    });
  },

  /** @inheritDoc */
  getConfigSync(): IAppConfigData {
    // Send a "Get Config Sync" event to the main process
    return Electron.ipcRenderer.sendSync('get-config-sync');
  },

  /** @inheritDoc */
  getPlatform(): NodeJS.Platform {
    return Electron.remote.process.platform as NodeJS.Platform;
  },

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
});
