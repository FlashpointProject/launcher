import { Game } from '@database/entity/Game';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { AddLogData, BackIn, BackInit, BackOut, BrowseChangeData, BrowseViewIndexData, BrowseViewIndexResponse, BrowseViewKeysetData, BrowseViewKeysetResponse, BrowseViewPageData, BrowseViewPageResponseData, DeleteGameData, DeleteImageData, DeletePlaylistData, DeletePlaylistGameData, DeletePlaylistGameResponse, DeletePlaylistResponse, DuplicateGameData, DuplicatePlaylistData, ExportGameData, ExportMetaEditData, ExportPlaylistData, GameMetadataSyncResponse, GetAllGamesResponseData, GetExecData, GetGameData, GetGameResponseData, GetGamesTotalResponseData, GetMainInitDataResponse, GetPlaylistData, GetPlaylistGameData, GetPlaylistGameResponse, GetPlaylistResponse, GetPlaylistsResponse, GetRendererInitDataResponse, GetSuggestionsResponseData, ImageChangeData, ImportCurationData, ImportCurationResponseData, ImportMetaEditResponseData, ImportPlaylistData, InitEventData, LanguageChangeData, LaunchAddAppData, LaunchCurationAddAppData, LaunchCurationData, LaunchGameData, LocaleUpdateData, MergeTagData, PlaylistsChangeData, RandomGamesData, RandomGamesResponseData, SaveGameData, SaveImageData, SaveLegacyPlatformData as SaveLegacyPlatformData, SavePlaylistData, SavePlaylistGameData, SavePlaylistGameResponse, SavePlaylistResponse, ServiceActionData, SetLocaleData, TagByIdData, TagByIdResponse, TagCategoryByIdData, TagCategoryByIdResponse, TagCategoryDeleteData, TagCategoryDeleteResponse, TagCategorySaveData, TagCategorySaveResponse, TagDeleteData, TagDeleteResponse, TagFindData, TagFindResponse, TagGetData, TagGetOrCreateData, TagGetResponse, TagPrimaryFixData, TagPrimaryFixResponse, TagSaveData, TagSaveResponse, TagSuggestionsData, TagSuggestionsResponse, UpdateConfigData, UploadLogResponse } from '@shared/back/types';
import { overwriteConfigData } from '@shared/config/util';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import { stringifyCurationFormat } from '@shared/curate/format/stringifier';
import { convertToCurationMeta } from '@shared/curate/metaToMeta';
import { getContentFolderByKey } from '@shared/curate/util';
import { DeepPartial, GamePropSuggestions, INamedBackProcessInfo, IService, ProcessAction } from '@shared/interfaces';
import { MetaEditFile, MetaEditMeta } from '@shared/MetaEdit';
import { IAppPreferencesData } from '@shared/preferences/interfaces';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { defaultPreferencesData, overwritePreferenceData } from '@shared/preferences/util';
import { deepCopy } from '@shared/Util';
import { formatString } from '@shared/utils/StringFormatter';
import * as axiosImport from 'axios';
import * as fs from 'fs';
import { ensureDir } from 'fs-extra';
import * as path from 'path';
import * as url from 'url';
import * as util from 'util';
import { ConfigFile } from './ConfigFile';
import { CONFIG_FILENAME, PREFERENCES_FILENAME } from './constants';
import { GameManager } from './game/GameManager';
import { TagManager } from './game/TagManager';
import { GameLauncher } from './GameLauncher';
import { importCuration, launchAddAppCuration, launchCuration } from './importGame';
import { MetadataServerApi, SyncableGames } from './MetadataServerApi';
import { importAllMetaEdits } from './MetaEdit';
import { respond } from './SocketServer';
import { BackState } from './types';
import { copyError, createAddAppFromLegacy, createContainer, createGameFromLegacy, createPlaylist, exit, log, pathExists, procToService, runService, waitForServiceDeath } from './util/misc';
import { sanitizeFilename } from './util/sanitizeFilename';
import { uuid } from './util/uuid';

const axios = axiosImport.default;
const copyFile  = util.promisify(fs.copyFile);
const stat      = util.promisify(fs.stat);
const unlink    = util.promisify(fs.unlink);
const writeFile = util.promisify(fs.writeFile);

/**
 * Register all request callbacks to the socket server.
 * @param state State of the back.
 */
export function registerRequestCallbacks(state: BackState): void {
  state.socketServer.register<AddLogData>(BackIn.ADD_LOG, (event, req) => {
    log(state, req.data, req.id);
  });

  state.socketServer.register(BackIn.GET_MAIN_INIT_DATA, (event, req) => {
    respond<GetMainInitDataResponse>(event.target, {
      id: req.id,
      type: BackOut.GET_MAIN_INIT_DATA,
      data: {
        preferences: state.preferences,
        config: state.config,
      },
    });
  });

  state.socketServer.register(BackIn.GET_RENDERER_INIT_DATA, async (event, req) => {
    const services: IService[] = [];
    if (state.services.server) { services.push(procToService(state.services.server)); }

    state.languageContainer = createContainer(
      state.languages,
      state.preferences.currentLanguage,
      state.localeCode,
      state.preferences.fallbackLanguage
    );

    const libraries = await GameManager.findUniqueValues(Game, 'library');
    const serverNames = state.serviceInfo ? state.serviceInfo.server.map(i => i.name || '') : [];
    const mad4fpEnabled = state.serviceInfo ? (state.serviceInfo.server.findIndex(s => s.mad4fp === true) !== -1) : false;
    let platforms: Record<string, string[]> = {};
    for (let library of libraries) {
      platforms[library] = await GameManager.findPlatforms(library);
    }

    respond<GetRendererInitDataResponse>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        preferences: state.preferences,
        config: state.config,
        fileServerPort: state.fileServerPort,
        log: state.log,
        services: services,
        languages: state.languages,
        language: state.languageContainer,
        themes: state.themeFiles.map(theme => ({ entryPath: theme.entryPath, meta: theme.meta })),
        playlists: await GameManager.findPlaylists(),
        libraries: libraries,
        serverNames: serverNames,
        mad4fpEnabled: mad4fpEnabled,
        platforms: platforms,
        localeCode: state.localeCode,
        tagCategories: await TagManager.findTagCategories()
      },
    });
  });

  state.socketServer.register(BackIn.INIT_LISTEN, (event, req) => {
    const done: BackInit[] = [];
    for (let key in state.init) {
      const init: BackInit = key as any;
      if (state.init[init]) {
        done.push(init);
      } else {
        state.initEmitter.once(init, () => {
          respond<InitEventData>(event.target, {
            id: '',
            type: BackOut.INIT_EVENT,
            data: { done: [ init ] },
          });
        });
      }
    }

    respond<InitEventData>(event.target, {
      id: req.id,
      type: BackOut.INIT_EVENT,
      data: { done },
    });
  });

  state.socketServer.register(BackIn.GET_SUGGESTIONS, async (event, req) => {
    const startTime = Date.now();
    const suggestions: GamePropSuggestions = {
      tags: await GameManager.findUniqueValues(TagAlias, 'name'),
      platform: await GameManager.findUniqueValues(Game, 'platform'),
      playMode: await GameManager.findUniqueValues(Game, 'playMode'),
      status: await GameManager.findUniqueValues(Game, 'status'),
      applicationPath: await GameManager.findUniqueValues(Game, 'applicationPath'),
      library: await GameManager.findUniqueValues(Game, 'library'),
    };
    const appPaths: {[platform: string]: string} = {};
    for (let platform of suggestions.platform) {
      appPaths[platform] = (await GameManager.findPlatformAppPaths(platform))[0] || '';
    }
    console.log(Date.now() - startTime);
    respond<GetSuggestionsResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        suggestions: suggestions,
        appPaths: appPaths,
      },
    });
  });

  state.socketServer.register(BackIn.GET_GAMES_TOTAL, async (event, req) => {
    respond<GetGamesTotalResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: await GameManager.countGames(),
    });
  });

  state.socketServer.register<SetLocaleData>(BackIn.SET_LOCALE, (event, req) => {
    state.localeCode = req.data;

    // @TODO Update the language container if the locale changes

    respond<LocaleUpdateData>(event.target, {
      id: req.id,
      type: BackOut.LOCALE_UPDATE,
      data: req.data,
    });
  });

  state.socketServer.register(BackIn.GET_EXEC, (event, req) => {
    respond<GetExecData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: state.execMappings,
    });
  });

  state.socketServer.register<LaunchAddAppData>(BackIn.LAUNCH_ADDAPP, async (event, req) => {
    const reqData: LaunchAddAppData = req.data;
    const addApp = await GameManager.findAddApp(reqData.id);
    if (addApp) {
      const platform = addApp.parentGame ? addApp.parentGame : '';
      GameLauncher.launchAdditionalApplication({
        addApp,
        fpPath: path.resolve(state.config.flashpointPath),
        native: addApp.parentGame && state.config.nativePlatforms.some(p => p === platform) || false,
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        log: log.bind(undefined, state),
        openDialog: state.socketServer.openDialog(event.target),
        openExternal: state.socketServer.openExternal(event.target),
      });
    }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: undefined
    });
  });

  state.socketServer.register<LaunchGameData>(BackIn.LAUNCH_GAME, async (event, req) => {
    const reqData: LaunchGameData = req.data;
    const game = await GameManager.findGame(reqData.id);

    if (game) {
      // Make sure Server is set to configured server - Curations may have changed it
      const configServer = state.serviceInfo ? state.serviceInfo.server.find(s => s.name === state.config.server) : undefined;
      if (configServer) {
        const info: INamedBackProcessInfo = state.services.server.info;
        if (info.name !== configServer.name) {
          // Server is different, change now
          await waitForServiceDeath(state.services.server);
          state.services.server = runService(state, 'server', 'Server', configServer);
        }
      }
      // Launch game
      GameLauncher.launchGame({
        game,
        fpPath: path.resolve(state.config.flashpointPath),
        native: state.config.nativePlatforms.some(p => p === game.platform),
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        log: log.bind(undefined, state),
        openDialog: state.socketServer.openDialog(event.target),
        openExternal: state.socketServer.openExternal(event.target),
      });
    }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: undefined
    });
  });

  state.socketServer.register<SaveGameData>(BackIn.SAVE_GAME, async (event, req) => {
    const game = await GameManager.updateGame(req.data);
    state.queries = {}; // Clear entire cache

    respond<BrowseChangeData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        library: game.library,
        gamesTotal: await GameManager.countGames(),
      }
    });
  });

  state.socketServer.register<DeleteGameData>(BackIn.DELETE_GAME, async (event, req) => {
    const game = await GameManager.removeGameAndAddApps(req.data.id);

    state.queries = {}; // Clear entire cache

    respond<BrowseChangeData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        library: game && game.library,
        gamesTotal: await GameManager.countGames(),
      }
    });
  });

  state.socketServer.register<DuplicateGameData>(BackIn.DUPLICATE_GAME, async (event, req) => {
    const game = await GameManager.findGame(req.data.id);
    let result: Game | undefined;
    if (game) {

      // Copy and apply new IDs
      const newGame = deepCopy(game);
      const newAddApps = game.addApps.map(addApp => deepCopy(addApp));
      newGame.id = uuid();
      for (let j = 0; j < newAddApps.length; j++) {
        newAddApps[j].id = uuid();
        newAddApps[j].parentGame = newGame;
      }
      newGame.addApps = newAddApps;

      // Add copies
      result = await GameManager.updateGame(newGame);

      // Copy images
      if (req.data.dupeImages) {
        const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
        const oldLast = path.join(game.id.substr(0, 2), game.id.substr(2, 2), game.id+'.png');
        const newLast = path.join(newGame.id.substr(0, 2), newGame.id.substr(2, 2), newGame.id+'.png');

        const oldLogoPath = path.join(imageFolder, LOGOS, oldLast);
        const newLogoPath = path.join(imageFolder, LOGOS, newLast);
        try {
          if (await pathExists(oldLogoPath)) {
            await fs.promises.mkdir(path.dirname(newLogoPath), { recursive: true });
            await copyFile(oldLogoPath, newLogoPath);
          }
        } catch (e) { console.error(e); }

        const oldScreenshotPath = path.join(imageFolder, SCREENSHOTS, oldLast);
        const newScreenshotPath = path.join(imageFolder, SCREENSHOTS, newLast);
        try {
          if (await pathExists(oldScreenshotPath)) {
            await fs.promises.mkdir(path.dirname(newScreenshotPath), { recursive: true });
            await copyFile(oldScreenshotPath, newScreenshotPath);
          }
        } catch (e) { console.error(e); }
      }

      state.queries = {}; // Clear entire cache
    }

    respond<BrowseChangeData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        library: result && result.library,
        gamesTotal: await GameManager.countGames(),
      }
    });
  });

  state.socketServer.register<DuplicatePlaylistData>(BackIn.DUPLICATE_PLAYLIST, async (event, req) => {
    const playlist = await GameManager.findPlaylist(req.data, true);
    if (playlist) {
      const newPlaylistId = uuid();
      playlist.id = newPlaylistId;
      playlist.title += ' - Copy';
      playlist.games = playlist.games.map(g => {
        g.id = undefined; // New Entry
        g.playlistId = newPlaylistId;
        return g;
      });
      await GameManager.updatePlaylist(playlist);
      respond<PlaylistsChangeData>(event.target, {
        id: req.id,
        type: BackOut.PLAYLISTS_CHANGE,
        data: await GameManager.findPlaylists()
      });
    } else {
      respond(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE
      });
    }
  });

  state.socketServer.register<ImportPlaylistData>(BackIn.IMPORT_PLAYLIST, async (event, req) => {
    try {
      const rawData = await fs.promises.readFile(req.data, 'utf-8');
      const jsonData = JSON.parse(rawData);
      const newPlaylist = createPlaylist(jsonData);
      const existingPlaylist = await GameManager.findPlaylist(jsonData['id'], true);
      if (existingPlaylist) {
        // Conflict, resolve with user
        const dialogFunc = state.socketServer.openDialog(event.target);
        const strings = state.languageContainer.dialog;
        const result = await dialogFunc({
          title: strings.playlistConflict,
          message:  `${formatString(strings.importedPlaylistAlreadyExists, existingPlaylist.title)}\n\n${strings.mergeOrStaySeperate}`,
          buttons: [strings.mergePlaylists, strings.newPlaylist, strings.cancel]
        });
        console.log(result);
        switch (result) {
          case 0:
            let topOrder = existingPlaylist.games.reduce((highest, cur) => highest = Math.max(highest, cur.order), 0);
            let addedGames = 0;
            for (let game of newPlaylist.games) {
              if (existingPlaylist.games.findIndex(g => g.gameId === game.gameId) === -1) {
                game.order = topOrder + addedGames + 1;
                existingPlaylist.games.push(game);
                addedGames++;
              }
            }
            newPlaylist.games = existingPlaylist.games;
            break;
          case 1:
            const newPlaylistId = uuid();
            newPlaylist.id = newPlaylistId;
            newPlaylist.title += ' - Copy';
            newPlaylist.games = newPlaylist.games.map(g => {
              g.id = undefined; // New Entry
              g.playlistId = newPlaylistId;
              return g;
            });
            break;
          default:
            throw 'User Cancelled';
        }
      }
      await GameManager.updatePlaylist(newPlaylist);
      respond<PlaylistsChangeData>(event.target, {
        id: req.id,
        type: BackOut.PLAYLISTS_CHANGE,
        data: await GameManager.findPlaylists()
      });
    } catch (e) {
      respond(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE
      });
    }
  });

  state.socketServer.register<ExportPlaylistData>(BackIn.EXPORT_PLAYLIST, async (event, req) => {
    const playlist = await GameManager.findPlaylist(req.data.id, true);
    if (playlist) {
      try {
        await writeFile(req.data.location, JSON.stringify(playlist, null, '\t'));
      } catch (e) { console.error(e); }
    }
    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE
    });
  });

  state.socketServer.register<ExportGameData>(BackIn.EXPORT_GAME, async (event, req) => {
    const reqData: ExportGameData = req.data;

    if (await pathExists(reqData.metaOnly ? path.dirname(reqData.location) : reqData.location)) {
      const game = await GameManager.findGame(reqData.id);
      if (game) {
        // Save to file
        try {
          await writeFile(
            reqData.metaOnly ? reqData.location : path.join(reqData.location, 'meta.txt'),
            stringifyCurationFormat(convertToCurationMeta(game, await TagManager.findTagCategories())));
        } catch (e) { console.error(e); }

        // Copy images
        if (!reqData.metaOnly) {
          const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
          const last = path.join(game.id.substr(0, 2), game.id.substr(2, 2), game.id+'.png');

          const oldLogoPath = path.join(imageFolder, LOGOS, last);
          const newLogoPath = path.join(reqData.location, 'logo.png');
          try {
            if (await pathExists(oldLogoPath)) { await copyFile(oldLogoPath, newLogoPath); }
          } catch (e) { console.error(e); }

          const oldScreenshotPath = path.join(imageFolder, SCREENSHOTS, last);
          const newScreenshotPath = path.join(reqData.location, 'ss.png');
          try {
            if (await pathExists(oldScreenshotPath)) { await copyFile(oldScreenshotPath, newScreenshotPath); }
          } catch (e) { console.error(e); }
        }
      }
    }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE
    });
  });

  state.socketServer.register<GetGameData>(BackIn.GET_GAME, async (event, req) => {
    respond<GetGameResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        game: await GameManager.findGame(req.data.id)
      }
    });
  });

  state.socketServer.register(BackIn.GET_ALL_GAMES, async (event, req) => {
    const results = await GameManager.findGames({}, false);

    const range = results[0];
    if (!range) { throw new Error('Failed to fetch all games. No range of games was in the result.'); }

    respond<GetAllGamesResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: { games: range.games },
    });
  });

  state.socketServer.register<RandomGamesData>(BackIn.RANDOM_GAMES, async (event, req) => {
    const games = await GameManager.findRandomGames(req.data.count, req.data.extreme, req.data.broken);

    respond<RandomGamesResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: games
    });
  });

  state.socketServer.register<BrowseViewKeysetData>(BackIn.BROWSE_VIEW_KEYSET, async (event, req) => {
    const result = await GameManager.findGamePageKeyset(req.data.query.filter, req.data.query.orderBy, req.data.query.orderReverse);
    respond<BrowseViewKeysetResponse>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        keyset: result.keyset,
        total: result.total,
      },
    });
  });

  state.socketServer.register<BrowseViewPageData>(BackIn.BROWSE_VIEW_PAGE, async (event, req) => {
    const results = await GameManager.findGames({
      ranges: req.data.ranges,
      filter: req.data.query.filter,
      orderBy: req.data.query.orderBy,
      direction: req.data.query.orderReverse,
    }, !!req.data.shallow);

    // idk why this is done, but it is probably here for a reason
    // @PERF Copying all game objects seems wasteful (I think both sets of objects are thrown away after this response? //obelisk)
    for (let i = 0; i < results.length; i++) {
      const range = results[i];
      for (let j = 0; j < range.games.length; j++) {
        range.games[j] = {
          ...range.games[j],
          tags: [],
        };
      }
    }

    respond<BrowseViewPageResponseData<boolean>>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        ranges: results,
        library: req.data.library,
      },
    });
  });

  state.socketServer.register<TagCategoryDeleteData>(BackIn.DELETE_TAG_CATEGORY, async (event, req) => {
    respond<TagCategoryDeleteResponse>(event.target, {
      id: req.id,
      type: BackOut.DELETE_TAG_CATEGORY,
      data: {
        success: await TagManager.deleteTagCategory(req.data, state.socketServer.openDialog(event.target))
      }
    });
    await TagManager.sendTagCategories(state.socketServer);
  });

  state.socketServer.register<TagCategoryByIdData>(BackIn.GET_TAG_CATEGORY_BY_ID, async (event, req) => {
    respond<TagCategoryByIdResponse>(event.target, {
      id: req.id,
      type: BackOut.GET_TAG_CATEGORY_BY_ID,
      data: await TagManager.getTagCategoryById(req.data)
    });
  });

  state.socketServer.register<TagCategorySaveData>(BackIn.SAVE_TAG_CATEGORY, async (event, req) => {
    respond<TagCategorySaveResponse>(event.target,  {
      id: req.id,
      type: BackOut.SAVE_TAG_CATEGORY,
      data: await TagManager.saveTagCategory(req.data)
    });
    await TagManager.sendTagCategories(state.socketServer);
  });

  state.socketServer.register<TagByIdData>(BackIn.GET_TAG_BY_ID, async (event, req) => {
    const tag = await TagManager.getTagById(req.data);

    respond<TagByIdResponse>(event.target,  {
      id: req.id,
      type: BackOut.GET_TAG_BY_ID,
      data: tag
    });
  });

  state.socketServer.register<TagFindData>(BackIn.GET_TAGS, async (event, req) => {
    respond<TagFindResponse>(event.target, {
      id: req.id,
      type: BackOut.GET_TAGS,
      data: await TagManager.findTags(req.data)
    });
  });

  state.socketServer.register<MergeTagData>(BackIn.MERGE_TAGS, async (event, req) => {
    const newTag = await TagManager.mergeTags(req.data, state.socketServer.openDialog(event.target));
    respond<Tag>(event.target, {
      id: req.id,
      type: BackOut.MERGE_TAGS,
      data: newTag
    });
  });

  state.socketServer.register(BackIn.CLEANUP_TAGS, async (event, req) => {
    const allTags = await TagManager.findTags();
    const commaTags = allTags.filter(t => t.primaryAlias.name.includes(','));
    for (let oldTag of commaTags) {
      const allAliases = oldTag.primaryAlias.name.split(',').map(a => a.trim());
      const tagsToAdd: Tag[] = [];
      for (let alias of allAliases) {
        let tag = await TagManager.findTag(alias);
        if (!tag) {
          // Tag doesn't exist, make a new one
          tag = await TagManager.createTag(alias);
        }
        // Add tag to list if unique
        if (tag) {
          if (tagsToAdd.findIndex(t => tag && tag.id == t.id) == -1) {
            tagsToAdd.push(tag);
          }
        }
      }
      // Edit each game with this tag
      const gamesToEdit = await GameManager.findGamesWithTag(oldTag);
      for (let i = 0; i < gamesToEdit.length; i++) {
        const game = gamesToEdit[i];
        // Remove old tag
        const oldTagIndex = game.tags.findIndex(t => t.id == oldTag.id);
        if (oldTagIndex > -1) {
          game.tags.splice(oldTagIndex, 1);
        }
        // Add new tags
        for (let newTag of tagsToAdd) {
          if (game.tags.findIndex(t => t.id == newTag.id) == -1) {
            game.tags.push(newTag);
          }
        }
        gamesToEdit[i] = game;
      }
      // Save all games
      await GameManager.updateGames(gamesToEdit);
      // Remove old tag
      if (oldTag.id) {
        await TagManager.deleteTag(oldTag.id, state.socketServer.openDialog(event.target));
      }
    }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE
    });
  });

  state.socketServer.register<TagDeleteData>(BackIn.DELETE_TAG, async (event, req) => {
    const success = await TagManager.deleteTag(req.data, state.socketServer.openDialog(event.target));
    respond<TagDeleteResponse>(event.target, {
      id: req.id,
      type: BackOut.DELETE_TAG,
      data: {
        success: success,
        id: req.data
      }
    });
  });

  state.socketServer.register<TagSaveData>(BackIn.SAVE_TAG, async (event, req) => {
    respond<TagSaveResponse>(event.target, {
      id: req.id,
      type: BackOut.SAVE_TAG,
      data: await TagManager.saveTag(req.data)
    });
  });

  state.socketServer.register<TagSuggestionsData>(BackIn.GET_TAG_SUGGESTIONS, async (event, req) => {
    respond<TagSuggestionsResponse>(event.target,  {
      id: req.id,
      type: BackOut.GET_TAG_SUGGESTIONS,
      data: await TagManager.findTagSuggestions(req.data)
    });
  });

  state.socketServer.register<BrowseViewIndexData>(BackIn.BROWSE_VIEW_INDEX, async (event, req) => {
    const position = await GameManager.findGameRow(
      req.data.gameId,
      req.data.query.filter,
      req.data.query.orderBy,
      req.data.query.orderReverse,
      undefined);

    respond<BrowseViewIndexResponse>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        index: position - 1, // ("position" starts at 1, while "index" starts at 0)
      },
    });
  });

  state.socketServer.register<SaveImageData>(BackIn.SAVE_IMAGE, async (event, req) => {
    const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
    const folder = sanitizeFilename(req.data.folder);
    const id = sanitizeFilename(req.data.id);
    const fullPath = path.join(imageFolder, folder, id.substr(0, 2), id.substr(2, 2), id + '.png');

    if (fullPath.startsWith(imageFolder)) { // (Ensure that it does not climb out of the image folder)
      try {
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, Buffer.from(req.data.content, 'base64'));
      } catch (e) {
        log(state, {
          source: 'Launcher',
          content: e + '',
        });
      }
    }

    respond<ImageChangeData>(event.target, {
      id: req.id,
      type: BackOut.IMAGE_CHANGE,
      data: {
        id: id,
        folder: folder,
      },
    });
  });

  state.socketServer.register<DeleteImageData>(BackIn.DELETE_IMAGE, async (event, req) => {
    const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
    const folder = sanitizeFilename(req.data.folder);
    const id = sanitizeFilename(req.data.id);
    const fullPath = path.join(imageFolder, folder, id.substr(0, 2), id.substr(2, 2), id + '.png');

    if (fullPath.startsWith(imageFolder)) { // (Ensure that it does not climb out of the image folder)
      try {
        if ((await stat(fullPath)).isFile()) {
          await unlink(fullPath);
          // @TODO Remove the two top folders if they are empty (so no empty folders are left hanging)
        }
      } catch (error) {
        if (error.code !== 'ENOENT') { console.error(error); }
      }
    }

    respond<ImageChangeData>(event.target, {
      id: req.id,
      type: BackOut.IMAGE_CHANGE,
      data: {
        id: id,
        folder: folder,
      },
    });
  });

  state.socketServer.register<UpdateConfigData>(BackIn.UPDATE_CONFIG, async(event, req) => {
    const newConfig = deepCopy(state.config);
    overwriteConfigData(newConfig, req.data);

    try { await ConfigFile.saveFile(path.join(state.configFolder, CONFIG_FILENAME), newConfig); }
    catch (error) { log(state, { source: 'Launcher', content: error }); }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
    });
  });

  state.socketServer.register<IAppPreferencesData>(BackIn.UPDATE_PREFERENCES, async (event, req) => {
    const dif = difObjects(defaultPreferencesData, state.preferences, req.data);
    if (dif) {
      if ((typeof dif.currentLanguage  !== 'undefined' && dif.currentLanguage  !== state.preferences.currentLanguage) ||
          (typeof dif.fallbackLanguage !== 'undefined' && dif.fallbackLanguage !== state.preferences.fallbackLanguage)) {
        state.languageContainer = createContainer(
          state.languages,
          (typeof dif.currentLanguage !== 'undefined') ? dif.currentLanguage : state.preferences.currentLanguage,
          state.localeCode,
          (typeof dif.fallbackLanguage !== 'undefined') ? dif.fallbackLanguage : state.preferences.fallbackLanguage
        );
        state.socketServer.broadcast<LanguageChangeData>({
          id: '',
          type: BackOut.LANGUAGE_CHANGE,
          data: state.languageContainer,
        });
      }

      overwritePreferenceData(state.preferences, dif);
      await PreferencesFile.saveFile(path.join(state.configFolder, PREFERENCES_FILENAME), state.preferences);
    }
    respond(event.target, {
      id: req.id,
      type: BackOut.UPDATE_PREFERENCES_RESPONSE,
      data: state.preferences,
    });
  });

  state.socketServer.register<ServiceActionData>(BackIn.SERVICE_ACTION, (event, req) => {
    const proc = state.services[req.data.id];
    if (proc) {
      switch (req.data.action) {
        case ProcessAction.START:
          proc.spawn();
          break;
        case ProcessAction.STOP:
          proc.kill();
          break;
        case ProcessAction.RESTART:
          proc.restart();
          break;
        default:
          console.warn('Unhandled Process Action');
      }
    }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
    });
  });

  state.socketServer.register<GetPlaylistData>(BackIn.GET_PLAYLIST, async (event, req) => {
    const playlist = await GameManager.findPlaylist(req.data);
    respond<GetPlaylistResponse>(event.target,  {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: playlist
    });
  });

  state.socketServer.register<any>(BackIn.CLEANUP_TAG_ALIASES, async (event, req) => {
    await TagManager.cleanupTagAliases();
    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
    });
  });

  state.socketServer.register<TagGetData>(BackIn.GET_TAG, async (event, req) => {
    respond<TagGetResponse>(event.target, {
      id: req.id,
      type: BackOut.GET_TAG,
      data: await TagManager.findTag(req.data)
    });
  });

  state.socketServer.register<TagPrimaryFixData>(BackIn.FIX_TAG_PRIMARY_ALIASES, async (event, req) => {
    const fixed = await TagManager.fixPrimaryAliases();
    respond<TagPrimaryFixResponse>(event.target, {
      id: req.id,
      type: BackOut.FIX_TAG_PRIMARY_ALIASES,
      data: fixed
    });
  });

  state.socketServer.register<TagGetOrCreateData>(BackIn.GET_OR_CREATE_TAG, async (event, req) => {
    const name = req.data.tag.trim();
    const category = req.data.tagCategory ? req.data.tagCategory.trim() : undefined;
    let tag = await TagManager.findTag(name);
    if (!tag) {
      // Tag doesn't exist, make a new one
      tag = await TagManager.createTag(name, category);
    }
    respond<Tag>(event.target,  {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: tag
    });
  });

  state.socketServer.register(BackIn.GET_PLAYLISTS, async (event, req) => {
    const playlists = await GameManager.findPlaylists();
    respond<GetPlaylistsResponse>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: playlists,
    });
  });

  state.socketServer.register<SavePlaylistData>(BackIn.SAVE_PLAYLIST, async (event, req) => {
    const playlist = await GameManager.updatePlaylist(req.data);
    respond<SavePlaylistResponse>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: playlist
    });
    state.queries = {};
  });

  state.socketServer.register<DeletePlaylistData>(BackIn.DELETE_PLAYLIST, async (event, req) => {
    const playlist = await GameManager.removePlaylist(req.data);
    respond<DeletePlaylistResponse>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: playlist
    });
    state.queries = {};
  });

  state.socketServer.register<GetPlaylistGameData>(BackIn.GET_PLAYLIST_GAME, async (event, req) => {
    const playlistGame = await GameManager.findPlaylistGame(req.data.playlistId, req.data.gameId);
    respond<GetPlaylistGameResponse>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: playlistGame
    });
  });

  state.socketServer.register<SavePlaylistGameData>(BackIn.SAVE_PLAYLIST_GAME, async (event, req) => {
    const playlistGame = await GameManager.updatePlaylistGame(req.data);
    respond<SavePlaylistGameResponse>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: playlistGame
    });
    state.queries = {};
  });

  state.socketServer.register<DeletePlaylistGameData>(BackIn.DELETE_PLAYLIST_GAME, async (event, req) => {
    const playlistGame = await GameManager.removePlaylistGame(req.data.playlistId, req.data.gameId);
    respond<DeletePlaylistGameResponse>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: playlistGame
    });
    state.queries = {};
  });

  state.socketServer.register<SaveLegacyPlatformData>(BackIn.SAVE_LEGACY_PLATFORM, async (event, req) => {
    const platform = req.data;
    const translatedGames = [];
    for (let game of platform.collection.games) {
      const addApps = platform.collection.additionalApplications.filter(a => a.gameId === game.id);
      const translatedGame = await createGameFromLegacy(game);
      translatedGame.addApps = createAddAppFromLegacy(addApps, translatedGame);
      translatedGames.push(translatedGame);
    }
    await GameManager.updateGames(translatedGames);
    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE
    });
  });

  state.socketServer.register<ImportCurationData>(BackIn.IMPORT_CURATION, async (event, req) => {
    let error: any | undefined;
    try {
      await importCuration({
        curation: req.data.curation,
        gameManager: state.gameManager,
        log: req.data.log ? log.bind(undefined, state) : undefined,
        date: (req.data.date !== undefined) ? new Date(req.data.date) : undefined,
        saveCuration: req.data.saveCuration,
        fpPath: state.config.flashpointPath,
        imageFolderPath: state.config.imageFolderPath,
        openDialog: state.socketServer.openDialog(event.target),
        openExternal: state.socketServer.openExternal(event.target),
        tagCategories: await TagManager.findTagCategories()
      });
      state.queries = {};
    } catch (e) {
      if (util.types.isNativeError(e)) {
        error = copyError(e);
      } else {
        error = e;
      }
    }

    respond<ImportCurationResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: { error: error || undefined },
    });
  });

  state.socketServer.register<LaunchCurationData>(BackIn.LAUNCH_CURATION, async (event, req) => {
    const skipLink = (req.data.key === state.lastLinkedCurationKey);
    state.lastLinkedCurationKey = req.data.key;
    try {
      if (state.serviceInfo) {
        // Make sure all 3 relevant server infos are present before considering MAD4FP opt
        const configServer = state.serviceInfo.server.find(s => s.name === state.config.server);
        const mad4fpServer = state.serviceInfo.server.find(s => s.mad4fp);
        const activeServer: INamedBackProcessInfo | undefined = state.services.server?.info;
        if (activeServer && configServer && mad4fpServer) {
          if (req.data.mad4fp && !activeServer.mad4fp) {
            // Swap to mad4fp server
            await waitForServiceDeath(state.services.server);
            const mad4fpServerCopy = deepCopy(mad4fpServer);
            // Set the content folder path as the final parameter
            mad4fpServerCopy.arguments.push(getContentFolderByKey(req.data.key, state.config.flashpointPath));
            state.services.server = runService(state, 'server', 'Server', mad4fpServerCopy);
          } else if (!req.data.mad4fp && activeServer.mad4fp && !configServer.mad4fp) {
            // Swap to mad4fp server
            await waitForServiceDeath(state.services.server);
            state.services.server = runService(state, 'server', 'Server', configServer);
          }
        }
      }

      await launchCuration(req.data.key, req.data.meta, req.data.addApps, skipLink, {
        fpPath: path.resolve(state.config.flashpointPath),
        native: state.config.nativePlatforms.some(p => p === req.data.meta.platform),
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        log: log.bind(undefined, state),
        openDialog: state.socketServer.openDialog(event.target),
        openExternal: state.socketServer.openExternal(event.target),
      });
    } catch (e) {
      log(state, {
        source: 'Launcher',
        content: e + '',
      });
    }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: undefined,
    });
  });

  state.socketServer.register<LaunchCurationAddAppData>(BackIn.LAUNCH_CURATION_ADDAPP, async (event, req) => {
    const skipLink = (req.data.curationKey === state.lastLinkedCurationKey);
    state.lastLinkedCurationKey = req.data.curationKey;
    try {
      await launchAddAppCuration(req.data.curationKey, req.data.curation, skipLink, {
        fpPath: path.resolve(state.config.flashpointPath),
        native: state.config.nativePlatforms.some(p => p === req.data.platform) || false,
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        log: log.bind(undefined, state),
        openDialog: state.socketServer.openDialog(event.target),
        openExternal: state.socketServer.openExternal(event.target),
      });
    } catch (e) {
      log(state, {
        source: 'Launcher',
        content: e + '',
      });
    }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: undefined,
    });
  });

  state.socketServer.register(BackIn.SYNC_GAME_METADATA, async (event, req) => {
    let syncableGames: SyncableGames = { total: 0, successes: 0, games: [] };
    try {
      syncableGames = await MetadataServerApi.getUpdatedGames(state.config.metadataServerHost, state.config.lastSync);
    } catch (error) {
      respond<GameMetadataSyncResponse>(event.target, {
        id: req.id,
        type: BackOut.SYNC_GAME_METADATA,
        data: {
          total: 0,
          successes: 0,
          error: error.message
        }
      });
      return;
    }

    // Top level games
    for (let game of syncableGames.games.filter(g => g.parentGameId === g.id)) {
      await GameManager.updateGame(game);
    }
    // Child games, Constraint will throw if parent game is missing
    for (let game of syncableGames.games.filter(g => g.parentGameId !== g.id)) {
      try {
        await GameManager.updateGame(game);
      } catch (error) {
        console.error('Parent Game Missing? - ' + error);
      }
    }

    respond<GameMetadataSyncResponse>(event.target, {
      id: req.id,
      type: BackOut.SYNC_GAME_METADATA,
      data: {
        total: syncableGames.total,
        successes: syncableGames.successes
      }
    });
  });

  state.socketServer.register(BackIn.UPLOAD_LOG, async (event, req) => {
    // Upload to log server
    const entries = state.log.filter(e => e !== undefined);
    const postUrl = url.resolve(state.config.logsBaseUrl, 'logdata');
    // Server responds with log id e.g ABC123
    const res = await axios.post(postUrl, { entries: entries });
    const id = res.data;
    // Form into GET URL
    let getUrl: string | undefined;
    if (id) {
      getUrl = url.resolve(state.config.logsBaseUrl, `log?id=${id}`);
    }
    // Send back to client
    respond<UploadLogResponse>(event.target, {
      id: req.id,
      type: BackOut.UPLOAD_LOG,
      data: getUrl
    });
  });

  state.socketServer.register(BackIn.QUIT, (event, req) => {
    respond(event.target, {
      id: req.id,
      type: BackOut.QUIT,
    });
    exit(state);
  });

  state.socketServer.register<ExportMetaEditData>(BackIn.EXPORT_META_EDIT, async (event, req) => {
    if (req.data) {
      const game = await GameManager.findGame(req.data.id);
      if (game) {
        const meta: MetaEditMeta = {
          id: game.id,
        };

        const keys = Object.keys(req.data.properties) as (keyof typeof req.data.properties)[];
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (req.data.properties[key]) {
            if (key === 'tags') {
              meta.tags = game.tags.map(tag => tag.primaryAlias.name);
            } else {
              (meta as any)[key] = game[key]; // (I wish typescript could understand this...)
            }
          }
        }

        const output: MetaEditFile = {
          metas: [meta],
          launcherVersion: state.version,
        };

        const folderPath = path.join(state.config.flashpointPath, state.config.metaEditsFolderPath);
        const filePath = path.join(folderPath, game.id + '.json');
        try {
          let save = true;

          if (await pathExists(filePath)) {
            const strings = state.languageContainer;
            const result = await state.socketServer.openDialog(event.target)({
              type: 'warning',
              title: strings.dialog.overwriteFileTitle,
              message: strings.dialog.overwriteFileMessage,
              detail: `${strings.dialog.overwriteFileDetail}\n${filePath}`,
              buttons: [strings.misc.yes, strings.misc.no],
              cancelId: 1,
            });

            if (result === 1) { save = false; }
          }

          if (save) {
            await ensureDir(folderPath);
            await writeFile(filePath, JSON.stringify(output, null, '\t'));
          }
        } catch (error) {
          log(state, {
            source: 'Launcher',
            content: `Failed to export meta edit.\nError: ${error.message || error}`,
          });
        }
      }
    }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
    });
  });

  state.socketServer.register<undefined>(BackIn.IMPORT_META_EDITS, async (event, req) => {
    const result = await importAllMetaEdits(
      path.join(state.config.flashpointPath, state.config.metaEditsFolderPath),
      state.socketServer.openDialog(event.target),
    );

    respond<ImportMetaEditResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: result,
    });
  });
}

/**
 * Recursively iterate over all properties of the template object and compare the values of the same
 * properties in object A and B. All properties that are not equal will be added to the returned object.
 * Missing properties, or those with the value undefined, in B will be ignored.
 * If all property values are equal undefined is returned.
 * @param template Template object. Iteration will be done over this object.
 * @param a Compared to B.
 * @param b Compared to A. Values in the returned object is copied from this.
 */
function difObjects<T>(template: T, a: T, b: DeepPartial<T>): DeepPartial<T> | undefined {
  let dif: DeepPartial<T> | undefined;
  for (let key in template) {
    if (a[key] !== b[key] && b[key] !== undefined) {
      if (typeof template[key] === 'object' && typeof a[key] === 'object' && typeof b[key] === 'object') {
        // Note: TypeScript doesn't understand that it is not possible for b[key] to be undefined here
        const subDif = difObjects(template[key], a[key], b[key] as any);
        if (subDif) {
          if (!dif) { dif = {}; }
          dif[key] = (subDif as any);
        }
      } else {
        if (!dif) { dif = {}; }
        dif[key] = (b[key] as any);
      }
    }
  }
  return dif;
}
