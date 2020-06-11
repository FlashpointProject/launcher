import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { ExecMapping, Omit } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { fixSlashes, padStart, stringifyArray } from '@shared/Util';
import { ChildProcess, exec, execFile } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import { LogFunc, OpenDialogFunc, OpenExternalFunc } from './types';

export type LaunchAddAppOpts = LaunchBaseOpts & {
  addApp: AdditionalApp;
  native: boolean;
}

export type LaunchGameOpts = LaunchBaseOpts & {
  game: Game;
  native: boolean;
}

type LaunchBaseOpts = {
  fpPath: string;
  execMappings: ExecMapping[];
  lang: LangContainer;
  isDev: boolean;
  exePath: string;
  log: LogFunc;
  openDialog: OpenDialogFunc;
  openExternal: OpenExternalFunc;
}

export namespace GameLauncher {
  const logSource = 'Game Launcher';

  export function launchAdditionalApplication(opts: LaunchAddAppOpts): Promise<void> {
    // @FIXTHIS It is not possible to open dialog windows from the back process (all electron APIs are undefined).
    switch (opts.addApp.applicationPath) {
      case ':message:':
        return new Promise((resolve, reject) => {
          opts.openDialog({
            type: 'info',
            title: 'About This Game',
            message: opts.addApp.launchCommand,
            buttons: ['Ok'],
          }).finally(() => resolve());
        });
      case ':extras:':
        const folderPath = fixSlashes(path.join(opts.fpPath, path.posix.join('Extras', opts.addApp.launchCommand)));
        return opts.openExternal(folderPath, { activate: true })
        .catch(error => {
          if (error) {
            opts.openDialog({
              type: 'error',
              title: 'Failed to Open Extras',
              message: `${error.toString()}\n`+
                       `Path: ${folderPath}`,
              buttons: ['Ok'],
            });
          }
        });

      default:
        const appPath: string = fixSlashes(path.join(opts.fpPath, getApplicationPath(opts.addApp.applicationPath, opts.execMappings, opts.native)));
        const appArgs: string = opts.addApp.launchCommand;
        const useWine: boolean = process.platform != 'win32' && appPath.endsWith('.exe');
        const proc = exec(
          createCommand(appPath, appArgs, useWine),
          { env: getEnvironment(opts.fpPath) }
        );
        logProcessOutput(proc, opts.log);
        opts.log({
          source: logSource,
          content: `Launch Add-App "${opts.addApp.name}" (PID: ${proc.pid}) [ path: "${opts.addApp.applicationPath}", arg: "${opts.addApp.launchCommand}" ]`,
        });
        return new Promise((resolve, reject) => {
          if (proc.killed) { resolve(); }
          else {
            proc.once('exit', () => { resolve(); });
            proc.once('error', error => { reject(error); });
          }
        });
    }
  }

  /**
   * Launch a game
   * @param game Game to launch
   */
  export async function launchGame(opts: LaunchGameOpts): Promise<void> {
    // Abort if placeholder (placeholders are not "actual" games)
    if (opts.game.placeholder) { return; }
    // Run all provided additional applications with "AutoRunBefore" enabled
    if (opts.game.addApps) {
      const addAppOpts: Omit<LaunchAddAppOpts, 'addApp'> = {
        fpPath: opts.fpPath,
        native: opts.native,
        execMappings: opts.execMappings,
        lang: opts.lang,
        isDev: opts.isDev,
        exePath: opts.exePath,
        log: opts.log,
        openDialog: opts.openDialog,
        openExternal: opts.openExternal,
      };
      for (let addApp of opts.game.addApps) {
        if (addApp.autoRunBefore) {
          const promise = launchAdditionalApplication({ ...addAppOpts, addApp });
          if (addApp.waitForExit) { await promise; }
        }
      }
    }
    // Launch game
    const appPath: string = getApplicationPath(opts.game.applicationPath, opts.execMappings, opts.native);
    switch (appPath) {
      case ':flash:': {
        const env = getEnvironment(opts.fpPath);
        if ('ELECTRON_RUN_AS_NODE' in env) {
          delete env['ELECTRON_RUN_AS_NODE']; // If this flag is present, it will disable electron features from the process
        }
        const proc = execFile(
          process.execPath, // path.join(__dirname, '../main/index.js'),
          [path.join(__dirname, '../main/index.js'), 'flash=true', opts.game.launchCommand],
          { env, cwd: process.cwd() }
        );
        logProcessOutput(proc, opts.log);
        opts.log({
          source: logSource,
          content: `Launch Game "${opts.game.title}" (PID: ${proc.pid}) [\n`+
                  `    applicationPath: "${appPath}",\n`+
                  `    launchCommand:   "${opts.game.launchCommand}" ]`
        });
      } break;
      default: {
        const gamePath: string = fixSlashes(path.join(opts.fpPath, getApplicationPath(opts.game.applicationPath, opts.execMappings, opts.native)));
        const gameArgs: string = opts.game.launchCommand;
        const useWine: boolean = process.platform != 'win32' && gamePath.endsWith('.exe');
        const command: string = createCommand(gamePath, gameArgs, useWine);
        const proc = exec(command, { env: getEnvironment(opts.fpPath) });
        logProcessOutput(proc, opts.log);
        opts.log({
          source: logSource,
          content: `Launch Game "${opts.game.title}" (PID: ${proc.pid}) [\n`+
                   `    applicationPath: "${opts.game.applicationPath}",\n`+
                   `    launchCommand:   "${opts.game.launchCommand}",\n`+
                   `    command:         "${command}" ]`
        });
        // Show popups for Unity games
        // (This is written specifically for the "startUnity.bat" batch file)
        if (opts.game.platform === 'Unity' && proc.stdout) {
          let textBuffer: string = ''; // (Buffer of text, if its multi-line)
          proc.stdout.on('data', function(text: string): void {
            // Add text to buffer
            textBuffer += text;
            // Check for exact messages and show the appropriate popup
            for (let response of unityOutputResponses) {
              if (textBuffer.endsWith(response.text)) {
                response.fn(proc, opts.openDialog);
                textBuffer = '';
                break;
              }
            }
          });
        }
      } break;
    }
  }

  /**
   * The paths provided in the Game/AdditionalApplication XMLs are only accurate
   * on Windows. So we replace them with other hard-coded paths here.
   */
  function getApplicationPath(filePath: string, execMappings: ExecMapping[], native: boolean): string {
    const platform = process.platform;

    // Bat files won't work on Wine, force a .sh file on non-Windows platforms instead. Sh File may not exist.
    if (platform !== 'win32' && filePath.endsWith('.bat')) {
      return filePath.substr(0, filePath.length - 4) + '.sh';
    }

    // Skip mapping if on Windows or Native application was not requested
    if (platform !== 'win32' && native) {
      for (let i = 0; i < execMappings.length; i++) {
        const mapping = execMappings[i];
        if (mapping.win32 === filePath) {
          switch (platform) {
            case 'linux':
              return mapping.linux || mapping.win32;
            case 'darwin':
              return mapping.darwin || mapping.win32;
            default:
              return filePath;
          }
        }
      }
    }

    // No Native exec found, return Windows/XML application path
    return filePath;
  }

  /** Get an object containing the environment variables to use for the game / additional application. */
  function getEnvironment(fpPath: string): NodeJS.ProcessEnv {
    // When using Linux, use the proxy created in BackgroundServices.ts
    // This is only needed on Linux because the proxy is installed on system
    // level entire system when using Windows.
    return {
      // Add proxy env vars if it's running on linux
      ...((process.platform === 'linux') ? { http_proxy: 'http://localhost:22500/' } : null),
      // Copy this processes environment variables
      ...process.env,
    };
  }

  function createCommand(filename: string, args: string, useWine: boolean): string {
    // This whole escaping thing is horribly broken. We probably want to switch
    // to an array representing the argv instead and not have a shell
    // in between.
    switch (process.platform) {
      case 'win32':
        return `"${filename}" ${escapeWin(args)}`;
      case 'darwin':
      case 'linux':
        if (useWine) {
          return `wine start /unix "${filename}" ${escapeLinuxArgs(args)}`;
        }
        return `"${filename}" ${escapeLinuxArgs(args)}`;
      default:
        throw Error('Unsupported platform');
    }
  }

  function logProcessOutput(proc: ChildProcess, log: LogFunc): void {
    // Log for debugging purposes
    // (might be a bad idea to fill the console with junk?)
    const logStuff = (event: string, args: any[]): void => {
      log({
        source: logSource,
        content: `${event} (PID: ${padStart(proc.pid, 5)}) ${stringifyArray(args, stringifyArrayOpts)}`,
      });
    };
    doStuffs(proc, [/* 'close', */ 'disconnect', 'error', 'exit', 'message'], logStuff);
    if (proc.stdout) { proc.stdout.on('data', (data) => { logStuff('stdout', [data.toString('utf8')]); }); }
    if (proc.stderr) { proc.stderr.on('data', (data) => { logStuff('stderr', [data.toString('utf8')]); }); }
  }
}

const stringifyArrayOpts = {
  trimStrings: true,
};

function doStuffs(emitter: EventEmitter, events: string[], callback: (event: string, args: any[]) => void): void {
  for (let i = 0; i < events.length; i++) {
    const e: string = events[i];
    emitter.on(e, (...args: any[]) => {
      callback(e, args);
    });
  }
}

/**
 * Escape a string that will be used in a Windows shell (command line)
 * ( According to this: http://www.robvanderwoude.com/escapechars.php )
 */
function escapeWin(str: string): string {
  return (
    splitQuotes(str)
    .reduce((acc, val, i) => acc + ((i % 2 === 0)
      ? val.replace(/[\^&<>|]/g, '^$&')
      : `"${val}"`
    ), '')
  );
}

/**
 * Escape arguments that will be used in a Linux shell (command line)
 * ( According to this: https://stackoverflow.com/questions/15783701/which-characters-need-to-be-escaped-when-using-bash )
 */
function escapeLinuxArgs(str: string): string {
  return (
    splitQuotes(str)
    .reduce((acc, val, i) => acc + ((i % 2 === 0)
      ? val.replace(/[~`#$&*()\\|[\]{};<>?!]/g, '\\$&')
      : '"' + val.replace(/[$!\\]/g, '\\$&') + '"'
    ), '')
  );
}

/**
 * Split a string to separate the characters wrapped in quotes from all other.
 * Example: '-a -b="123" "example.com"' => ['-a -b=', '123', ' ', 'example.com']
 * @param str String to split.
 * @returns Split of the argument string.
 *          Items with odd indices are wrapped in quotes.
 *          Items with even indices are NOT wrapped in quotes.
 */
function splitQuotes(str: string): string[] {
  // Search for all pairs of quotes and split the string accordingly
  const splits: string[] = [];
  let start = 0;
  while (true) {
    const begin = str.indexOf('"', start);
    if (begin >= 0) {
      const end = str.indexOf('"', begin + 1);
      if (end >= 0) {
        splits.push(str.substring(start, begin));
        splits.push(str.substring(begin + 1, end));
        start = end + 1;
      } else { break; }
    } else { break; }
  }
  // Push remaining characters
  if (start < str.length) {
    splits.push(str.substring(start, str.length));
  }
  return splits;
}

type UnityOutputResponse = {
  text: string;
  fn: (proc: ChildProcess, openDialog: OpenDialogFunc) => void;
}

const unityOutputResponses: UnityOutputResponse[] = [
  {
    text: 'Failed to set registry keys!\r\n'+
          'Retry? (Y/n): ',
    fn(proc, openDialog) {
      openDialog({
        type: 'warning',
        title: 'Start Unity - Registry Key Warning',
        message: 'Failed to set registry keys!\n'+
                 'Retry?',
        buttons: ['Yes', 'No'],
        defaultId: 0,
        cancelId: 1,
      }).then((response) => {
        if (!proc.stdin) { throw new Error('Failed to signal to Unity starter. Can not access its "standard in".'); }
        if (response === 0) { proc.stdin.write('Y'); }
        else                { proc.stdin.write('n'); }
      });
    }
  }, {
    text: 'Invalid parameters!\r\n'+
          'Correct usage: startUnity [2.x|5.x] URL\r\n'+
          'If you need to undo registry changes made by this script, run unityRestoreRegistry.bat. \r\n'+
          'Press any key to continue . . . ',
    fn(proc, openDialog) {
      openDialog({
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
    fn(proc, openDialog) {
      openDialog({
        type: 'info',
        title: 'Start Unity - Browser Already Open',
        message: 'You must close the Basilisk browser to continue.\n'+
                 'If you have already closed Basilisk, please wait a moment...',
        buttons: ['Ok', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((response) => {
        if (response === 1) { proc.kill(); }
      });
    }
  }
];
