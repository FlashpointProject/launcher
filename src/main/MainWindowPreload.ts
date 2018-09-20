import * as electron from 'electron';
import { IAppConfigData } from '../shared/config/IAppConfigData';
import { IGameInfo } from '../shared/game/interfaces';
import { ElectronOpenDialogCallback } from '../shared/interfaces';
import { AppPreferencesApi } from '../shared/preferences/AppPreferencesApi';

// Set up Preferences API
const preferences = new AppPreferencesApi();
preferences.initialize();

/**
 * Object with functions that bridge between this and the Main processes
 * (Note: This is mostly a left-over from when "node intergration" was disabled.
 *        It might be a good idea to move this to the Renderer?)
 */
window.External = Object.freeze({
  /** @inheritDoc */
    launchGameSync(game: IGameInfo) {
    // Get the path of the application (that runs the game)
    let applicationPath: string = game.applicationPath;
    if (game.platform === 'Flash' && window.External.platform === 'linux') {
      // The value provided in Flash.xml is only accurate in windows.
      // We hardcode the value in linux.

      // Note that this assumes that `flash_player_sa_linux.x86_64.tar.gz`
      // has been extracted using:
      //   $ cd Arcade/Games
      //   $ tar xf flash_player_sa_linux.x86_64.tar.gz flashplayer

      // @TODO Figure out a way to let Linux users change this path
      //       and potential paths for other applications
      applicationPath = 'Games/flashplayer';
    }
    // Send a "Launch Game" event to the main process
    electron.ipcRenderer.sendSync('launch-game-sync', applicationPath, [game.launchCommand || '']);
  },

  /** @inheritDoc */
  getConfigSync(): IAppConfigData {
    // Send a "Get Config Sync" event to the main process
    return electron.ipcRenderer.sendSync('get-config-sync');
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
  preferences: preferences,
});
