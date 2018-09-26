import * as path from 'path';
import { exec, ExecOptions } from 'child_process';
import { IGameInfo, IAdditionalApplicationInfo } from './interfaces';

export class GameLauncher {
  public static launchAdditionalApplication(addApp: IAdditionalApplicationInfo): void {
    const appPath: string = relativeToFlashpoint(addApp.applicationPath);
    const appArgs: string = addApp.commandLine;
    console.log('Launch AddApp:', appPath, appArgs);
    GameLauncher.launch(appPath, appArgs, { env: GameLauncher.getEnvironment() });
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
    const gamePath: string = relativeToFlashpoint(GameLauncher.getApplicationPath(game));
    const gameArgs: string = game.launchCommand;
    console.log('Launch game:', gamePath, gameArgs);
    GameLauncher.launch(gamePath, gameArgs, { env: GameLauncher.getEnvironment() });
  }

  private static getApplicationPath(game: IGameInfo): string {
    if (window.External.platform === 'linux')  {
      // The value provided in Flash.xml is only accurate in windows.
      // We hardcode the value in linux.

      // Note that this assumes that `flash_player_sa_linux.x86_64.tar.gz`
      // has been extracted using:
      //   $ cd Arcade/Games
      //   $ tar xf flash_player_sa_linux.x86_64.tar.gz flashplayer

      // @TODO Figure out a way to let Linux users change this path
      //       and potential paths for other applications
      if (game.platform === 'Flash') {
        return 'Games/flashplayer';
      }
      if (game.platform === 'Java') {
        return 'Games/startJava.sh';
      }
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

  private static launch(filename: string, args: string, opts: ExecOptions): void {
    const proc = exec(`"${escapeShell(filename)}" ${escapeShell(args)}`, opts);
    // Log for debugging purposes
    // (might be a bad idea to fill the console with junk?)
    logStuffs(proc, ['close', 'disconnect', 'error', 'exit', 'message']);
    proc.stdout.on('data', (data) => { console.log('stdout', data.toString('utf8')); });
    proc.stderr.on('data', (data) => { console.log('stderr', data.toString('utf8')); });
  }
}

function relativeToFlashpoint(filePath: string): string {
  return path.posix.join(window.External.config.fullFlashpointPath, filePath);
}

function logStuffs(emitter: any, events: string[]) {
  for (let i = 0; i < events.length; i++) {
    const e: string = events[i];
    emitter.on(e, (...args: any[]) => {
      console.log.call(console, e, ...args);
    });
  }
}

/**
 * Escape a string that will be used in a shell (command line)
 * ( According to this: http://www.robvanderwoude.com/escapechars.php )
 */
function escapeShell(str: string): string {
  // $& means the whole matched string
  return str.replace(/[\^\&\<\>\|]/g, '^$&')
            .replace(/%/g, '%%');
}
