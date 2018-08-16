import * as child_process from 'child_process';
import * as path from 'path';
import { ILaunchBoxGame } from '../shared/launchbox/interfaces';

/**
 * Launch a LaunchBox Game (using its settings)
 * (WARNING: This will run an arbitrary program file with arbitrary arguments)
 * @param game 
 */
function launchGame(game: ILaunchBoxGame) {
  //game.rootFolder;
  throw new Error('Replace the hard-coded root path in src/main/MainWindowPreload.ts');
  const root: string = '<Insert full path to ".../Flashpoint/Arcade" here>';
  const filename: string = path.resolve(root, game.applicationPath || '');
  const args: string[] = [game.commandLine || ''];
  console.log(filename, args)
  child_process.spawn(filename, args);
}
(window as any).launchGame = launchGame;
