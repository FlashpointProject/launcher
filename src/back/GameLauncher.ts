import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { AppProvider } from '@shared/extensions/interfaces';
import { ExecMapping, Omit } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { fixSlashes, padStart, stringifyArray } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import { ChildProcess, exec } from 'child_process';
import { EventEmitter } from 'events';
import { AppPathOverride, GameData, ManagedChildProcess } from 'flashpoint-launcher';
import * as path from 'path';
import { ApiEmitter } from './extensions/ApiEmitter';
import { OpenExternalFunc, ShowMessageBoxFunc } from './types';
import { isBrowserOpts } from './util/misc';
import * as GameDataManager from '@back/game/GameDataManager';

const { str } = Coerce;

export type LaunchAddAppOpts = LaunchBaseOpts & {
  addApp: AdditionalApp;
  native: boolean;
}

export type LaunchGameOpts = LaunchBaseOpts & {
  game: Game;
  native: boolean;
}

export type GameLaunchInfo = {
  game: Game;
  activeData?: GameData;
  launchInfo: LaunchInfo;
}

export type LaunchInfo = {
  gamePath: string;
  gameArgs: string | string[];
  useWine: boolean;
  env: NodeJS.ProcessEnv;
  cwd?: string;
  execFile?: boolean;
}

type LaunchBaseOpts = {
  fpPath: string;
  htdocsPath: string;
  execMappings: ExecMapping[];
  lang: LangContainer;
  isDev: boolean;
  exePath: string;
  appPathOverrides: AppPathOverride[];
  providers: AppProvider[];
  proxy: string;
  openDialog: ShowMessageBoxFunc;
  openExternal: OpenExternalFunc;
  runGame: (gameLaunchInfo: GameLaunchInfo) => ManagedChildProcess;
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
      case ':extras:': {
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
      }
      default: {
        let appPath: string = fixSlashes(path.join(opts.fpPath, getApplicationPath(opts.addApp.applicationPath, opts.execMappings, opts.native)));
        const appPathOverride = opts.appPathOverrides.filter(a => a.enabled).find(a => a.path === appPath);
        if (appPathOverride) { appPath = appPathOverride.override; }
        const appArgs: string = opts.addApp.launchCommand;
        const useWine: boolean = process.platform != 'win32' && appPath.endsWith('.exe');
        const launchInfo: LaunchInfo = {
          gamePath: appPath,
          gameArgs: appArgs,
          useWine,
          env: getEnvironment(opts.fpPath, opts.proxy),
        };
        const proc = exec(
          createCommand(launchInfo),
          { env: launchInfo.env }
        );
        logProcessOutput(proc);
        log.info(logSource, `Launch Add-App "${opts.addApp.name}" (PID: ${proc.pid}) [ path: "${opts.addApp.applicationPath}", arg: "${opts.addApp.launchCommand}" ]`);
        return new Promise((resolve, reject) => {
          if (proc.killed) { resolve(); }
          else {
            proc.once('exit', () => { resolve(); });
            proc.once('error', error => { reject(error); });
          }
        });
      }
    }
  }

  /**
   * Launch a game
   * @param game Game to launch
   */
  export async function launchGame(opts: LaunchGameOpts, onWillEvent: ApiEmitter<GameLaunchInfo>): Promise<void> {
    // Abort if placeholder (placeholders are not "actual" games)
    if (opts.game.placeholder) { return; }
    // Run all provided additional applications with "AutoRunBefore" enabled
    if (opts.game.addApps) {
      const addAppOpts: Omit<LaunchAddAppOpts, 'addApp'> = {
        fpPath: opts.fpPath,
        htdocsPath: opts.htdocsPath,
        native: opts.native,
        execMappings: opts.execMappings,
        lang: opts.lang,
        isDev: opts.isDev,
        exePath: opts.exePath,
        appPathOverrides: opts.appPathOverrides,
        providers: opts.providers,
        proxy: opts.proxy,
        openDialog: opts.openDialog,
        openExternal: opts.openExternal,
        runGame: opts.runGame
      };
      for (const addApp of opts.game.addApps) {
        if (addApp.autoRunBefore) {
          const promise = launchAdditionalApplication({ ...addAppOpts, addApp });
          if (addApp.waitForExit) { await promise; }
        }
      }
    }
    // Launch game
    let appPath: string = getApplicationPath(opts.game.applicationPath, opts.execMappings, opts.native);
    let appArgs: string[] = [];
    const appPathOverride = opts.appPathOverrides.filter(a => a.enabled).find(a => a.path === appPath);
    if (appPathOverride) { appPath = appPathOverride.override; }
    const availableApps = opts.providers.filter(p => p.provides.includes(appPath) || p.provides.includes(opts.game.applicationPath));
    // If any available provided applications, check if any work.
    for (const app of availableApps) {
      try {
        const res = await app.callback(opts.game);

        // Simple path return, treat as regular app
        if (typeof res === 'string') {
          // Got a real application path, break out so we can run as normal
          appPath = res;
          break;
        }

        if (Array.isArray(res)) {
          appPath = str(res[0]);
          appArgs = res.slice(1).map(a => str(a));
        }

        // Browser Mode Launch
        if (isBrowserOpts(res)) {
          const env = getEnvironment(opts.fpPath, opts.proxy);
          if ('ELECTRON_RUN_AS_NODE' in env) {
            delete env['ELECTRON_RUN_AS_NODE']; // If this flag is present, it will disable electron features from the process
          }
          const browserLaunchArgs = [path.join(__dirname, '../main/index.js'), 'browser_mode=true'];
          if (res.proxy) { browserLaunchArgs.push(`proxy=${res.proxy}`); }
          browserLaunchArgs.push(`browser_url=${(res.url)}`);
          const gameData = opts.game.activeDataId ? await GameDataManager.findOne(opts.game.activeDataId) : undefined;
          const gameLaunchInfo: GameLaunchInfo = {
            game: opts.game,
            activeData: gameData,
            launchInfo: {
              gamePath: process.execPath,
              gameArgs: browserLaunchArgs,
              useWine: false,
              env,
              cwd: process.cwd(),
              execFile: true
            }
          };
          onWillEvent.fire(gameLaunchInfo)
          .then(() => {
            const managedProc = opts.runGame(gameLaunchInfo);
            log.info(logSource, `Launch Game "${opts.game.title}" (PID: ${managedProc.getPid()}) [\n`+
                      `    applicationPath: "${appPath}",\n`+
                      `    launchCommand:   "${opts.game.launchCommand}" ]`);
          })
          .catch((error) => {
            log.info('Game Launcher', `Game Launch Aborted: ${error}`);
            alert(`Game Launch Aborted: ${error}`);
          });
          return;
        }

        // Isn't a path or for browser, can't interpret
        throw new Error('Invalid response given by provider.');
      } catch (error) {
        // Catch, keep going down providers if they are failing.
        log.error('Launcher', `Error running provider for game.\n${error}`);
      }
    }
    // Continue with launching normally
    switch (appPath) {
      // Special case flash browser run.
      // @TODO Move to extension
      case ':flash:': {
        const env = getEnvironment(opts.fpPath, opts.proxy);
        if ('ELECTRON_RUN_AS_NODE' in env) {
          delete env['ELECTRON_RUN_AS_NODE']; // If this flag is present, it will disable electron features from the process
        }
        const gameData = opts.game.activeDataId ? await GameDataManager.findOne(opts.game.activeDataId) : undefined;
        const gameLaunchInfo: GameLaunchInfo = {
          game: opts.game,
          activeData: gameData,
          launchInfo: {
            gamePath: process.execPath,
            gameArgs: [path.join(__dirname, '../main/index.js'), 'browser_mode=true', `browser_url=${path.join(__dirname, '../window/flash_index.html')}?data=${encodeURI(opts.game.launchCommand)}`],
            useWine: false,
            env,
            cwd: process.cwd(),
            execFile: true
          }
        };
        onWillEvent.fire(gameLaunchInfo)
        .then(() => {
          const managedProc = opts.runGame(gameLaunchInfo);
          log.info(logSource, `Launch Game "${opts.game.title}" (PID: ${managedProc.getPid()}) [\n`+
                    `    applicationPath: "${appPath}",\n`+
                    `    launchCommand:   "${opts.game.launchCommand}" ]`);
        })
        .catch((error) => {
          log.info('Game Launcher', `Game Launch Aborted: ${error}`);
          alert(`Game Launch Aborted: ${error}`);
        });
        const managedProc = opts.runGame(gameLaunchInfo);
        log.info(logSource, `Launch Game "${opts.game.title}" (PID: ${managedProc.getPid()}) [\n`+
                  `    applicationPath: "${appPath}",\n`+
                  `    launchCommand:   "${opts.game.launchCommand}" ]`);
      } break;
      default: {
        const gamePath: string = path.isAbsolute(appPath) ? fixSlashes(appPath) : fixSlashes(path.join(opts.fpPath, appPath));
        const gameArgs: string[] = [...appArgs, opts.game.launchCommand];
        const useWine: boolean = process.platform != 'win32' && gamePath.endsWith('.exe');
        const env = getEnvironment(opts.fpPath, opts.proxy);
        const gameData = opts.game.activeDataId ? await GameDataManager.findOne(opts.game.activeDataId) : undefined;
        const gameLaunchInfo: GameLaunchInfo = {
          game: opts.game,
          activeData: gameData,
          launchInfo: {
            gamePath,
            gameArgs,
            useWine,
            env,
          }
        };
        onWillEvent.fire(gameLaunchInfo)
        .then(() => {
          const command: string = createCommand(gameLaunchInfo.launchInfo);
          const managedProc = opts.runGame(gameLaunchInfo);
          log.info(logSource,`Launch Game "${opts.game.title}" (PID: ${managedProc.getPid()}) [\n`+
                     `    applicationPath: "${opts.game.applicationPath}",\n`+
                     `    launchCommand:   "${opts.game.launchCommand}",\n`+
                     `    command:         "${command}" ]`);
        })
        .catch((error) => {
          log.info('Game Launcher', `Game Launch Aborted: ${error}`);
        });
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

    // Skip mapping if on Windows
    if (platform !== 'win32') {
      for (let i = 0; i < execMappings.length; i++) {
        const mapping = execMappings[i];
        if (mapping.win32 === filePath) {
          switch (platform) {
            case 'linux':
              // If we are trying to run this game natively:
              if (native) {
                // Use the native binary (if configured.)
                return mapping.linux || mapping.win32;
              } else {
                // Otherwise, use the wine binary (if configured.)
                return mapping.wine || mapping.win32;
              }
            case 'darwin':
              // If we are trying to run this game natively:
              if (native) {
                // Use the native binary (if configured.)
                return mapping.darwin || mapping.win32;
              }
              break;
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
  function getEnvironment(fpPath: string, proxy: string): NodeJS.ProcessEnv {
    // When using Linux, use the proxy created in BackgroundServices.ts
    // This is only needed on Linux because the proxy is installed on system
    // level entire system when using Windows.
    // When using WINE on mac, the proxy variable is needed as well.
    return {
      // Add proxy env vars if it's running on linux
      ...((process.platform === 'linux' || process.platform === 'darwin' && proxy !== '') ? { http_proxy: `http://${proxy}/`, HTTP_PROXY: `http://${proxy}/` } : null),
      // Copy this processes environment variables
      ...process.env,
    };
  }

  function createCommand(launchInfo: LaunchInfo): string {
    // This whole escaping thing is horribly broken. We probably want to switch
    // to an array representing the argv instead and not have a shell
    // in between.
    const { gamePath, gameArgs, useWine } = launchInfo;
    const args = typeof gameArgs === 'string' ? [gameArgs] : gameArgs;
    switch (process.platform) {
      case 'win32':
        return `"${gamePath}" ${args.join(' ')}`;
      case 'darwin':
      case 'linux':
        if (useWine) {
          return `wine start /unix "${gamePath}" ${args.join(' ')}`;
        }
        return `"${gamePath}" ${args.join(' ')}`;
      default:
        throw Error('Unsupported platform');
    }
  }

  function logProcessOutput(proc: ChildProcess): void {
    // Log for debugging purposes
    // (might be a bad idea to fill the console with junk?)
    const logInfo = (event: string, args: any[]): void => {
      log.info(logSource, `${event} (PID: ${padStart(proc.pid, 5)}) ${stringifyArray(args, stringifyArrayOpts)}`);
    };
    const logErr = (event: string, args: any[]): void => {
      log.error(logSource, `${event} (PID: ${padStart(proc.pid, 5)}) ${stringifyArray(args, stringifyArrayOpts)}`);
    };
    registerEventListeners(proc, [/* 'close', */ 'disconnect', 'exit', 'message'], logInfo);
    registerEventListeners(proc, ['error'], logErr);
    if (proc.stdout) { proc.stdout.on('data', (data) => { logInfo('stdout', [data.toString('utf8')]); }); }
    if (proc.stderr) { proc.stderr.on('data', (data) => { logErr('stderr', [data.toString('utf8')]); });  }
  }
}

const stringifyArrayOpts = {
  trimStrings: true,
};

function registerEventListeners(emitter: EventEmitter, events: string[], callback: (event: string, args: any[]) => void): void {
  for (let i = 0; i < events.length; i++) {
    const e: string = events[i];
    emitter.on(e, (...args: any[]) => {
      callback(e, args);
    });
  }
}

/**
 * Escapes Arguments for the operating system (Used when running a process in a shell)
 */
export function escapeArgsForShell(gameArgs: string | string[]): string[] {
  if (typeof gameArgs === 'string') {
    switch (process.platform) {
      case 'win32':
        return [`${escapeWin(gameArgs)}`];
      case 'darwin':
      case 'linux':
        return [`${escapeLinuxArgs(gameArgs)}`];
      default:
        throw Error('Unsupported platform');
    }
  } else {
    switch (process.platform) {
      case 'win32':
        return gameArgs.map(a => `${escapeWin(a)}`);
      case 'darwin':
      case 'linux':
        return gameArgs.map(a => `${escapeLinuxArgs(a)}`);
      default:
        throw Error('Unsupported platform');
    }
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
  // Characters to always escape:
  const escapeChars: string[] = ['~','`','#','$','&','*','(',')','\\\\','|','[','\\]','{','}',';','<','>','?','!'];
  const match = str.match(/'/gi);
  if (match == null || match.join('').length % 2 == 0) {
    escapeChars.unshift('[');
    escapeChars.push(']');
  } else { // If there's an odd number of single quotes, escape those too.
    escapeChars.unshift('[');
    escapeChars.push('\'');
    escapeChars.push(']');
  }
  return (
    splitQuotes(str)
    .reduce((acc, val, i) => acc + ((i % 2 === 0)
      ? val.replace(new RegExp(escapeChars.join(''), 'g'), '\\$&')
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
