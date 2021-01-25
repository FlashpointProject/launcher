import { SERVICES_SOURCE } from '@back/constants';
import { createTagsFromLegacy } from '@back/importGame';
import { ManagedChildProcess, ProcessOpts } from '@back/ManagedChildProcess';
import { SocketServer } from '@back/SocketServer';
import { BackState, ShowMessageBoxFunc, ShowOpenDialogFunc, ShowSaveDialogFunc, StatusState } from '@back/types';
import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { Tag } from '@database/entity/Tag';
import { BackOut } from '@shared/back/types';
import { BrowserApplicationOpts } from '@shared/extensions/interfaces';
import { IBackProcessInfo, INamedBackProcessInfo, IService, ProcessState } from '@shared/interfaces';
import { autoCode, getDefaultLocalization, LangContainer, LangFile } from '@shared/lang';
import { Legacy_IAdditionalApplicationInfo, Legacy_IGameInfo } from '@shared/legacy/interfaces';
import { deepCopy, recursiveReplace, stringifyArray } from '@shared/Util';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
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

/** Copy properties from an error to a new object. */
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
    if (!current) { current = languages.find(item => item.code.startsWith(autoLangCode.substr(0, 2))); }
  }
  // Get fallback language
  const fallback = (
    languages.find(item => item.code === fallbackCode) || // (Exact match)
    languages.find(item => item.code.startsWith(fallbackCode.substr(0, 2))) // (Same language)
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

/** Exit the back process cleanly. */
export function exit(state: BackState): void {
  if (!state.isExit) {
    state.isExit = true;

    if (state.serviceInfo) {
      // Kill services
      for (const service of state.services.values()) {
        if (service.info.kill) {
          service.kill();
        }
      }
      // Run stop commands
      for (let i = 0; i < state.serviceInfo.stop.length; i++) {
        execProcess(state, state.serviceInfo.stop[i], true);
      }
    }

    state.languageWatcher.abort();
    for (const watcher of state.themeState.watchers) {
      watcher.abort();
    }

    Promise.all([
      // Close WebSocket server
      state.socketServer.close()
      .catch(e => { console.error(e); }),
      // Close file server
      new Promise(resolve => state.fileServer.close(error => {
        if (error) { console.warn('An error occurred while closing the file server.', error); }
        resolve();
      })),
      // Wait for game manager to complete all saves
      state.gameManager.saveQueue.push(() => {}, true),
      // Abort saving on demand images
      (async () => {
        state.fileServerDownloads.queue.length = 0; // Clear array
        const current = state.fileServerDownloads.current.splice(0); // Copy & clear array
        for (let i = 0; i < current.length; i++) { // Delete all partial files
          const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
          const filePath = path.join(imageFolder, current[i].subPath);

          try {
            await unlink(filePath);
          } catch (error) {
            if (error.code !== 'ENOENT') { console.error(`Failed to delete partially downloaded image file (path: "${current[i].subPath}").`, error); }
          }
        }
      })(),
    ]).then(() => { process.exit(); });
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
      parentGame: game
    };
  });
}

export async function createGameFromLegacy(game: Legacy_IGameInfo, tagCache: Record<string, Tag>): Promise<Game> {
  return {
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
    addApps: []
  };
}

export function createPlaylistFromJson(jsonData: any, library?: string): Playlist {
  const playlist: Playlist = {
    id: jsonData['id'] || uuid(),
    title: jsonData['title'] || 'No Name',
    description: jsonData['description'] || '',
    author: jsonData['author'] || '',
    icon: jsonData['icon'] || '',
    library: library || jsonData['library'] || 'arcade',
    games: [],
    extreme: jsonData['extreme'] || false
  };

  for (let i = 0; i < jsonData['games'].length ; i++) {
    const game = jsonData['games'][i];
    playlist.games.push({
      playlistId: playlist.id,
      order: game['order'] ? Number(game['order']) : i,
      notes: game['notes'] || '',
      gameId: game['gameId'] || game['id']
    });
  }

  return playlist;
}


export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
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
              `  ${error.toString()}`);
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
    return new Promise(resolve => {
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

export function getOpenMessageBoxFunc(socketServer: SocketServer): ShowMessageBoxFunc | undefined {
  if (socketServer.lastClient) {
    return socketServer.showMessageBoxBack(socketServer.lastClient);
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
