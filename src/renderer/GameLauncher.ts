import * as electron from 'electron';
import * as path from 'path';
import { exec, ExecOptions, ChildProcess } from 'child_process';
import { IGameInfo, IAdditionalApplicationInfo } from '../shared/game/interfaces';
import { EventEmitter } from 'events';

export class GameLauncher {
  public static launchAdditionalApplication(addApp: IAdditionalApplicationInfo): void {
    const appPath: string = relativeToFlashpoint(addApp.applicationPath);
    const appArgs: string = addApp.commandLine;
    const proc = GameLauncher.launch(appPath, appArgs, { env: GameLauncher.getEnvironment() });
    log(`launch add-app "${addApp.name}" (PID: ${proc.pid}) [path: "${addApp.applicationPath}", arg: "${addApp.commandLine}"]`);
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
    const proc = GameLauncher.launch(gamePath, gameArgs, { env: GameLauncher.getEnvironment() });
    log(`launch game "${game.title}" (PID: ${proc.pid}), [path: "${game.applicationPath}", arg: "${game.launchCommand}"]`);
    // Show popups for Unity games
    // (This is written specifically for the "startUnity.bat" batch file)
    if (game.platform === 'Unity') {
      let textBuffer: string = ''; // (Buffer of text, if its multi-line)
      proc.stdout.on('data', function(text: string): void {
        // Add text to buffer
        textBuffer += text;
        // Check for exact messages and show the appropriate popup
        if (textBuffer.endsWith('Failed to set registry keys!\r\nRetry? (Y/n): ')) {
          electron.remote.dialog.showMessageBox({
            type: 'warning',
            title: 'Start Unity - Registry Key Warning',
            message: 'Failed to set registry keys!'+
                     '\nRetry?',
            buttons: ['Yes', 'No'],
            defaultId: 0,
            cancelId: 1,
          }, function(response: number): void {
            if (response === 0) {
              proc.stdin.write('Y');
            } else {
              proc.stdin.write('n');
            }
          });
          // Clear text buffer
          textBuffer = '';
        } else if (textBuffer.endsWith('Invalid parameters!\r\nCorrect usage: startUnity 2.x|5.x URL\r\nIf you need to undo registry changes made by this script, run unityRestoreRegistry.bat. \r\nPress any key to continue . . . ')) {
          electron.remote.dialog.showMessageBox({
            type: 'warning',
            title: 'Start Unity - Invalid Parameters',
            message: 'Invalid parameters!\n'+
                     'Correct usage: startUnity 2.x|5.x URL\n'+
                     'If you need to undo registry changes made by this script, run unityRestoreRegistry.bat.',
            buttons: ['Ok'],
            defaultId: 0,
            cancelId: 0,
          });
          // Clear text buffer
          textBuffer = '';
        } else if (textBuffer.endsWith('You must close the K-Meleon browser to continue.\r\nIf you have already closed K-Meleon, please wait a moment...\r\n')) {
          electron.remote.dialog.showMessageBox({
            type: 'info',
            title: 'Start Unity - Browser Already Open',
            message: 'You must close the K-Meleon browser to continue.\n'+
                     'If you have already closed K-Meleon, please wait a moment...',
            buttons: ['Ok', 'Cancel'],
            defaultId: 0,
            cancelId: 1,
          }, function(response: number): void {
            if (response === 1) {
              proc.kill();
            }
          });
          // Clear text buffer
          textBuffer = '';
        }
      });
    }
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
      if (game.platform === 'Unity') {
        return 'Games/startUnity.sh';
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

  private static launch(filename: string, args: string, opts: ExecOptions): ChildProcess {
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
    const proc = exec(str, opts);
    // Log for debugging purposes
    // (might be a bad idea to fill the console with junk?)
    const logStuff = (event: string, args: any[]): void => {
      let str = `${event} (PID: ${proc.pid}) [ `;
      for (let i = 0; i < args.length; i++) {
        let element = args[i];
        str += isString(element) ? `"${element}"` : element+'';
        if (i !== args.length - 1) { str += ', '; }
      }
      str += ' ]';
      log(str);
    };
    doStuffs(proc, ['close', 'disconnect', 'error', 'exit', 'message'], logStuff);
    proc.stdout.on('data', (data) => { logStuff('stdout', [data.toString('utf8')]); });
    proc.stderr.on('data', (data) => { logStuff('stderr', [data.toString('utf8')]); });
    // Return process
    return proc;
  }
}

function relativeToFlashpoint(filePath: string): string {
  return path.posix.join(window.External.config.fullFlashpointPath, filePath);
}

function doStuffs(emitter: EventEmitter, events: string[], callback: (event: string, args: any[]) => void): void {
  for (let i = 0; i < events.length; i++) {
    const e: string = events[i];
    emitter.on(e, (...args: any[]) => {
      callback(e, args);
    });
  }
}

function log(str: string): void {
  window.External.log.addEntry(`Game Launcher: ${str}`);
}

/**
 * Escape a string that will be used in a Windows shell (command line)
 * ( According to this: http://www.robvanderwoude.com/escapechars.php )
 */
function escapeWin(str: string): string {
  return str.replace(/[\^\&\<\>\|]/g, '^$&'); // $& means the whole matched string
}

/**
 * Escape a the arguments that will be used in a Linux shell (command line)
 * ( According to this: https://stackoverflow.com/questions/15783701/which-characters-need-to-be-escaped-when-using-bash )
 */
function escapeLinuxArgs(str: string): string {
  return str.replace(/((?![a-zA-Z0-9,._+:@%-]).)/g, '\\$&'); // $& means the whole matched string
}

function isString(obj: any): boolean {
  return typeof obj === 'string' || obj instanceof String;
}
