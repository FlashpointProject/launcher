import { EXT_CONFIG_FILENAME, PREFERENCES_FILENAME } from '@back/constants';
import { loadCurationIndexImage } from '@back/curate/parse';
import { duplicateCuration, genCurationWarnings } from '@back/curate/util';
import { saveCuration } from '@back/curate/write';
import { ExtConfigFile } from '@back/ExtConfigFile';
import * as GameDataManager from '@back/game/GameDataManager';
import * as GameManager from '@back/game/GameManager';
import * as TagManager from '@back/game/TagManager';
import { DisposableChildProcess, ManagedChildProcess } from '@back/ManagedChildProcess';
import { genContentTree } from '@back/rust';
import { BackState, StatusState } from '@back/types';
import { clearDisposable, dispose, newDisposable, registerDisposable } from '@back/util/lifecycle';
import { addPlaylistGame, deletePlaylist, deletePlaylistGame, filterPlaylists, findPlaylist, findPlaylistByName, getPlaylistGame, savePlaylistGame, updatePlaylist } from '../playlist';
import {
  deleteCuration,
  getOpenMessageBoxFunc,
  getOpenOpenDialogFunc,
  getOpenSaveDialogFunc,
  removeService,
  runService,
  setStatus
} from '@back/util/misc';
import { pathTo7zBack } from '@back/util/SevenZip';
import { Game } from '@database/entity/Game';
import { BackOut } from '@shared/back/types';
import { BrowsePageLayout } from '@shared/BrowsePageLayout';
import { CURATIONS_FOLDER_WORKING } from '@shared/constants';
import { CurationMeta, LoadedCuration } from '@shared/curate/types';
import { getContentFolderByKey } from '@shared/curate/util';
import { CurationTemplate, IExtensionManifest } from '@shared/extensions/interfaces';
import { ProcessState, Task } from '@shared/interfaces';
import { ILogEntry, LogLevel } from '@shared/Log/interface';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { overwritePreferenceData } from '@shared/preferences/util';
import { formatString } from '@shared/utils/StringFormatter';
import * as flashpoint from 'flashpoint-launcher';
import * as fs from 'fs';
import { extractFull } from 'node-7z';
import * as path from 'path';
import { loadCurationArchive } from '..';
import { newExtLog } from './ExtensionUtils';
import { Command } from './types';
import uuid = require('uuid');
import { awaitDialog } from '@back/util/dialog';

/**
 * Create a Flashpoint API implementation specific to an extension, used during module load interception
 *
 * @param extId Extension ID
 * @param extManifest Manifest of the caller
 * @param addExtLog Function to add an Extensions log to the Logs page
 * @param version Version of the Flashpoint Launcher
 * @param state Back State
 * @param extPath Folder Path to the Extension
 * @returns API Implementation specific to the caller
 */
export function createApiFactory(extId: string, extManifest: IExtensionManifest, addExtLog: (log: ILogEntry) => void, version: string, state: BackState, extPath?: string): typeof flashpoint {
  const { registry, apiEmitters } = state;

  const getPreferences = () => state.preferences;
  const extOverwritePreferenceData = async (
    data: flashpoint.DeepPartial<flashpoint.AppPreferencesData>,
    onError?: (error: string) => void
  ) => {
    overwritePreferenceData(state.preferences, data, onError);
    await PreferencesFile.saveFile(path.join(state.configFolder, PREFERENCES_FILENAME), state.preferences);
    state.socketServer.broadcast(BackOut.UPDATE_PREFERENCES_RESPONSE, state.preferences);
    return state.preferences;
  };

  const unload = () => state.extensionsService.unloadExtension(extId);

  const getExtensionFileURL = (filePath: string): string => {
    return `http://localhost:${state.fileServerPort}/extdata/${extId}/${filePath}`;
  };

  const unzipFile = (filePath: string, outDir: string, opts?: flashpoint.ZipExtractOptions): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const { onProgress, onData } = opts || {};
      const readable = extractFull(filePath, outDir, { $bin: pathTo7zBack(state.isDev, state.exePath), $progress: onProgress !== undefined });
      readable.on('end', () => {
        resolve();
      });
      if (onProgress) { readable.on('progress', onProgress); }
      if (onData) { readable.on('data', onData); }
      readable.on('error', (err) => {
        reject(err);
      });
    });
  };

  const getExtConfigValue = (key: string): any => {
    return state.extConfig[key];
  };

  const setExtConfigValue = async (key: string, value: any): Promise<void> => {
    state.extConfig[key] = value;
    await ExtConfigFile.saveFile(path.join(state.config.flashpointPath, EXT_CONFIG_FILENAME), state.extConfig);
    state.socketServer.broadcast(BackOut.UPDATE_EXT_CONFIG_DATA, state.extConfig);
  };

  const focusWindow = () => {
    state.socketServer.broadcast(BackOut.FOCUS_WINDOW);
  };

  // Log Namespace
  const extLog: typeof flashpoint.log = {
    trace: (message: string) => addExtLog(newExtLog(extManifest, message, log.trace)),
    debug: (message: string) => addExtLog(newExtLog(extManifest, message, log.debug)),
    info:  (message: string) => addExtLog(newExtLog(extManifest, message, log.info)),
    warn:  (message: string) => addExtLog(newExtLog(extManifest, message, log.warn)),
    error: (message: string) => addExtLog(newExtLog(extManifest, message, log.error)),
    onLog: state.apiEmitters.onLog.event,
  };

  // Commands Namespace
  const extCommands: typeof flashpoint.commands = {
    registerCommand: (command: string, callback: <T>(...args: any[]) => T | Promise<T>) => {
      const c: Command = {
        command: command,
        callback: callback,
        ...newDisposable(() => {
          // Unregister command when disposed
          registry.commands.delete(command);
        })
      };
      // Error if command is about to be overridden
      if (registry.commands.has(command)) {
        throw new Error(`Could not register "${command}" because it already exists!`);
      }
      // Register command
      registry.commands.set(command, c);
      log.debug('Extensions', `[${extManifest.displayName || extManifest.name}] Registered Command "${command}"`);
      return c;
    }
  };

  const extGames: typeof flashpoint.games = {
    // Platforms
    findPlatformByName: (name) => TagManager.findPlatform(name),
    // Playlists
    findPlaylist: (playlistId) => findPlaylist(state, playlistId),
    findPlaylistByName: (playlistName) => findPlaylistByName(state, playlistName),
    findPlaylists: (showExtreme) => filterPlaylists(state.playlists, showExtreme),
    updatePlaylist: async (playlist) => {
      const oldPlaylist = state.playlists.find(p => p.id === playlist.id);
      if (oldPlaylist) {
        await updatePlaylist(state, oldPlaylist, playlist);
        return playlist;
      } else {
        throw 'Playlist does not exist';
      }
    },
    removePlaylist: (playlistId) => deletePlaylist(state, playlistId),
    addPlaylistGame: (playlistId, gameId) => addPlaylistGame(state, playlistId, gameId),

    // Playlist Game
    findPlaylistGame: (playlistId, gameId) => getPlaylistGame(state, playlistId, gameId),
    removePlaylistGame: (playlistId, gameId) => deletePlaylistGame(state, playlistId, gameId),
    updatePlaylistGame: (playlistId, playlistGame) => savePlaylistGame(state, playlistId, playlistGame),

    // Games
    countGames: GameManager.countGames,
    findGame: GameManager.findGame,
    findGames: GameManager.findGames,
    findGamesWithTag: GameManager.findGamesWithTag,
    updateGame: GameManager.save,
    updateGames: GameManager.updateGames,
    removeGameAndAddApps: (gameId: string) => GameManager.removeGameAndAddApps(gameId,
      path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath),
      path.join(state.config.flashpointPath, state.preferences.imageFolderPath)),
    isGameExtreme: (game: Game) => {
      const extremeTags = state.preferences.tagFilters.filter(t => t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
      return game.tagsStr.split(';').findIndex(t => extremeTags.includes(t.trim())) !== -1;
    },

    // Events
    get onWillLaunchGame() {
      return apiEmitters.games.onWillLaunchGame.event;
    },
    get onWillLaunchAddApp() {
      return apiEmitters.games.onWillLaunchAddApp.event;
    },
    get onWillLaunchCurationGame() {
      return apiEmitters.games.onWillLaunchCurationGame.event;
    },
    get onWillLaunchCurationAddApp() {
      return apiEmitters.games.onWillLaunchCurationAddApp.event;
    },
    get onDidLaunchGame() {
      return apiEmitters.games.onDidLaunchGame.event;
    },
    get onDidLaunchAddApp() {
      return apiEmitters.games.onDidLaunchAddApp.event;
    },
    get onDidLaunchCurationGame() {
      return apiEmitters.games.onDidLaunchCurationGame.event;
    },
    get onDidLaunchCurationAddApp() {
      return apiEmitters.games.onDidLaunchCurationAddApp.event;
    },
    get onDidUpdateGame() {
      return apiEmitters.games.onDidUpdateGame.event;
    },
    get onDidRemoveGame() {
      return apiEmitters.games.onDidRemoveGame.event;
    },
    get onDidUpdatePlaylist() {
      return apiEmitters.games.onDidUpdatePlaylist.event;
    },
    get onDidUpdatePlaylistGame() {
      return apiEmitters.games.onDidUpdatePlaylistGame.event;
    },
    get onDidRemovePlaylistGame() {
      return apiEmitters.games.onDidRemovePlaylistGame.event;
    },
    get onDidInstallGameData() {
      return apiEmitters.games.onDidInstallGameData.event;
    },
    get onDidUninstallGameData() {
      return apiEmitters.games.onDidUninstallGameData.event;
    },
    get onWillImportGame() {
      return apiEmitters.games.onWillImportCuration.event;
    },
    get onWillUninstallGameData() {
      return apiEmitters.games.onWillUninstallGameData.event;
    }
  };

  const extGameData: typeof flashpoint.gameData = {
    findOne: GameDataManager.findOne,
    findGameData: GameDataManager.findGameData,
    save: GameDataManager.save,
    importGameData: (gameId: string, filePath: string) => GameDataManager.importGameData(gameId, filePath, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath)),
    downloadGameData: async (gameDataId: number) => {
      const onProgress = (percent: number) => {
        // Sent to PLACEHOLDER download dialog on client
        state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_PERCENT, percent);
      };
      state.socketServer.broadcast(BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG);
      await GameDataManager.downloadGameData(gameDataId, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath), state.preferences.gameDataSources, state.downloadController.signal(), onProgress)
      .catch((error) => {
        state.socketServer.broadcast(BackOut.OPEN_ALERT, error);
      })
      .finally(() => {
        // Close PLACEHOLDER download dialog on client, cosmetic delay to look nice
        setTimeout(() => {
          state.socketServer.broadcast(BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG);
        }, 250);
      });
    },
    get onDidImportGameData() {
      return apiEmitters.gameData.onDidImportGameData.event;
    }
  };

  const extTags: typeof flashpoint.tags = {
    // Tags
    getTagById: TagManager.getTagById,
    findTag: TagManager.findTag,
    findTags: TagManager.findTags,
    createTag: TagManager.createTag,
    saveTag: TagManager.saveTag,
    addAliasToTag: TagManager.addAliasToTag,
    deleteTag: (tagId: number, skipWarn?: boolean) => {
      const openDialogFunc = getOpenMessageBoxFunc(state);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return TagManager.deleteTag(tagId, state, openDialogFunc, skipWarn);
    },
    findGameTags: TagManager.findGameTags,

    // Tag Categories
    getTagCategoryById: TagManager.getTagCategoryById,
    findTagCategories: TagManager.findTagCategories,
    createTagCategory: TagManager.createTagCategory,
    saveTagCategory: TagManager.saveTagCategory,
    deleteTagCategory: (tagCategoryId: number) => {
      const openDialogFunc = getOpenMessageBoxFunc(state);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return TagManager.deleteTagCategory(tagCategoryId, openDialogFunc, state);
    },

    // Tag Suggestions
    // TODO: Update event to allow custom filters from ext
    findTagSuggestions: (text: string) => TagManager.findTagSuggestions(text, []),

    // Misc
    mergeTags: (mergeData: flashpoint.MergeTagData) => {
      const openDialogFunc = getOpenMessageBoxFunc(state);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return TagManager.mergeTags(mergeData, openDialogFunc, state);
    },
  };

  const extStatus: typeof flashpoint.status = {
    setStatus: <T extends keyof StatusState>(key: T, val: StatusState[T]) => setStatus(state, key, val),
    getStatus: <T extends keyof StatusState>(key: T): StatusState[T] => state.status[key],
    newTask: (task: flashpoint.PreTask) => {
      const newTask: Task = {
        ...task,
        id: uuid()
      };
      state.socketServer.broadcast(BackOut.CREATE_TASK, newTask);
      return newTask;
    },
    setTask: (taskId: string, taskData: Partial<Task>) => {
      state.socketServer.broadcast(BackOut.UPDATE_TASK, taskId, taskData);
    },
  };

  const extServices: typeof flashpoint.services = {
    runService: (name: string, info: flashpoint.ProcessInfo, opts?: flashpoint.ProcessOpts, basePath?: string) => {
      const id = `${extManifest.name}.${name}`;
      return runService(state, id, name, basePath || extPath || state.config.flashpointPath, opts || {}, {
        ...info,
        kill: true
      });
    },
    createProcess: (name: string, info: flashpoint.ProcessInfo, opts?: flashpoint.ProcessOpts, basePath?: string) => {
      const id = `${extManifest.name}.${name}`;
      const cwd = path.join(basePath || extPath || state.config.flashpointPath, info.path);
      const proc = new DisposableChildProcess(id, name, cwd, opts || {}, {aliases: [], name: '', ...info, kill: true});
      proc.onDispose = () => proc.kill();
      return proc;
    },
    removeService: (process: any) => removeService(state, process.id),
    getServices: () => Array.from(state.services.values()),

    get onServiceNew() {
      return apiEmitters.services.onServiceNew.event;
    },
    get onServiceRemove() {
      return apiEmitters.services.onServiceRemove.event;
    },
    get onServiceChange() {
      return apiEmitters.services.onServiceChange.event;
    }
  };

  const extDialogs: typeof flashpoint.dialogs = {
    showMessageBox: async (options: flashpoint.DialogStateTemplate) => {
      const openDialogFunc = getOpenMessageBoxFunc(state);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      const dialogId = await openDialogFunc(options);
      return (await awaitDialog(state, dialogId)).buttonIdx;
    },
    showMessageBoxWithHandle: async (options: flashpoint.DialogStateTemplate) => {
      const openDialogFunc = getOpenMessageBoxFunc(state);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return openDialogFunc(options);
    },
    awaitDialog: async (dialogId: string) => {
      return new Promise<flashpoint.DialogResponse>((resolve) => {
        state.resolveDialogEvents.once(dialogId, (res) => {
          resolve(res);
        });
      });
    },
    cancelDialog: async (dialogId: string) => {
      state.socketServer.broadcast(BackOut.CANCEL_DIALOG, dialogId);
    },
    showSaveDialog: (options: flashpoint.ShowSaveDialogOptions) => {
      const openDialogFunc = getOpenSaveDialogFunc(state.socketServer);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return openDialogFunc(options);
    },
    showOpenDialog: (options: flashpoint.ShowOpenDialogOptions) => {
      const openDialogFunc = getOpenOpenDialogFunc(state.socketServer);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return openDialogFunc(options);
    }
  };

  const extCurations: typeof flashpoint.curations = {
    loadCurationArchive: async (filePath: string, taskId?: string) => {
      if (taskId) {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, taskId, {
          status: `Loading ${filePath}`
        });
      }
      const curState = await loadCurationArchive(filePath)
      .catch((error) => {
        log.error('Curate', `Failed to load curation archive! ${error.toString()}`);
        state.socketServer.broadcast(BackOut.OPEN_ALERT, formatString(state.languageContainer['dialog'].failedToLoadCuration, error.toString()) as string);
      });
      if (taskId) {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, taskId, {
          status: '',
          finished: true
        });
      }
      if (curState) {
        return curState;
      } else {
        throw new Error('Failed to import');
      }
    },
    duplicateCuration: (folder: string) => {
      return duplicateCuration(folder, state);
    },
    getCurations: () => {
      return [...state.loadedCurations];
    },
    async getCurationTemplates(): Promise<CurationTemplate[]> {
      const contribs = await state.extensionsService.getContributions('curationTemplates');
      return contribs.reduce<CurationTemplate[]>((prev, cur) => prev.concat(cur.value), []);
    },
    getCuration: (folder: string) => {
      const curation = state.loadedCurations.find(c => c.folder === folder);
      return curation ? {...curation} : undefined;
    },
    get onDidCurationListChange() {
      return apiEmitters.curations.onDidCurationListChange.event;
    },
    get onDidCurationChange() {
      return apiEmitters.curations.onDidCurationChange.event;
    },
    get onWillGenCurationWarnings() {
      return apiEmitters.curations.onWillGenCurationWarnings.event;
    },
    setCurationGameMeta: (folder: string, meta: flashpoint.CurationMeta) => {
      const curation = state.loadedCurations.find(c => c.folder === folder);
      if (curation) {
        if (curation.locked) {
          return false;
        }
        curation.game = {
          ...curation.game,
          ...meta
        };
        saveCuration(path.join(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, curation.folder), curation)
        .then(() => state.apiEmitters.curations.onDidCurationChange.fire(curation));
        state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
        return true;
      } else {
        throw 'Not a valid curation folder';
      }
    },
    setCurationAddAppMeta: (folder: string, key: string, meta: flashpoint.AddAppCurationMeta) => {
      const curation = state.loadedCurations.find(c => c.folder === folder);
      if (curation) {
        if (curation.locked) {
          return false;
        }
        const addAppIdx = curation.addApps.findIndex(a => a.key === key);
        if (addAppIdx !== -1) {
          const existingAddApp = curation.addApps[addAppIdx];
          curation.addApps[addAppIdx] = {
            key: existingAddApp.key,
            ...meta
          };
          state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
          return true;
        } else {
          throw 'Not a valid add app.';
        }
      } else {
        throw 'Not a valid curation folder';
      }
    },
    selectCurations: (folders: string[]) => {
      state.socketServer.broadcast(BackOut.CURATE_SELECT_CURATIONS, folders);
    },
    updateCurationContentTree: async (folder: string) => {
      const curationIdx = state.loadedCurations.findIndex(c => c.folder === folder);
      if (curationIdx !== -1) {
        const curation = state.loadedCurations[curationIdx];
        return genContentTree(getContentFolderByKey(curation.folder, state.config.flashpointPath))
        .then((contentTree) => {
          const idx = state.loadedCurations.findIndex(c => c.folder === folder);
          if (idx > -1) {
            state.loadedCurations[idx].contents = contentTree;
            state.socketServer.broadcast(BackOut.CURATE_CONTENTS_CHANGE, folder, contentTree);
            return contentTree;
          }
        });
      } else {
        throw 'No curation with that folder.';
      }
    },
    newCuration: async (meta?: CurationMeta) => {
      const folder = uuid();
      const curPath = path.join(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, folder);
      await fs.promises.mkdir(curPath, { recursive: true });
      const contentFolder = path.join(curPath, 'content');
      await fs.promises.mkdir(contentFolder, { recursive: true });

      const data: LoadedCuration = {
        folder,
        uuid: uuid(),
        group: '',
        game: meta || {},
        addApps: [],
        thumbnail: await loadCurationIndexImage(path.join(curPath, 'logo.png')),
        screenshot: await loadCurationIndexImage(path.join(curPath, 'ss.png'))
      };
      const curation: flashpoint.CurationState = {
        ...data,
        alreadyImported: false,
        warnings: await genCurationWarnings(data, state.config.flashpointPath, state.suggestions, state.languageContainer.curate, state.apiEmitters.curations.onWillGenCurationWarnings),
        contents: await genContentTree(getContentFolderByKey(folder, state.config.flashpointPath))
      };
      await saveCuration(curPath, curation);
      state.loadedCurations.push(curation);
      state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
      return curation;
    },
    deleteCuration: (folder: string) => {
      return deleteCuration(state, folder);
    },
    getCurationPath: (folder: string) => {
      return path.join(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, folder);
    }
  };

  // Create API Module to give to caller
  return <typeof flashpoint>{
    // General information
    version: version,
    dataVersion: state.customVersion,
    extensionPath: extPath,
    config: state.config,
    getPreferences: getPreferences,
    overwritePreferenceData: extOverwritePreferenceData,
    unload: unload,
    getExtensionFileURL: getExtensionFileURL,
    unzipFile: unzipFile,
    getExtConfigValue: getExtConfigValue,
    setExtConfigValue: setExtConfigValue,
    onExtConfigChange: state.apiEmitters.ext.onExtConfigChange.event,
    focusWindow: focusWindow,

    // Namespaces
    log: extLog,
    commands: extCommands,
    curations: extCurations,
    games: extGames,
    gameData: extGameData,
    tags: extTags,
    status: extStatus,
    services: extServices,
    dialogs: extDialogs,

    // Events
    onDidInit: apiEmitters.onDidInit.event,
    onDidConnect: apiEmitters.onDidConnect.event,

    // Classes
    DisposableChildProcess: DisposableChildProcess,
    ManagedChildProcess: ManagedChildProcess,

    // Enums
    ProcessState: ProcessState,
    BrowsePageLayout: BrowsePageLayout,
    LogLevel: LogLevel,

    // Disposable funcs
    dispose: dispose,
    clearDisposable: clearDisposable,
    registerDisposable: registerDisposable,
    newDisposable: newDisposable

    // Note - Types are defined in the declaration file, not here
  };
}
