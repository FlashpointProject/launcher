import { SERVICES_SOURCE } from '@back/constants';
import { ManagedChildProcess } from '@back/ManagedChildProcess';
import { BackState } from '@back/types';
import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { BackOut } from '@shared/back/types';
import { IBackProcessInfo, IService } from '@shared/interfaces';
import { autoCode, getDefaultLocalization, LangContainer, LangFile } from '@shared/lang';
import { Legacy_IAdditionalApplicationInfo, Legacy_IGameInfo } from '@shared/legacy/interfaces';
import { ILogEntry, ILogPreEntry } from '@shared/Log/interface';
import { deepCopy, recursiveReplace, stringifyArray } from '@shared/Util';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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
      if (state.services.server && state.serviceInfo.server && state.serviceInfo.server.kill) {
        state.services.server.kill();
      }
      if (state.services.redirector) {
        const doKill: boolean = !!(
          state.config.useFiddler
            ? state.serviceInfo.fiddler    && state.serviceInfo.fiddler.kill
            : state.serviceInfo.redirector && state.serviceInfo.redirector.kill
        );
        if (doKill) { state.services.redirector.kill(); }
      }
      // Run stop commands
      for (let i = 0; i < state.serviceInfo.stop.length; i++) {
        execProcess(state, state.serviceInfo.stop[i], true);
      }
    }

    state.languageWatcher.abort();
    state.themeWatcher.abort();

    Promise.all([
      // Close WebSocket server
      state.socketServer.close()
      .catch(e => { console.error(e); }),
      // Close file server
      new Promise(resolve => state.fileServer.close(error => {
        if (error) { console.warn('An error occurred whie closing the file server.', error); }
        resolve();
      })),
      // Wait for game manager to complete all saves
      state.gameManager.saveQueue.push(() => {}, true),
    ]).then(() => { process.exit(); });
  }
}

export function log(state: BackState, preEntry: ILogPreEntry, id?: string): void {
  const entry: ILogEntry = {
    source: preEntry.source,
    content: preEntry.content,
    timestamp: Date.now(),
  };

  if (typeof entry.source !== 'string') {
    console.warn(`Type Warning! A log entry has a source of an incorrect type!\n  Type: "${typeof entry.source}"\n  Value: "${entry.source}"`);
    entry.source = entry.source+'';
  }
  if (typeof entry.content !== 'string') {
    console.warn(`Type Warning! A log entry has content of an incorrect type!\n  Type: "${typeof entry.content}"\n  Value: "${entry.content}"`);
    entry.content = entry.content+'';
  }

  state.log.push(entry);

  state.socketServer.broadcast({
    id: id || '',
    type: BackOut.LOG_ENTRY_ADDED,
    data: {
      entry,
      index: state.log.length - 1,
    }
  });
}

export async function execProcess(state: BackState, proc: IBackProcessInfo, sync?: boolean): Promise<void> {
  const cwd: string = path.join(state.config.flashpointPath, proc.path);
  log(state, {
    source: SERVICES_SOURCE,
    content: `Executing "${proc.filename}" ${stringifyArray(proc.arguments)} in "${proc.path}"`,
  });
  try {
    if (sync) { child_process.execFileSync(  proc.filename, proc.arguments, { cwd: cwd }); }
    else      { await child_process.execFile(proc.filename, proc.arguments, { cwd: cwd }); }
  } catch (error) {
    log(state, {
      source: SERVICES_SOURCE,
      content: `An unexpected error occurred while executing a command:\n  "${error}"`,
    });
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

export function createGameFromLegacy(game: Legacy_IGameInfo): Game {
  return {
    id: game.id,
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
    tags: game.tags,
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