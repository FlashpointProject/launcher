import { ChildProcess, exec, ExecOptions } from 'child_process';
import { remote } from 'electron';
import { EventEmitter } from 'events';
import * as path from 'path';
import { IAdditionalApplicationInfo, IGameInfo } from '../shared/game/interfaces';
import { padStart, stringifyArray } from '../shared/Util';

export class GameLauncher {
  public static launchAdditionalApplication(addApp: IAdditionalApplicationInfo): void {
    switch (addApp.applicationPath) {
      case ':message:':
        remote.dialog.showMessageBox({
          type: 'info',
          title: 'About This Game',
          message: addApp.commandLine
        });
        break;
      case ':extras:':
        const folderPath = relativeToFlashpoint(path.join('Extras', addApp.commandLine));
        remote.shell.openExternal(
          folderPath, { activate: true },
          error => {
            if (error) {
              remote.dialog.showMessageBox({
                type: 'error',
                title: 'Failed to Open Extras',
                message: `${error.toString()}\n`+
                        `Path: ${folderPath}`
              }, () => {});              
            }
          }
        );
        break;
      default:
        const appPath: string = relativeToFlashpoint(addApp.applicationPath);
        const appArgs: string = addApp.commandLine;
        const proc = GameLauncher.launch(appPath, appArgs, { env: GameLauncher.getEnvironment() });
        log(`Launch Add-App "${addApp.name}" (PID: ${proc.pid}) [ path: "${addApp.applicationPath}", arg: "${addApp.commandLine}" ]`);
        break;
    }
  }

  /**
   * Launch a game
   * @param game Game to launch
   */
  public static launchGame(game: IGameInfo, addApps?: IAdditionalApplicationInfo[]): void {
    // Abort if placeholder (placeholders are not "actual" games)
    if (game.placeholder) { return; }
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
    log(`Launch Game "${game.title}" (PID: ${proc.pid}) [ path: "${game.applicationPath}", arg: "${game.launchCommand}" ]`);
    // Show popups for Unity games
    // (This is written specifically for the "startUnity.bat" batch file)
    if (game.platform === 'Unity') {
      let textBuffer: string = ''; // (Buffer of text, if its multi-line)
      proc.stdout.on('data', function(text: string): void {
        // Add text to buffer
        textBuffer += text;
        // Check for exact messages and show the appropriate popup
        for (let response of unityOutputResponses) {
          if (textBuffer.endsWith(response.text)) {
            response.func(proc);
            textBuffer = '';
            break;
          }
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
      log(`${event} (PID: ${padStart(proc.pid, 5)}) ${stringifyArray(args)}`);
    };
    doStuffs(proc, [/*'close',*/ 'disconnect', 'error', 'exit', 'message'], logStuff);
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
  window.External.log.addEntry({
    source: 'Game Launcher',
    content: str,
  });
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

const unityOutputResponses = [
  {
    text: 'Failed to set registry keys!\r\n'+
          'Retry? (Y/n): ',
    func(proc: ChildProcess) {
      remote.dialog.showMessageBox({
        type: 'warning',
        title: 'Start Unity - Registry Key Warning',
        message: 'Failed to set registry keys!\n'+
                 'Retry?',
        buttons: ['Yes', 'No'],
        defaultId: 0,
        cancelId: 1,
      }, function(response: number): void {
        if (response === 0) { proc.stdin.write('Y'); }
        else                { proc.stdin.write('n'); }
      });
    }
  }, {
    text: 'Invalid parameters!\r\n'+
          'Correct usage: startUnity [2.x|5.x] URL\r\n'+
          'If you need to undo registry changes made by this script, run unityRestoreRegistry.bat. \r\n'+
          'Press any key to continue . . . ',
    func(proc: ChildProcess) {
      remote.dialog.showMessageBox({
        type: 'warning',
        title: 'Start Unity - Invalid Parameters',
        message: 'Invalid parameters!\n'+
                 'Correct usage: startUnity [2.x|5.x] URL\n'+
                 'If you need to undo registry changes made by this script, run unityRestoreRegistry.bat.',
        buttons: ['Ok'],
        defaultId: 0,
        cancelId: 0,
      });
    }
  }, {
    text: 'You must close the Basilisk browser to continue.\r\n'+
          'If you have already closed Basilisk, please wait a moment...\r\n',
    func(proc: ChildProcess) {
      remote.dialog.showMessageBox({
        type: 'info',
        title: 'Start Unity - Browser Already Open',
        message: 'You must close the Basilisk browser to continue.\n'+
                 'If you have already closed Basilisk, please wait a moment...',
        buttons: ['Ok', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
      }, function(response: number): void {
        if (response === 1) { proc.kill(); }
      });
    }
  }
];
