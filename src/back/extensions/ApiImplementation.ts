import { EXT_CONFIG_FILENAME, PREFERENCES_FILENAME } from '@back/constants';
import { ExtConfigFile } from '@back/ExtConfigFile';
import * as GameDataManager from '@back/game/GameDataManager';
import * as GameManager from '@back/game/GameManager';
import * as SourceManager from '@back/game/SourceManager';
import * as TagManager from '@back/game/TagManager';
import { DisposableChildProcess, ManagedChildProcess } from '@back/ManagedChildProcess';
import { BackState, StatusState } from '@back/types';
import { clearDisposable, dispose, newDisposable, registerDisposable } from '@back/util/lifecycle';
import { createPlaylistFromJson, getOpenMessageBoxFunc, getOpenOpenDialogFunc, getOpenSaveDialogFunc, removeService, runService, setStatus } from '@back/util/misc';
import { pathTo7zBack } from '@back/util/SevenZip';
import { Game } from '@database/entity/Game';
import { BackOut } from '@shared/back/types';
import { BrowsePageLayout } from '@shared/BrowsePageLayout';
import { IExtensionManifest } from '@shared/extensions/interfaces';
import { ProcessState } from '@shared/interfaces';
import { ILogEntry, LogLevel } from '@shared/Log/interface';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { overwritePreferenceData } from '@shared/preferences/util';
import * as flashpoint from 'flashpoint-launcher';
import { extractFull } from 'node-7z';
import * as path from 'path';
import { newExtLog } from './ExtensionUtils';
import { Command } from './types';

/**
 * Create a Flashpoint API implementation specific to an extension, used during module load interception
 * @param extManifest Manifest of the caller
 * @param registry Registry to register commands etc. to
 * @param addExtLog Function to add an Extensions log to the Logs page
 * @param version Version of the Flashpoint Launcher
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

  function broadcastPlaylistWrapper<T, R>(cb: (arg: T) => Promise<R>): (args: T) => Promise<R>;
  function broadcastPlaylistWrapper<T, T2, R>(cb: (arg: T, arg2: T2) => Promise<R>): (arg: T, arg2: T2) => Promise<R>;
  function broadcastPlaylistWrapper<R>(cb: (...args: any[]) => Promise<R>): (args: any[]) => Promise<R> {
    return async (args: any[]) => {
      return cb(...args)
      .then(async (r) => {
        state.socketServer.broadcast(BackOut.PLAYLISTS_CHANGE, await GameManager.findPlaylists(state.preferences.browsePageShowExtreme));
        return r;
      });
    };
  }

  const extGames: typeof flashpoint.games = {
    // Playlists
    findPlaylist: GameManager.findPlaylist,
    findPlaylistByName: GameManager.findPlaylistByName,
    findPlaylists: GameManager.findPlaylists,
    updatePlaylist: broadcastPlaylistWrapper(GameManager.updatePlaylist),
    removePlaylist: broadcastPlaylistWrapper(GameManager.removePlaylist),
    addPlaylistGame: broadcastPlaylistWrapper(GameManager.addPlaylistGame),

    // Playlist Game
    findPlaylistGame: GameManager.findPlaylistGame,
    removePlaylistGame: broadcastPlaylistWrapper(GameManager.removePlaylistGame),
    updatePlaylistGame: broadcastPlaylistWrapper(GameManager.updatePlaylistGame),
    updatePlaylistGames: broadcastPlaylistWrapper(GameManager.updatePlaylistGames),

    // Games
    countGames: GameManager.countGames,
    findGame: GameManager.findGame,
    findGames: GameManager.findGames,
    findGamesWithTag: GameManager.findGamesWithTag,
    updateGame: GameManager.save,
    updateGames: GameManager.updateGames,
    // Ardil TODO
    removeGameAndAddApps: (gameId: string) => GameManager.removeGameAndChildren(gameId, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath)),
    isGameExtreme: (game: Game) => {
      const extremeTags = state.preferences.tagFilters.filter(t => t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
      return game.tagsStr.split(';').findIndex(t => extremeTags.includes(t.trim())) !== -1;
    },

    // Misc
    findPlatforms: GameManager.findPlatforms,
    createPlaylistFromJson: createPlaylistFromJson,

    // Events
    get onWillLaunchGame() {
      return apiEmitters.games.onWillLaunchGame.event;
    },
    // Ardil TODO remove
    get onWillLaunchAddApp() {
      return apiEmitters.games.onWillLaunchAddApp.event;
    },
    get onWillLaunchCurationGame() {
      return apiEmitters.games.onWillLaunchCurationGame.event;
    },
    // Ardil TODO remove
    get onWillLaunchCurationAddApp() {
      return apiEmitters.games.onWillLaunchCurationAddApp.event;
    },
    get onDidLaunchGame() {
      return apiEmitters.games.onDidLaunchGame.event;
    },
    // Ardil TODO remove
    get onDidLaunchAddApp() {
      return apiEmitters.games.onDidLaunchAddApp.event;
    },
    get onDidLaunchCurationGame() {
      return apiEmitters.games.onDidLaunchCurationGame.event;
    },
    // Ardil TODO remove
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
    findSourceDataForHashes: GameDataManager.findSourceDataForHashes,
    save: GameDataManager.save,
    importGameData: (gameId, filePath) => GameDataManager.importGameData(gameId, filePath, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath)),
    downloadGameData: async (gameDataId) => {
      const onProgress = (percent: number) => {
        // Sent to PLACEHOLDER download dialog on client
        state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_PERCENT, percent);
      };
      state.socketServer.broadcast(BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG);
      await GameDataManager.downloadGameData(gameDataId, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath), onProgress)
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

  const extSources: typeof flashpoint.sources = {
    findOne: SourceManager.findOne
  };

  const extTags: typeof flashpoint.tags = {
    // Tags
    getTagById: TagManager.getTagById,
    findTag: TagManager.findTag,
    findTags: TagManager.findTags,
    createTag: TagManager.createTag,
    saveTag: TagManager.saveTag,
    deleteTag: (tagId: number, skipWarn?: boolean) => {
      const openDialogFunc = getOpenMessageBoxFunc(state.socketServer);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return TagManager.deleteTag(tagId, openDialogFunc, skipWarn);
    },
    findGameTags: TagManager.findGameTags,

    // Tag Categories
    getTagCategoryById: TagManager.getTagCategoryById,
    findTagCategories: TagManager.findTagCategories,
    createTagCategory: TagManager.createTagCategory,
    saveTagCategory: TagManager.saveTagCategory,
    deleteTagCategory: (tagCategoryId: number) => {
      const openDialogFunc = getOpenMessageBoxFunc(state.socketServer);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return TagManager.deleteTagCategory(tagCategoryId, openDialogFunc);
    },

    // Tag Suggestions
    // TODO: Update event to allow custom filters from ext
    findTagSuggestions: (text: string) => TagManager.findTagSuggestions(text, []),

    // Misc
    mergeTags: (mergeData: flashpoint.MergeTagData) => {
      const openDialogFunc = getOpenMessageBoxFunc(state.socketServer);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return TagManager.mergeTags(mergeData, openDialogFunc);
    },
  };

  const extStatus: typeof flashpoint.status = {
    setStatus: <T extends keyof StatusState>(key: T, val: StatusState[T]) => setStatus(state, key, val),
    getStatus: <T extends keyof StatusState>(key: T): StatusState[T] => state.status[key]
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
      const proc = new DisposableChildProcess(id, name, cwd, opts || {}, {...info, kill: true});
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
    showMessageBox: (options: flashpoint.ShowMessageBoxOptions): Promise<number> => {
      const openDialogFunc = getOpenMessageBoxFunc(state.socketServer);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return openDialogFunc(options);
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

    // Namespaces
    log: extLog,
    commands: extCommands,
    games: extGames,
    gameData: extGameData,
    sources: extSources,
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
