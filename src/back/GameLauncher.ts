import { AppProvider } from '@shared/extensions/interfaces';
import { ExecMapping, Omit } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { fixSlashes, padStart, stringifyArray } from '@shared/Util';
import * as Coerce from '@shared/utils/Coerce';
import { ChildProcess, exec } from 'child_process';
import { EventEmitter } from 'events';
import { AdditionalApp, AppPathOverride, DialogStateTemplate, Game, GameConfig, GameData, GameLaunchInfo, ManagedChildProcess, Platform } from 'flashpoint-launcher';
import * as minimist from 'minimist';
import * as path from 'path';
import { extractFullPromise, fpDatabase } from '.';
import { ApiEmitterFirable } from './extensions/ApiEmitter';
import { BackState, OpenExternalFunc, ShowMessageBoxFunc } from './types';
import { getCwd, isBrowserOpts } from './util/misc';
import * as fs from 'fs-extra';
import { BackOut, ComponentState, ComponentStatus } from '@shared/back/types';
import * as child_process from 'child_process';
import { awaitDialog, createNewDialog } from './util/dialog';
import { formatString } from '@shared/utils/StringFormatter';
import { getGameDataFilename } from '@shared/utils/misc';

const { str } = Coerce;

export type LaunchAddAppOpts = LaunchBaseOpts & {
  addApp: AdditionalApp;
  parentGame: Game;
  native: boolean;
}

export type LaunchGameOpts = LaunchBaseOpts & {
  game: Game;
  native: boolean;
}

export type LaunchInfo = {
  gamePath: string;
  gameArgs: string | string[];
  useWine: boolean;
  env: NodeJS.ProcessEnv;
  cwd?: string;
  noshell?: boolean;
}

type LaunchBaseOpts = {
  changeServer: (server?: string) => Promise<void>;
  fpPath: string;
  dataPacksFolderPath: string;
  sevenZipPath: string;
  htdocsPath: string;
  execMappings: ExecMapping[];
  lang: LangContainer;
  isDev: boolean;
  exePath: string;
  appPathOverrides: AppPathOverride[];
  providers: AppProvider[];
  proxy: string;
  envPATH?: string;
  openDialog: ShowMessageBoxFunc;
  openExternal: OpenExternalFunc;
  runGame: (gameLaunchInfo: GameLaunchInfo) => ManagedChildProcess;
  state: BackState;
  activeConfig: GameConfig | null;
}

export namespace GameLauncher {
  const logSource = 'Game Launcher';

  export async function launchAdditionalApplication(opts: LaunchAddAppOpts, child: boolean, serverOverride?: string): Promise<void> {
    await checkAndInstallPlatform(opts.parentGame.detailedPlatforms!, opts.state, opts.openDialog);
    switch (opts.addApp.applicationPath) {
      case ':message:': {
        const dialogId = await opts.openDialog({
          largeMessage: true,
          message: opts.addApp.launchCommand,
          buttons: opts.addApp.waitForExit ? ['Ok', 'Cancel'] : ['Ok'],
        });
        const result = (await awaitDialog(opts.state, dialogId)).buttonIdx;
        if (result !== 0) {
          throw 'User aborted game launch (denied message box)';
        }
        return;
      }
      case ':extras:': {
        const folderPath = fixSlashes(path.join(opts.fpPath, path.posix.join('Extras', opts.addApp.launchCommand)));
        return opts.openExternal(folderPath, { activate: true })
        .catch(error => {
          if (error) {
            opts.openDialog({
              largeMessage: true,
              message: `${error.toString()}\n`+
                       `Path: ${folderPath}`,
              buttons: ['Ok'],
            });
          }
        });
      }
      default: {
        let appPath: string = getApplicationPath(opts.addApp.applicationPath, opts.execMappings, opts.native);
        const appPathOverride = opts.appPathOverrides.filter(a => a.enabled).find(a => a.path === appPath);
        if (appPathOverride) { appPath = appPathOverride.override; }
        const appArgs: string = opts.addApp.launchCommand;
        const useWine: boolean = process.platform != 'win32' && appPath.endsWith('.exe');
        const gamePath: string = path.isAbsolute(appPath) ? fixSlashes(appPath) : fixSlashes(path.join(opts.fpPath, appPath));
        if (opts.parentGame.activeDataId && !child) {
          // If run from a game, game would already have done this!
          const gameData = await fpDatabase.findGameDataById(opts.parentGame.activeDataId);
          await handleGameDataParams(opts, serverOverride, gameData || undefined);
        }
        const launchInfo: LaunchInfo = {
          gamePath: gamePath,
          gameArgs: appArgs,
          useWine,
          env: getEnvironment(opts.fpPath, opts.proxy, opts.envPATH),
        };
        const proc = exec(
          createCommand(launchInfo),
          { env: launchInfo.env }
        );
        logProcessOutput(proc);
        log.info(logSource, `Launch Add-App "${opts.addApp.name}" (PID: ${proc.pid}) [ path: "${opts.addApp.applicationPath}", arg: "${opts.addApp.launchCommand}" ]`);
        return new Promise((resolve, reject) => {
          if (opts.addApp.waitForExit) {
            resolve();
          } else {
            if (proc.killed) { resolve(); }
            else {
              proc.once('exit', () => { resolve(); });
              proc.once('error', error => { reject(error); });
            }
          }
        });
      }
    }
  }

  /**
   * Launch a game
   *
   * @param opts Launch Opts
   * @param onWillEvent Fired with launch info before Game launches
   * @param curation Is a curation game
   * @param serverOverride Change active server for this game launch only
   */
  export async function launchGame(opts: LaunchGameOpts, onWillEvent: ApiEmitterFirable<GameLaunchInfo>, curation: boolean, serverOverride?: string): Promise<void> {
    await checkAndInstallPlatform(opts.game.detailedPlatforms!, opts.state, opts.openDialog);
    // Handle any special game data actions
    const gameData = !curation ? (opts.game.activeDataId ? await fpDatabase.findGameDataById(opts.game.activeDataId) : null) : null;
    // Run all provided additional applications with "AutoRunBefore" enabled
    if (opts.game.addApps) {
      const addAppOpts: Omit<LaunchAddAppOpts, 'addApp' | 'parentGame'> = {
        changeServer: opts.changeServer,
        fpPath: opts.fpPath,
        htdocsPath: opts.htdocsPath,
        dataPacksFolderPath: opts.dataPacksFolderPath,
        sevenZipPath: opts.sevenZipPath,
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
        runGame: opts.runGame,
        envPATH: opts.envPATH,
        state: opts.state,
        activeConfig: opts.activeConfig,
      };
      for (const addApp of opts.game.addApps) {
        if (addApp.autoRunBefore) {
          await launchAdditionalApplication({ ...addAppOpts, addApp, parentGame: opts.game }, curation);
        }
      }
    }
    // Launch game callback
    const launchCb = async (launchInfo: GameLaunchInfo): Promise<void> =>  {
      /**
       * Order
       * - API listeners
       * - Middleware
       * - Handle game data params
       */
      await onWillEvent.fire(launchInfo)
      .then(async () => {
        // Handle middleware
        if (launchInfo.activeConfig) {
          log.info(logSource, `Using Game Configuration: ${launchInfo.activeConfig.name}`);
          console.log(JSON.stringify(launchInfo.activeConfig, undefined, 2));
          for (const middlewareConfig of launchInfo.activeConfig.middleware) {
            // Find middleware in registry
            const middleware = opts.state.registry.middlewares.get(middlewareConfig.middlewareId);
            if (!middleware) {
              throw `Middleware not found (${middlewareConfig.middlewareId})`;
            }
            try {
              launchInfo = await Promise.resolve(middleware.execute(launchInfo, middlewareConfig));
            } catch (err) {
              throw `Failed to execute middleware (${middlewareConfig.middlewareId}) - ${err}`;
            }
            // @TODO - Validate launch info
          }
          log.info(logSource, 'Applied Game Configuration Successfully.');
        }
        await handleGameDataParams(opts, serverOverride, launchInfo.activeData ? launchInfo.activeData : undefined);
        const command: string = createCommand(launchInfo.launchInfo);
        const managedProc = opts.runGame(launchInfo);
        log.info(logSource,`Launch Game "${opts.game.title}" (PID: ${managedProc.getPid()}) [\n`+
                    `    applicationPath: "${launchInfo.launchInfo.gamePath}",\n`+
                    `    launchCommand:   "${metadataLaunchCommand}",\n`+
                    `    command:         "${command}" ]`);
      })
      .catch((error) => {
        log.info('Game Launcher', `Game Launch Aborted: ${error}`);
      });
    };
    // Launch game
    const metadataAppPath = gameData ? gameData.applicationPath : opts.game.legacyApplicationPath;
    const metadataLaunchCommand = gameData ? gameData.launchCommand : opts.game.legacyLaunchCommand;
    let appPath: string = getApplicationPath(metadataAppPath, opts.execMappings, opts.native);
    let appArgs: string[] = [];
    const appPathOverride = opts.appPathOverrides.filter(a => a.enabled).find(a => a.path === appPath);
    if (appPathOverride) { appPath = appPathOverride.override; }
    const availableApps = opts.providers.filter(p => p.provides.includes(appPath) || p.provides.includes(metadataAppPath));
    // If any available provided applications, check if any work.
    for (const app of availableApps) {
      try {
        const res = await app.callback(opts.game, metadataLaunchCommand);

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
          const env = getEnvironment(opts.fpPath, opts.proxy, opts.envPATH);
          if ('ELECTRON_RUN_AS_NODE' in env) {
            delete env['ELECTRON_RUN_AS_NODE']; // If this flag is present, it will disable electron features from the process
          }
          const browserLaunchArgs = [path.join(__dirname, '../main/index.js'), 'browser_mode=true'];
          if (res.proxy) { browserLaunchArgs.push(`proxy=${res.proxy}`); }
          browserLaunchArgs.push(`browser_url=${(res.url)}`);
          const gameLaunchInfo: GameLaunchInfo = {
            game: opts.game,
            activeData: gameData,
            launchInfo: {
              gamePath: process.execPath,
              gameArgs: browserLaunchArgs,
              useWine: false,
              env,
              cwd: getCwd(opts.isDev, opts.exePath),
              noshell: true,
            },
            activeConfig: opts.activeConfig,
          };
          await onWillEvent.fire(gameLaunchInfo)
          .then(() => {
            const managedProc = opts.runGame(gameLaunchInfo);
            log.info(logSource, `Launch Game "${opts.game.title}" (PID: ${managedProc.getPid()}) [\n`+
                      `    applicationPath: "${appPath}",\n`+
                      `    launchCommand:   "${metadataLaunchCommand}" ]`);
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
    const gamePath: string = path.isAbsolute(appPath) ? fixSlashes(appPath) : fixSlashes(path.join(opts.fpPath, appPath));
    const gameArgs: string[] = [...appArgs, metadataLaunchCommand];
    const useWine: boolean = process.platform != 'win32' && gamePath.endsWith('.exe');
    const env = getEnvironment(opts.fpPath, opts.proxy, opts.envPATH);
    try {
      // Double check game exists? Why are we doing this? TODO
      await fpDatabase.findGame(opts.game.id);
    } catch (err: any) {
      log.error('Launcher', 'Error Finding Game - ' + err.toString());
    }
    const gameLaunchInfo: GameLaunchInfo = {
      game: opts.game,
      activeData: gameData,
      launchInfo: {
        gamePath,
        gameArgs,
        useWine,
        env,
      },
      activeConfig: opts.activeConfig
    };
    await launchCb(gameLaunchInfo);
  }

  /**
   * Replaces an Application Path from the metadata with one appropriate for the operating system.
   *
   * @param filePath Application Path as provided in the metadata
   * @param execMappings Mappings of execs from execs.json
   * @param native Use application native to the users operating system, if possible
   */
  function getApplicationPath(filePath: string, execMappings: ExecMapping[], native: boolean): string {
    const platform = process.platform;

    // Bat files won't work on Wine, force a .sh file on non-Windows platforms instead. Sh File may not exist.
    if (platform !== 'win32' && filePath.endsWith('.bat')) {
      return filePath.substring(0, filePath.length - 4) + '.sh';
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
              } else {
                // Otherwise, use the wine binary (if configured.)
                return mapping.darwine || mapping.win32;
              }
            default:
              return filePath;
          }
        }
      }
    }

    // No Native exec found, return Windows/XML application path
    return filePath;
  }

  /**
   * Get an object containing the environment variables to use for the game / additional application.
   *
   * @param fpPath Path to Flashpoint Data Folder
   * @param proxy HTTP_PROXY environmental variable to add to env (For Linux / Mac)
   * @param path Override PATH environmental variable
   */
  function getEnvironment(fpPath: string, proxy: string, path?: string): NodeJS.ProcessEnv {
    let newEnvVars: NodeJS.ProcessEnv = {'FP_PATH': fpPath, 'PATH': path ?? process.env.PATH};
    // On Linux, we tell native applications to use Flashpoint's proxy using the HTTP_PROXY env var
    // On Windows, executables are patched to load the FlashpointProxy library
    // On Linux/Mac, WINE obeys the HTTP_PROXY env var so we can run unpatched Windows executables
    if (process.platform === 'linux' || process.platform === 'darwin') {
      // Add proxy env vars and prevent WINE from flooding the logs with debug messages
      newEnvVars = {
        ...newEnvVars, 'WINEDEBUG': 'fixme-all',
        ...(proxy !== '' ? {'http_proxy': `http://${proxy}/`, 'HTTP_PROXY': `http://${proxy}/`} : null)
      };
      // If WINE's bin directory exists in FPSoftware, add it to the PATH
      if (fs.existsSync(`${fpPath}/FPSoftware/Wine/bin`)) {
        newEnvVars = {
          ...newEnvVars, 'PATH': `${fpPath}/FPSoftware/Wine/bin:` + process.env.PATH
        }
      }
    }
    return {
      // Copy this processes environment variables
      ...process.env,
      ...newEnvVars
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
          return `wine start /wait /unix "${gamePath}" ${args.join(' ')}`;
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
 *
 * @param gameArgs Argument(s) to escape
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
 *
 * @param str String to escape
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
 *
 * @param str String to escape
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
 *
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

async function handleGameDataParams(opts: LaunchBaseOpts, serverOverride?: string, gameData?: GameData) {
  if (gameData) {
    const mountParams = minimist(gameData.parameters?.split(' ') ?? []);
    const extract = gameData.parameters?.startsWith('-extract') ?? false;
    const extractFile = mountParams['extracted'];
    const server = mountParams['server'];
    // Handle -extract param
    if (extract) {
      let alreadyExtracted = false;
      if (extractFile) {
        const filePath = path.join(opts.fpPath, opts.htdocsPath, extractFile);
        alreadyExtracted = fs.existsSync(filePath);
      }
      if (!alreadyExtracted) {
        // Extract game data to htdocs folder
        const gameDataPath = path.join(opts.fpPath, opts.dataPacksFolderPath, getGameDataFilename(gameData) || '');
        const tempPath = path.join(opts.fpPath, '.temp', 'extract');
        await fs.ensureDir(tempPath);
        const destPath = path.join(opts.fpPath, opts.htdocsPath);
        log.debug('Launcher', `Extracting game data from "${gameDataPath}" to "${tempPath}"`);
        await extractFullPromise([gameDataPath, tempPath, { $bin: opts.sevenZipPath }])
        .catch((err) => {
          console.log(err);
          log.error('Launcher', `Failed to extract game data: ${err}`);
          throw err;
        });
        const contentFolder = path.join(tempPath, 'content');
        // Move contents of contentFolder to destPath
        log.debug('Launcher', `Moving extracted game data from "${contentFolder}" to "${destPath}"`);
        for (const file of await fs.readdir(contentFolder)) {
          await fs.move(path.join(contentFolder, file), path.join(destPath, file), { overwrite: true });
        }
        // Remove temp dir
        await fs.remove(tempPath);
      } else {
        log.debug('Launcher', 'Game data already extracted, skipping...');
      }
    }
    // Use -server param if present
    await opts.changeServer(server || serverOverride);
  } else {
    // Ignore default server switch if launching curation
    await opts.changeServer(serverOverride);
  }
}

export async function checkAndInstallPlatform(platforms: Platform[], state: BackState, openMessageBox: ShowMessageBoxFunc) {
  const compsToInstall: ComponentStatus[] = [];
  for (const platform of platforms) {
    const compIdx = state.componentStatuses.findIndex(c => c.name.toLowerCase() === platform.name.toLowerCase());
    if (compIdx > -1) {
      if (state.componentStatuses[compIdx].state === ComponentState.UNINSTALLED) {
        compsToInstall.push(state.componentStatuses[compIdx]);
      }
    } else {
      log.warn('Launcher', `No components found for ${platform.name}, assuming none required.`);
    }
  }
  if (compsToInstall.length > 0) {
    const platformText = compsToInstall.length > 1 ?
      formatString(state.languageContainer.dialog.requiresAdditionalDownloadPlural, compsToInstall.length.toString()) :
      formatString(state.languageContainer.dialog.requiresAdditionalDownload, compsToInstall[0].name);
    const dialogId = await openMessageBox({
      largeMessage: true,
      message: platformText as string,
      cancelId: 1,
      buttons: ['Yes', 'No']
    });
    const res = (await awaitDialog(state, dialogId)).buttonIdx;
    if (res === 1) {
      throw 'User aborted game launch (denied required component download)';
    } else {
      // Create dialog to cover screen
      const template: DialogStateTemplate = {
        largeMessage: true,
        message: 'Downloading Required Components...',
        buttons: []
      };
      const dialogId = await createNewDialog(state, template);
      // Run process to download components
      await new Promise<void>((resolve, reject) => {
        const cwd = path.join(state.config.flashpointPath, 'Manager');
        const fpmPath = 'FlashpointManager.exe';
        child_process.execFile(fpmPath, ['/notemp', '/download', compsToInstall.map(c => c.id).join(' ')], { cwd }, (error, stdout, stderr) => {
          log.debug('FP Manager', stdout);
          if (error) {
            reject(error);
            return;
          } else {
            resolve();
          }
        });
      })
      .then(() => {
        for (const comp of compsToInstall) {
          const idx = state.componentStatuses.findIndex(c => c.id === comp.id);
          if (idx > -1) {
            state.componentStatuses[idx].state = ComponentState.UP_TO_DATE;
          }
        }
        state.socketServer.broadcast(BackOut.UPDATE_COMPONENT_STATUSES, state.componentStatuses);
      })
      .finally(() => {
        // Close downloading dialog
        state.socketServer.broadcast(BackOut.CANCEL_DIALOG, dialogId);
      });
    }
  }
}
