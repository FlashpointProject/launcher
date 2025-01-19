import { ManagedChildProcess, ProcessOpts } from '@back/ManagedChildProcess';
import { SocketServer } from '@back/SocketServer';
import { SERVICES_SOURCE } from '@back/constants';
import { createTagsFromLegacy } from '@back/importGame';
import { exitApp } from '@back/responses';
import { BackState, ShowMessageBoxFunc, ShowOpenDialogFunc, ShowSaveDialogFunc, StatusState } from '@back/types';
import { deepCopy, recursiveReplace, stringifyArray } from '@shared/Util';
import { BackOut, ComponentState } from '@shared/back/types';
import { PlatformAppPath, PlatformAppPathSuggestions } from '@shared/curate/types';
import { getCurationFolder } from '@shared/curate/util';
import { BrowserApplicationOpts } from '@shared/extensions/interfaces';
import { IBackProcessInfo, INamedBackProcessInfo, IService, ProcessState } from '@shared/interfaces';
import { LangContainer, LangFile, autoCode, getDefaultLocalization } from '@shared/lang';
import { Legacy_IAdditionalApplicationInfo, Legacy_IGameInfo } from '@shared/legacy/interfaces';
import { newGame } from '@shared/utils/misc';
import * as child_process from 'child_process';
import { AdditionalApp, Game, Tag } from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as kill from 'tree-kill';
import { promisify } from 'util';
import { uuid } from './uuid';

const unlink = promisify(fs.unlink);

export function pathExists(filePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, error => {
      if (error) {
        if (error.code === 'ENOENT') { resolve(false); }
        else { reject(error); }
      } else { resolve(true); }
    });
  });
}

export type ErrorCopy = {
  columnNumber?: number;
  fileName?: string;
  lineNumber?: number;
  message: string;
  name: string;
  stack?: string;
}

/**
 * Copy properties from an error to a new object.
 *
 * @param error Error to copy
 */
export function copyError(error: any): ErrorCopy {
  if (typeof error !== 'object' || error === null) { error = {}; }
  const copy: ErrorCopy = {
    message: error.message+'',
    name: error.name+'',
  };
  // @TODO These properties are not standard, and perhaps they have different types in different environments.
  //       So do some testing and add some extra checks mby?
  if (typeof error.columnNumber === 'number') { copy.columnNumber = error.columnNumber; }
  if (typeof error.fileName     === 'string') { copy.fileName     = error.fileName;     }
  if (typeof error.lineNumber   === 'number') { copy.lineNumber   = error.lineNumber;   }
  if (typeof error.stack        === 'string') { copy.stack        = error.stack;        }
  return copy;
}

export function procToService(proc: ManagedChildProcess): IService {
  return {
    id: proc.id,
    name: proc.name,
    state: proc.getState(),
    pid: proc.getPid(),
    startTime: proc.getStartTime(),
    info: proc.info,
  };
}

const defaultLang = getDefaultLocalization();
export function createContainer(languages: LangFile[], currentCode: string, autoLangCode: string, fallbackCode: string): LangContainer {
  // Get current language
  let current: LangFile | undefined;
  if (currentCode !== autoCode) { // (Specific language)
    current = languages.find(item => item.code === currentCode);
  }
  if (!current) { // (Auto language)
    current = languages.find(item => item.code === autoLangCode);
    if (!current) { current = languages.find(item => item.code.startsWith(autoLangCode.substring(0, 2))); }
  }
  // Get fallback language
  const fallback = (
    languages.find(item => item.code === fallbackCode) || // (Exact match)
    languages.find(item => item.code.startsWith(fallbackCode.substring(0, 2))) // (Same language)
  );
  // Combine all language container objects (by overwriting the default with the fallback and the current)
  const data = recursiveReplace(recursiveReplace(deepCopy(defaultLang), fallback && fallback.data), current && current.data);
  data.libraries = { // Allow libraries to add new properties (and not just overwrite the default)
    ...data.libraries,
    ...(fallback && fallback.data && fallback.data.libraries),
    ...(current && current.data && current.data.libraries)
  };
  data.upgrades = { // Allow upgrades to add new properties (and not just overwrite the default)
    ...data.upgrades,
    ...(fallback && fallback.data && fallback.data.upgrades),
    ...(current && current.data && current.data.upgrades)
  };
  return data;
}

/**
 * Exit the back process cleanly.
 *
 * @param state Current back state
 * @param beforeProcessExit Function to call right before process exits
 */
export async function exit(state: BackState, beforeProcessExit?: () => void | Promise<void>): Promise<void> {
  if (!state.isExit) {
    state.isExit = true;
    console.log('Exiting...');
    // Unload all extensions before quitting
    await state.extensionsService.unloadAll();
    console.log(' - Extensions Unloaded');

    if (state.serviceInfo) {
      // Kill services
      for (const service of state.services.values()) {
        if (service.info.kill) {
          // Kill with 10s timeout
          await Promise.race([
            service.kill(),
            new Promise(resolve => {
              setTimeout((resolve), 10000);
            })
          ]);
          if (!('name' in service.info)) {
            console.log(` - Killed '${service.info.filename}' Service`);
          } else {
            console.log(` - Killed '${service.info.name}' Service`);
          }
        }
      }
      console.log(' - Managed Services Killed');
      // Run stop commands
      for (let i = 0; i < state.serviceInfo.stop.length; i++) {
        execProcess(state, state.serviceInfo.stop[i], true);
      }
      console.log(' - Service Info Stop Commands Run');
    }

    state.languageWatcher.abort();
    for (const watcher of state.themeState.watchers) {
      watcher.abort();
    }
    console.log(' - Watchers Aborted');

    await Promise.all([
      // Close file server
      new Promise<void>(resolve => state.fileServer.close(error => {
        if (error) { console.warn('An error occurred while closing the file server.', error); }
        resolve();
      })).then(() => {
        console.log(' - File Server Closed');
      }),
      // Wait for preferences writes to complete
      state.prefsQueue.push(() => {}, true),
      // Abort saving on demand images
      (async () => {
        state.fileServerDownloads.queue.length = 0; // Clear array
        const current = state.fileServerDownloads.current.splice(0); // Copy & clear array
        for (let i = 0; i < current.length; i++) { // Delete all partial files
          const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
          const filePath = path.join(imageFolder, current[i].subPath);

          try {
            await unlink(filePath);
          } catch (error: any) {
            if (error.code !== 'ENOENT') { console.error(`Failed to delete partially downloaded image file (path: "${current[i].subPath}").`, error); }
          }
        }
      })(),
    ]).then(async () => {
      console.log(' - Cleanup Complete, Exiting Process...');
      if (beforeProcessExit) {
        console.log(' - Executing callback before process exit...');
        await Promise.resolve(beforeProcessExit());
      }
      await state.socketServer.broadcast(BackOut.QUIT);
      console.log(' - Quit Broadcast Sent');
      // Close WebSocket server
      state.socketServer.close()
      .catch(e => { console.error(e); });

      await new Promise<void>((resolve, reject) => {
        kill(process.pid, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      // Kill the parent process.
      process.kill(process.pid);
      process.exit(0);
    });
  }
}

export async function execProcess(state: BackState, proc: IBackProcessInfo, sync?: boolean): Promise<void> {
  const cwd: string = path.join(state.config.flashpointPath, proc.path);
  log.info(SERVICES_SOURCE, `Executing "${proc.filename}" ${stringifyArray(proc.arguments)} in "${proc.path}"`);
  try {
    if (sync) { child_process.execFileSync(  proc.filename, proc.arguments, { cwd: cwd }); }
    else      { await child_process.execFile(proc.filename, proc.arguments, { cwd: cwd }); }
  } catch (error) {
    log.error(SERVICES_SOURCE, `An unexpected error occurred while executing a command:\n  "${error}"`);
  }
}

export function createAddAppFromLegacy(addApps: Legacy_IAdditionalApplicationInfo[], game: Game): AdditionalApp[] {
  return addApps.map(a => {
    return {
      id: a.id,
      name: a.name,
      applicationPath: a.applicationPath,
      launchCommand: a.launchCommand,
      autoRunBefore: a.autoRunBefore,
      waitForExit: a.waitForExit,
      parentGame: game,
      parentGameId: game.id,
    };
  });
}

export async function createGameFromLegacy(game: Legacy_IGameInfo, tagCache: Record<string, Tag>): Promise<Game> {
  const nGame = newGame();
  Object.assign(nGame, {
    id: game.id,
    parentGameId: game.id,
    title: game.title,
    alternateTitles: game.alternateTitles,
    series: game.series,
    developer: game.developer,
    publisher: game.publisher,
    platform: game.platform,
    dateAdded: game.dateAdded,
    dateModified: game.dateAdded,
    broken: game.broken,
    extreme: game.extreme,
    playMode: game.playMode,
    status: game.status,
    notes: game.notes,
    tags: await createTagsFromLegacy(game.tags, tagCache),
    source: game.source,
    applicationPath: game.applicationPath,
    launchCommand: game.launchCommand,
    releaseDate: game.releaseDate,
    version: game.version,
    originalDescription: game.originalDescription,
    language: game.language,
    library: game.library,
    orderTitle: game.orderTitle,
    placeholder: false,
    addApps: [],
    activeDataOnDisk: false
  });
  return nGame;
}

export function runService(state: BackState, id: string, name: string, basePath: string, opts: ProcessOpts, info: INamedBackProcessInfo | IBackProcessInfo): ManagedChildProcess {
  // Already exists, bad!
  if (state.services.has(id)) {
    throw new Error(`Service already running! (ID: "${id}")`);
  }
  const proc = new ManagedChildProcess(
    id,
    name,
    opts.cwd || path.join(basePath, info.path),
    opts,
    info
  );
  state.services.set(id, proc);
  proc.on('output', (entry) => { log.info(entry.source, entry.content); });
  proc.on('change', () => {
    state.socketServer.broadcast(BackOut.SERVICE_CHANGE, procToService(proc));
  });
  try {
    proc.spawn();
  } catch (error) {
    log.error(SERVICES_SOURCE, `An unexpected error occurred while trying to run the background process "${proc.name}".` +
              `  ${(error as Error).toString()}`);
  }
  state.apiEmitters.services.onServiceNew.fire(proc);
  return proc;
}

export async function removeService(state: BackState, processId: string): Promise<void> {
  const service = state.services.get(processId);
  if (service) {
    await waitForServiceDeath(service);
    state.services.delete(processId);
    state.apiEmitters.services.onServiceRemove.fire(service);
    state.socketServer.broadcast(BackOut.SERVICE_REMOVED, processId);
  }
}

export async function waitForServiceDeath(service: ManagedChildProcess) : Promise<void> {
  if (service.getState() !== ProcessState.STOPPED) {
    return new Promise((resolve) => {
      service.on('change', onChange);
      service.kill();

      function onChange() {
        if (service.getState() === ProcessState.STOPPED) {
          service.off('change', onChange);
          resolve();
        }
      }
    });
  }
}

export function setStatus<T extends keyof StatusState>(state: BackState, key: T, val: StatusState[T]): void {
  switch (key) {
    case 'devConsole':
      state.socketServer.broadcast(BackOut.DEV_CONSOLE_CHANGE, val);
      break;
  }
}

export function getOpenMessageBoxFunc(state: BackState): ShowMessageBoxFunc | undefined {
  if (state.socketServer.lastClient) {
    return state.socketServer.showMessageBoxBack(state, state.socketServer.lastClient);
  }
}

export function getOpenSaveDialogFunc(socketServer: SocketServer): ShowSaveDialogFunc | undefined {
  if (socketServer.lastClient) {
    return socketServer.showSaveDialogBack(socketServer.lastClient);
  }
}

export function getOpenOpenDialogFunc(socketServer: SocketServer): ShowOpenDialogFunc | undefined {
  if (socketServer.lastClient) {
    return socketServer.showOpenDialogFunc(socketServer.lastClient);
  }
}

export function isBrowserOpts(val: any): val is BrowserApplicationOpts {
  return typeof val.url === 'string' &&
   (val.proxy === undefined || typeof val.proxy === 'string');
}

/**
 * Converts a date to a filename safe string in the form YYYY-MM-DD_HH-MM-SS
 *
 * @param date Date to convert
 */
export function dateToFilenameString(date: Date): string {
  const padFour = (num: number) => { return `${num}`.padStart(4,'0'); };
  const padTwo = (num: number) => { return `${num}`.padStart(2,'0'); };
  return `${padFour(date.getFullYear())}-${padTwo(date.getMonth())}-${padTwo(date.getDay())}_${padTwo(date.getHours())}-${padTwo(date.getMinutes())}-${padTwo(date.getSeconds())}`;
}

export async function deleteCuration(state: BackState, folder: string) {
  const curationIdx = state.loadedCurations.findIndex(c => c.folder === folder);
  if (curationIdx !== -1) {
    const curationPath = getCurationFolder(state.loadedCurations[curationIdx], state.config.flashpointPath);
    await fs.remove(curationPath);
    state.loadedCurations.splice(curationIdx, 1);
    state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, undefined, [folder]);
  }
}

export function getCwd(isDev: boolean, exePath: string) {
  return isDev ? process.cwd() : process.platform == 'darwin' ? path.resolve(path.dirname(exePath), '..') : path.dirname(exePath);
}

export async function getTempFilename(ext = 'tmp') {
  let tempDir;
  try {
    tempDir = await fs.promises.realpath(os.tmpdir());
  } catch {
    tempDir = os.tmpdir();
  }
  return path.join(tempDir, uuid() + '.' + ext);
}

/**
 * Gets the default shell's configured PATH on MacOS
 *
 * @param shell Override and use this shell instead of the user's default shell.
 * @returns The user's PATH in that shell.
 */
export async function getMacPATH(shell?: string): Promise<string> {
  // If we weren't given a shell override, detect the user's default shell.
  if (!shell) {
    // Read the user's shell using dscl. No clue how it works, deal with it.
    const shellDetector = child_process.spawn('dscl', ['.', '-read', os.homedir(), 'UserShell'], {
      shell: false
    });
    // Get the full output and wait for the process to exit.
    let builder = '';
    shellDetector.stdout.on('data', (chunk) => {
      builder += chunk;
    });
    await new Promise<void>(resolve => {
      shellDetector.on('exit', () => {
        resolve();
      });
    });
    // Look for a known shell in the output.
    for (const option of ['bash', 'zsh', 'ksh', 'tcsh', 'csh']) {
      const matchresult = builder.match(new RegExp('/.*' + option));
      if (matchresult) {
        shell = matchresult[0];
        break;
      }
    }
  }
  // Default to bash if none of the other shells are found.
  shell = shell ?? '/bin/bash';
  const spawnOpts: child_process.SpawnOptionsWithoutStdio = {
    shell: false
  };
  // Different shells require different arguments to start in "login" (profile-reading) mode.
  const loginArgs = [];
  switch (shell.slice(shell.lastIndexOf('/') + 1)) {
    case 'bash':
    case 'zsh':
    case 'ksh':
      loginArgs.push('-i', '-l');
      break;
    case 'tcsh':
    case 'csh':
      loginArgs.push('-i');
      spawnOpts.argv0 = '-' + shell.slice(shell.lastIndexOf('/') + 1);
      break;
  }
  // Run the shell, tell it to echo $PATH when it's done with init.
  const pathDetector = child_process.spawn(shell, [...loginArgs, '-c', 'echo $PATH'], spawnOpts);
  // Get the full output and wait for the process to exit.
  let builder = '';
  pathDetector.stdout.on('data', (chunk) => {
    builder += chunk;
  });
  await new Promise<void>(resolve => {
    pathDetector.on('exit', () => {
      resolve();
    });
  });
  // Trim any whitespace, etc.
  return builder.trim();
}

export function openFlashpointManager(state: BackState): void {
  const cwd = path.join(state.config.flashpointPath, 'Manager');
  const fpmPath = 'FlashpointManager.exe';
  const updatesReady = state.componentStatuses.filter(c => c.state === ComponentState.NEEDS_UPDATE).length > 0;
  exitApp(state, async () => {
    const args = updatesReady ? ['/update', '/launcher'] : ['/launcher'];
    const child = child_process.spawn(fpmPath, args, { detached: true, cwd, stdio: ['ignore', 'ignore', 'ignore'] });
    child.unref();
  });
}

export function compareSemVerVersions(v1: string, v2: string): number {
  const v1Parts = v1.split('.').map(part => parseInt(part));
  const v2Parts = v2.split('.').map(part => parseInt(part));

  // Compare Major versions
  if (v1Parts[0] !== v2Parts[0]) {
    return v1Parts[0] - v2Parts[0];
  }

  // Compare Minor versions, handling missing Minor versions
  const v1Minor = v1Parts.length > 1 ? v1Parts[1] : 0;
  const v2Minor = v2Parts.length > 1 ? v2Parts[1] : 0;
  if (v1Minor !== v2Minor) {
    return v1Minor - v2Minor;
  }

  // Compare Patch versions, handling missing Patch versions
  const v1Patch = v1Parts.length > 2 ? v1Parts[2] : 0;
  const v2Patch = v2Parts.length > 2 ? v2Parts[2] : 0;
  if (v1Patch !== v2Patch) {
    return v1Patch - v2Patch;
  }

  // Versions are equal
  return 0;
}

export async function promiseSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function processPlatformAppPaths(suggs: PlatformAppPathSuggestions): PlatformAppPathSuggestions {
  const newSuggs: PlatformAppPathSuggestions = {};

  for (const platform of Object.keys(suggs)) {
    // For each platform group, process and remove duplicates
    const group: PlatformAppPath[] = [];
    const exists: string[] = [];

    for (const value of suggs[platform]) {
      const processedValue = value.appPath
      .toLowerCase() // Lower case
      .replace(/\//g, '\\'); // Fix slashes

      if (exists.includes(processedValue)) {
        continue; // Skip adding to group if processed value already seen
      }

      exists.push(processedValue);
      group.push(value);
    }

    newSuggs[platform] = group;
  }

  return newSuggs;
}
