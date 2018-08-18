import * as child_process from 'child_process';
import * as path from 'path';
import { ILaunchBoxGame } from '../shared/launchbox/interfaces';
import * as Electron from 'electron';
import { IMainWindowExternal } from '../shared/interfaces';

/**
 * 
 */
window.External = {
  /** @inheritDoc */
  launchGame(game: ILaunchBoxGame) {
    //game.rootFolder;
    throw new Error('Replace the hard-coded root path in src/main/MainWindowPreload.ts');
    const root: string = '<Insert full path to ".../Flashpoint/Arcade" here>';
    const filename: string = path.resolve(root, game.applicationPath || '');
    const args: string[] = [game.commandLine || ''];
    console.log(filename, args)
    child_process.spawn(filename, args);
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
