import * as path from 'path';
import { spawn } from 'child_process';
import { IGameInfo, IAdditionalApplicationInfo } from './interfaces';

export class GameLauncher {
  public static launchAdditionalApplication(addApp: IAdditionalApplicationInfo): void {
    const appPath: string = path.posix.join(window.External.config.fullFlashpointPath,
                                            addApp.applicationPath);
    const appArgs: string[] = [addApp.commandLine || ''];
    const env = GameLauncher.getEnvironment();
    console.log('Launch AddApp:', appPath, appArgs);
    spawn(appPath, appArgs, { env, detached: true, shell: true });
  }

  /**
   * Launch a game
   * @param game Game to launch
   */
  public static launchGame(game: IGameInfo, addApps?: IAdditionalApplicationInfo[]): void {
    // Run all provided additional applications with "AutoRunBefore" enabled
    addApps && addApps.forEach((addApp) => {
      if (addApp.autoRunBefore) {
        GameLauncher.launchAdditionalApplication(addApp);
      }
    });
    // Launch game
    const gamePath: string = path.posix.join(window.External.config.fullFlashpointPath,
                                             GameLauncher.getApplicationPath(game));
    const gameArgs: string[] = [game.launchCommand || ''];
    const env = GameLauncher.getEnvironment();
    console.log('Launch game:', gamePath, gameArgs);
    spawn(gamePath, gameArgs, { env, detached: true, shell: true });
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

  private static getEnvironment(): NodeJS.ProcessEnv {
    // When using Linux, use the proxy created in BackgroundServices.ts
    // This is only needed on Linux because the proxy is installed on system
    // level entire system when using Windows.
    return process.platform === 'linux'
      ? { ...process.env, http_proxy: 'http://localhost:22500/' }
      : process.env;
  }
}
