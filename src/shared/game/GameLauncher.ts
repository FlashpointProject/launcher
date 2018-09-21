import * as path from 'path';
import { spawn } from 'child_process';
import { IGameInfo } from './interfaces';

export class GameLauncher {
  /**
   * Launch a game
   * @param game Game to launch
   */
  public static launchGame(game: IGameInfo): void {
    const config = window.External.config.data;
    //
    const gamePath: string = path.posix.join(config.flashpointPath, '/Arcade', GameLauncher.getApplicationPath(game));
    const gameArgs: string[] = [game.launchCommand || ''];
    // When using Linux, use the proxy created in BackgroundServices.ts
    // This is only needed on Linux because the proxy is installed on system
    // level entire system when using Windows.
    const env = process.platform === 'linux'
      ? { ...process.env, http_proxy: 'http://localhost:22500/' }
      : process.env;
    // Launch game
    console.log('Launch game:', gamePath, gameArgs);
    spawn(gamePath, gameArgs, { env });
  }

  private static getApplicationPath(game: IGameInfo): string {
    if (game.platform === 'Flash' && window.External.platform === 'linux') {
      // The value provided in Flash.xml is only accurate in windows.
      // We hardcode the value in linux.

      // Note that this assumes that `flash_player_sa_linux.x86_64.tar.gz`
      // has been extracted using:
      //   $ cd Arcade/Games
      //   $ tar xf flash_player_sa_linux.x86_64.tar.gz flashplayer

      // @TODO Figure out a way to let Linux users change this path
      //       and potential paths for other applications
      return 'Games/flashplayer';
    }
    return game.applicationPath;
  }
}
