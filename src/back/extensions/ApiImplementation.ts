import { GameManager } from '@back/game/GameManager';
import { TagManager } from '@back/game/TagManager';
import { BackState, StatusState } from '@back/types';
import { clearDisposable, dispose, newDisposable, registerDisposable } from '@back/util/lifecycle';
import { getOpenDialogFunc, setStatus, createPlaylistFromJson } from '@back/util/misc';
import { IExtensionManifest } from '@shared/extensions/interfaces';
import { ILogEntry } from '@shared/Log/interface';
import * as flashpoint from 'flashpoint';
import { ApiEvent } from './ApiEvent';
import { newExtLog } from './ExtensionUtils';
import { Command } from './types';
import { MergeTagData } from '@shared/back/types';
/**
 * Create a Flashpoint API implementation specific to an extension, used during module load interception
 * @param extManifest Manifest of the caller
 * @param registry Registry to register commands etc to
 * @param addExtLog Function to add an Extensions log to the Logs page
 * @param version Version of the Flashpoint Launcher
 * @returns API Implementation specific to the caller
 */
export function createApiFactory(extManifest: IExtensionManifest, addExtLog: (log: ILogEntry) => void, version: string, state: BackState): typeof flashpoint {
  const { registry, apiEmitters } = state;

  // Log Namespace
  const extLog: typeof flashpoint.log = {
    trace: (message: string) => addExtLog(newExtLog(extManifest, message, log.trace)),
    debug: (message: string) => addExtLog(newExtLog(extManifest, message, log.debug)),
    info:  (message: string) => addExtLog(newExtLog(extManifest, message, log.info)),
    warn:  (message: string) => addExtLog(newExtLog(extManifest, message, log.warn)),
    error: (message: string) => addExtLog(newExtLog(extManifest, message, log.error))
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
      log.debug('Extensions', `Command "${command}" registered by "${extManifest.displayName || extManifest.name}"`);
      return c;
    }
  };

  const extGames: typeof flashpoint.games = {
    // Playlists
    findPlaylist: GameManager.findPlaylist,
    findPlaylistByName: GameManager.findPlaylistByName,
    findPlaylists: GameManager.findPlaylists,
    updatePlaylist: GameManager.updatePlaylist,
    removePlaylist: GameManager.removePlaylist,
    // Playlist Game
    findPlaylistGame: GameManager.findPlaylistGame,
    removePlaylistGame: GameManager.removePlaylistGame,
    updatePlaylistGame: GameManager.updatePlaylistGame,
    updatePlaylistGames: GameManager.updatePlaylistGames,
    // Games
    countGames: GameManager.countGames,
    findGame: GameManager.findGame,
    // TODO: Find Games Func
    findGamesWithTag: GameManager.findGamesWithTag,
    updateGame: GameManager.updateGame,
    updateGames: GameManager.updateGames,
    removeGameAndAddApps: GameManager.removeGameAndAddApps,
    // Misc
    findPlatforms: GameManager.findPlatforms,
    createPlaylistFromJson: createPlaylistFromJson,
    // Events
    get onDidLaunchGame(): ApiEvent<flashpoint.Game> {
      return apiEmitters.games.onDidLaunchGame.event;
    }
  };

  const extTags: typeof flashpoint.tags = {
    // Tags
    getTagById: TagManager.getTagById,
    findTag: TagManager.findTag,
    findTags: TagManager.findTags,
    createTag: TagManager.createTag,
    saveTag: TagManager.saveTag,
    deleteTag: (tagId: number, skipWarn?: boolean) => {
      const openDialogFunc = getOpenDialogFunc(state.socketServer);
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
      const openDialogFunc = getOpenDialogFunc(state.socketServer);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return TagManager.deleteTagCategory(tagCategoryId, openDialogFunc);
    },

    // Tag Suggestions
    findTagSuggestions: TagManager.findTagSuggestions,

    // Misc
    mergeTags: (mergeData: flashpoint.MergeTagData) => {
      const openDialogFunc = getOpenDialogFunc(state.socketServer);
      if (!openDialogFunc) { throw new Error('No suitable client for dialog func.'); }
      return TagManager.mergeTags(mergeData, openDialogFunc);
    },
  };

  const extStatus: typeof flashpoint.status = {
    get devConsoleText(): string {
      return state.status.devConsoleText;
    },

    setStatus: <T extends keyof StatusState>(key: T, val: StatusState[T]) => setStatus(state, key, val),
  };

  // Create API Module to give to caller
  return <typeof flashpoint>{
    // General information
    version: version,
    extManifest: extManifest,

    // Namespaces
    log: extLog,
    commands: extCommands,
    games: extGames,
    tags: extTags,
    status: extStatus,

    // Disposable funcs
    dispose: dispose,
    clearDisposable: clearDisposable,
    registerDisposable: registerDisposable,
    newDisposable: newDisposable

    // Note - Types are defined in the decleration file, not here
  };
}
