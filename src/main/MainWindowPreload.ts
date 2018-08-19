import * as path from 'path';
import { ILaunchBoxGame } from '../shared/launchbox/interfaces';
import * as Electron from 'electron';
import { IMainWindowExternal } from '../shared/interfaces';
import { IAppConfigData } from '../shared/config/IAppConfigData';
import { func } from 'prop-types';

Electron.ipcRenderer.on('get-config-response', function(event: Electron.IpcMessageEvent, arg: IAppConfigData) {
  console.log('renderer on get-config-response', arguments);
});

/**
 * Object with functions that bridge between this and the Main processes
 */
window.External = {
  /** @inheritDoc */
  launchGameSync(game: ILaunchBoxGame) {
    // Send a "Laucnh Game" event to the main process
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
    // Send a "Laucnh Game" event to the main process
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
}
