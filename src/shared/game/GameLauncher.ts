import * as path from 'path';
import { exec, ExecOptions } from 'child_process';
import { IGameInfo, IAdditionalApplicationInfo } from './interfaces';

export class GameLauncher {
  public static launchAdditionalApplication(addApp: IAdditionalApplicationInfo): void {
    const appPath: string = relativeToFlashpoint(addApp.applicationPath);
    const appArgs: string = addApp.commandLine;
    console.log(`Launch AddApp: "${addApp.name}" `+
                `(applicationPath: "${addApp.applicationPath}", commandLine: "${addApp.commandLine}")`);
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
    let gameArgs: string = game.launchCommand;
    console.log(`Launch Game: "${game.title}" `+
                `(applicationPath: "${game.applicationPath}", launchCommand: "${game.launchCommand}")`);
    GameLauncher.launch(gamePath, gameArgs, { env: GameLauncher.getEnvironment() });
  }

  /**
    * The paths provided in the Game/AdditionalApplication XMLs are only accurate
    * on Windows. So we replace them with other hard-coded paths here.
   */
  private static getApplicationPath(game: IGameInfo): string {
    // @TODO Let the user change these paths from a file or something (services.json?).
    if (window.External.platform === 'linux')  {
      if (game.platform === 'Flash') {
        // Note that this assumes that `flash_player_sa_linux.x86_64.tar.gz`
        // has been extracted using:
        //   $ cd Arcade/Games
        //   $ tar xf flash_player_sa_linux.x86_64.tar.gz flashplayer
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
    // Escape filename and args
    let escFilename: string = filename;
    let escArgs: string = args;
    switch (window.External.platform) {
      case 'win32':
        escFilename = escapeWin(filename);
        escArgs = escapeWin(args);
        break;
      case 'linux':
        escFilename = filename;
        escArgs = escapeLinuxArgs(args);
        break;
    }
    // Run
    const str: string = `"${escFilename}" ${escArgs}`;
    console.log(`Run: ${str}`);
    const proc = exec(str, opts);
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
 * Escape a string that will be used in a Windows shell (command line)
 * ( According to this: http://www.robvanderwoude.com/escapechars.php )
 */
function escapeWin(str: string): string {
  return str.replace(/[\^\&\<\>\|]/g, '^$&') // $& means the whole matched string
            .replace(/%/g, '%%');
}

/**
 * Escape a the arguments that will be used in a Linux shell (command line)
 * ( According to this: https://stackoverflow.com/questions/15783701/which-characters-need-to-be-escaped-when-using-bash )
 */
function escapeLinuxArgs(str: string): string {
  return str.replace(/((?![a-zA-Z0-9,._+:@%-]).)/g, '\\$&'); // $& means the whole matched string
}
