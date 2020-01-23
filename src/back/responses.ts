import { AddLogData, BackIn, BackInit, BackOut, BrowseChangeData, BrowseViewIndexData, BrowseViewIndexResponseData, BrowseViewPageData, BrowseViewPageResponseData, DeleteGameData, DeleteImageData, DeletePlaylistData, DuplicateGameData, ExportGameData, GetAllGamesResponseData, GetExecData, GetGameData, GetGameResponseData, GetGamesTotalResponseData, GetMainInitDataResponse, GetPlaylistResponse, GetRendererInitDataResponse, GetSuggestionsResponseData, ImageChangeData, ImportCurationData, ImportCurationResponseData, InitEventData, LanguageChangeData, LaunchAddAppData, LaunchCurationAddAppData, LaunchCurationData, LaunchGameData, LocaleUpdateData, QuickSearchData, QuickSearchResponseData, RandomGamesData, RandomGamesResponseData, SaveGameData, SaveImageData, SavePlaylistData, ServiceActionData, SetLocaleData, UpdateConfigData, ViewGame } from '@shared/back/types';
import { overwriteConfigData } from '@shared/config/util';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import { findMostUsedApplicationPaths } from '@shared/curate/defaultValues';
import { stringifyCurationFormat } from '@shared/curate/format/stringifier';
import { convertToCurationMeta } from '@shared/curate/metaToMeta';
import { FilterGameOpts, filterGames, orderGames, orderGamesInPlaylist } from '@shared/game/GameFilter';
import { IAdditionalApplicationInfo, IGameInfo } from '@shared/game/interfaces';
import { DeepPartial, GamePlaylist, IService, ProcessAction } from '@shared/interfaces';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { IAppPreferencesData } from '@shared/preferences/interfaces';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { defaultPreferencesData, overwritePreferenceData } from '@shared/preferences/util';
import { deepCopy } from '@shared/Util';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { ConfigFile } from './ConfigFile';
import { CONFIG_FILENAME, PREFERENCES_FILENAME } from './constants';
import { GameManager } from './game/GameManager';
import { GameLauncher } from './GameLauncher';
import { importCuration, launchAddAppCuration, launchCuration } from './importGame';
import { PlaylistFile } from './PlaylistFile';
import { respond } from './SocketServer';
import { getSuggestions } from './suggestions';
import { BackQuery, BackQueryChache, BackState } from './types';
import { copyError, createContainer, exit, log, pathExists, procToService } from './util/misc';
import { sanitizeFilename } from './util/sanitizeFilename';
import { uuid } from './util/uuid';

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

  state.socketServer.register(BackIn.GET_RENDERER_INIT_DATA, (event, req) => {
    const services: IService[] = [];
    if (state.services.server) { services.push(procToService(state.services.server)); }
    if (state.services.redirector) { services.push(procToService(state.services.redirector)); }

    state.languageContainer = createContainer(
      state.languages,
      state.preferences.currentLanguage,
      state.localeCode,
      state.preferences.fallbackLanguage
    );

    const platforms: Record<string, string[]> = {}; // platforms[library] = [platform1, platform2 etc.]
    for (let i = 0; i < state.gameManager.platforms.length; i++) {
      const p = state.gameManager.platforms[i];
      if (!platforms[p.library]) { platforms[p.library] = []; }
      platforms[p.library].push(p.name);
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
        playlists: state.init[BackInit.PLAYLISTS] ? state.playlists : undefined,
        platforms: platforms,
        localeCode: state.localeCode,
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

  state.socketServer.register(BackIn.GET_SUGGESTIONS, (event, req) => {
    const games = allGames(state);
    respond<GetSuggestionsResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        suggestions: getSuggestions(games, getLibraries(state)),
        appPaths: findMostUsedApplicationPaths(games),
      },
    });
  });

  state.socketServer.register(BackIn.GET_GAMES_TOTAL, (event, req) => {
    respond<GetGamesTotalResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: countGames(state),
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

  state.socketServer.register<LaunchAddAppData>(BackIn.LAUNCH_ADDAPP, (event, req) => {
    const platforms = state.gameManager.platforms;
    for (let i = 0; i < platforms.length; i++) {
      const addApp = platforms[i].collection.additionalApplications.find(item => item.id === req.data.id);
      if (addApp) {
        const game = findGame(state, addApp.gameId);
        GameLauncher.launchAdditionalApplication({
          addApp,
          fpPath: path.resolve(state.config.flashpointPath),
          native: game && state.config.nativePlatforms.some(p => p === game.platform) || false,
          execMappings: state.execMappings,
          lang: state.languageContainer,
          log: log.bind(undefined, state),
          openDialog: state.socketServer.openDialog(event.target),
          openExternal: state.socketServer.openExternal(event.target),
        });
        break;
      }
    }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: undefined
    });
  });

  state.socketServer.register<LaunchGameData>(BackIn.LAUNCH_GAME, (event, req) => {
    const game = findGame(state, req.data.id);
    const addApps = findAddApps(state, req.data.id);

    if (game) {
      GameLauncher.launchGame({
        game,
        addApps,
        fpPath: path.resolve(state.config.flashpointPath),
        native: state.config.nativePlatforms.some(p => p === game.platform),
        execMappings: state.execMappings,
        lang: state.languageContainer,
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
    const result = GameManager.updateMeta(state.gameManager, {
      game: req.data.game,
      addApps: req.data.addApps || [],
    });

    if (req.data.saveToFile) {
      await GameManager.savePlatforms(state.gameManager, result.edited);
    }

    state.queries = {}; // Clear entire cache

    respond<BrowseChangeData>(event.target, {
      id: req.id,
      type: BackOut.BROWSE_CHANGE,
      data: {
        library: req.data.library,
        gamesTotal: countGames(state),
      }
    });
  });

  state.socketServer.register<DeleteGameData>(BackIn.DELETE_GAME, async (event, req) => {
    const result = GameManager.removeGameAndAddApps(state.gameManager, req.data.id);

    await GameManager.savePlatforms(state.gameManager, result.edited);

    state.queries = {}; // Clear entire cache

    respond<BrowseChangeData>(event.target, {
      id: req.id,
      type: BackOut.BROWSE_CHANGE,
      data: {
        library: undefined,
        gamesTotal: countGames(state),
      }
    });
  });

  state.socketServer.register<DuplicateGameData>(BackIn.DUPLICATE_GAME, async (event, req) => {
    const game = findGame(state, req.data.id);
    if (game) {
      const addApps = findAddApps(state, req.data.id);

      // Copy and apply new IDs
      const newGame = deepCopy(game);
      const newAddApps = addApps.map(addApp => deepCopy(addApp));
      newGame.id = uuid();
      for (let j = 0; j < newAddApps.length; j++) {
        newAddApps[j].id = uuid();
        newAddApps[j].gameId = newGame.id;
      }

      // Add copies
      const result = GameManager.updateMeta(state.gameManager, {
        game: newGame,
        addApps: newAddApps,
      });

      await GameManager.savePlatforms(state.gameManager, result.edited);

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
      type: BackOut.BROWSE_CHANGE,
      data: {
        library: undefined,
        gamesTotal: countGames(state),
      }
    });
  });

  state.socketServer.register<ExportGameData>(BackIn.EXPORT_GAME, async (event, req) => {
    if (await pathExists(req.data.metaOnly ? path.dirname(req.data.location) : req.data.location)) {
      const game = findGame(state, req.data.id);
      if (game) {
        const addApps = findAddApps(state, req.data.id);

        // Save to file
        try {
          await writeFile(
            req.data.metaOnly ? req.data.location : path.join(req.data.location, 'meta.txt'),
            stringifyCurationFormat(convertToCurationMeta(game, addApps)));
        } catch (e) { console.error(e); }

        // Copy images
        if (!req.data.metaOnly) {
          const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
          const last = path.join(game.id.substr(0, 2), game.id.substr(2, 2), game.id+'.png');

          const oldLogoPath = path.join(imageFolder, LOGOS, last);
          const newLogoPath = path.join(req.data.location, 'logo.png');
          try {
            if (await pathExists(oldLogoPath)) { await copyFile(oldLogoPath, newLogoPath); }
          } catch (e) { console.error(e); }

          const oldScreenshotPath = path.join(imageFolder, SCREENSHOTS, last);
          const newScreenshotPath = path.join(req.data.location, 'ss.png');
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

  state.socketServer.register<GetGameData>(BackIn.GET_GAME, (event, req) => {
    respond<GetGameResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        game: findGame(state, req.data.id),
        addApps: findAddApps(state, req.data.id),
      }
    });
  });

  state.socketServer.register(BackIn.GET_ALL_GAMES, (event, req) => {
    const games: IGameInfo[] = [];
    for (let i = 0; i < state.gameManager.platforms.length; i++) {
      const platform = state.gameManager.platforms[i];
      games.splice(games.length, 0, ...platform.collection.games);
    }

    respond<GetAllGamesResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: { games }
    });
  });

  state.socketServer.register<RandomGamesData>(BackIn.RANDOM_GAMES, (event, req) => {
    let allGames: IGameInfo[] = [];
    for (let platform of state.gameManager.platforms) {
      Array.prototype.push.apply(allGames, platform.collection.games);
    }

    if (!req.data.extreme) {
      allGames = allGames.filter(game => !game.extreme);
    }

    if (!req.data.broken) {
      allGames = allGames.filter(game => !game.broken);
    }

    const pickedGames: IGameInfo[] = [];
    for (let i = 0; i < req.data.count; i++) {
      const index = (Math.random() * allGames.length) | 0;
      const game = allGames[index];
      if (game) {
        pickedGames.push(game);
        allGames.splice(index, 1);
      }
    }

    respond<RandomGamesResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: pickedGames
    });
  });

  state.socketServer.register<BrowseViewPageData>(BackIn.BROWSE_VIEW_PAGE, (event, req) => {
    const query: BackQuery = {
      extreme: req.data.query.extreme,
      broken: req.data.query.broken,
      library: req.data.query.library,
      search: req.data.query.search,
      orderBy: req.data.query.orderBy as GameOrderBy,
      orderReverse: req.data.query.orderReverse as GameOrderReverse,
      playlistId: req.data.query.playlistId,
    };

    const hash = createHash('sha256').update(JSON.stringify(query)).digest('base64');
    let cache = state.queries[hash];
    if (!cache) { state.queries[hash] = cache = queryGames(state, query); } // @TODO Start clearing the cache if it gets too full

    respond<BrowseViewPageResponseData>(event.target, {
      id: req.id,
      type: BackOut.BROWSE_VIEW_PAGE_RESPONSE,
      data: {
        games: cache.viewGames.slice(req.data.offset, req.data.offset + req.data.limit),
        offset: req.data.offset,
        total: cache.games.length,
      },
    });
  });

  state.socketServer.register<BrowseViewIndexData>(BackIn.BROWSE_VIEW_INDEX, (event, req) => {
    const query: BackQuery = {
      extreme: req.data.query.extreme,
      broken: req.data.query.broken,
      library: req.data.query.library,
      search: req.data.query.search,
      orderBy: req.data.query.orderBy as GameOrderBy,
      orderReverse: req.data.query.orderReverse as GameOrderReverse,
      playlistId: req.data.query.playlistId,
    };

    const hash = createHash('sha256').update(JSON.stringify(query)).digest('base64');
    let cache = state.queries[hash];
    if (!cache) { state.queries[hash] = cache = queryGames(state, query); } // @TODO Start clearing the cache if it gets too full

    let index = -1;
    for (let i = 0; i < cache.viewGames.length; i++) {
      if (cache.viewGames[i].id === req.data.gameId) {
        index = i;
        break;
      }
    }

    respond<BrowseViewIndexResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: { index },
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

  state.socketServer.register<QuickSearchData>(BackIn.QUICK_SEARCH, (event, req) => {
    const query: BackQuery = {
      extreme: req.data.query.extreme,
      broken: req.data.query.broken,
      library: req.data.query.library,
      search: req.data.query.search,
      orderBy: req.data.query.orderBy as GameOrderBy,
      orderReverse: req.data.query.orderReverse as GameOrderReverse,
      playlistId: req.data.query.playlistId,
    };

    const hash = createHash('sha256').update(JSON.stringify(query)).digest('base64');
    let cache = state.queries[hash];
    if (!cache) { state.queries[hash] = cache = queryGames(state, query); }

    let result: string | undefined;
    let index: number | undefined;
    for (let i = 0; i < cache.games.length; i++) {
      if (cache.games[i].title.toLowerCase().startsWith(req.data.search)) {
        index = i;
        result = cache.games[i].id;
        break;
      }
    }

    respond<QuickSearchResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        id: result,
        index: index,
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

  state.socketServer.register(BackIn.GET_PLAYLISTS, (event, req) => {
    respond<GetPlaylistResponse>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: state.playlists,
    });
  });

  state.socketServer.register<SavePlaylistData>(BackIn.SAVE_PLAYLIST, async (event, req) => {
    const folder = state.playlistWatcher.getFolder();
    const filename = sanitizeFilename(req.data.playlist.filename || `${req.data.playlist.title}.json`);
    if (folder && filename) {
      if (req.data.prevFilename === filename) { // (Existing playlist)
        await PlaylistFile.saveFile(path.join(folder, filename), req.data.playlist);
      } else {
        let coolFilename = filename;

        // Attempt to find an available filename
        if (await pathExists(path.join(folder, filename))) {
          const parts: string[] = [];

          // Split filename into "name" and "extension"
          const dotIndex = filename.lastIndexOf('.');
          if (dotIndex >= 0) {
            parts.push(coolFilename.substr(0, dotIndex));
            parts.push(coolFilename.substr(dotIndex));
          } else {
            parts.push(coolFilename);
          }

          // Attempt extracting a "number" from the "name"
          let n = 2;
          const match = parts[parts.length - 1].match(/ \d+$/);
          if (match) {
            n = parseInt(match[0]) + 1;
            parts[parts.length - 1] = parts[parts.length - 1].replace(/ \d+$/, '');
          }

          // Add space between "name" and "number"
          if (parts.length > 1 && parts[0].length > 0 && !parts[0].endsWith(' ')) { parts[0] += ' '; }

          // Increment the "number" and try again a few times
          let foundName = false;
          while (n < 100) {
            const str = `${parts[0] || ''}${n++}${parts[1] || ''}`;
            if (!(await pathExists(path.join(folder, str)))) {
              foundName = true;
              coolFilename = str;
              break;
            }
          }

          if (!foundName) { coolFilename = ''; } // Abort save
        }

        if (coolFilename) {
          await PlaylistFile.saveFile(path.join(folder, coolFilename), req.data.playlist);

          // Delete old playlist (if renaming it)
          if (req.data.prevFilename) {
            await deletePlaylist(req.data.prevFilename, folder, state.playlists);
          }
        }
      }
    }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
    });
  });

  state.socketServer.register<DeletePlaylistData>(BackIn.DELETE_PLAYLIST, async (event, req) => {
    const folder = state.playlistWatcher.getFolder();
    if (folder) { await deletePlaylist(req.data, folder, state.playlists); }

    respond(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
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
      });
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
    try {
      await launchCuration(req.data.key, req.data.meta, req.data.addApps, {
        fpPath: path.resolve(state.config.flashpointPath),
        native: state.config.nativePlatforms.some(p => p === req.data.meta.platform),
        execMappings: state.execMappings,
        lang: state.languageContainer,
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
    try {
      await launchAddAppCuration(req.data.curationKey, req.data.curation, {
        fpPath: path.resolve(state.config.flashpointPath),
        native: state.config.nativePlatforms.some(p => p === req.data.platform) || false,
        execMappings: state.execMappings,
        lang: state.languageContainer,
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

  state.socketServer.register(BackIn.QUIT, (event, req) => {
    respond(event.target, {
      id: req.id,
      type: BackOut.QUIT,
    });
    exit(state);
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

type SearchGamesOpts = {
  extreme: boolean;
  broken: boolean;
  playlist?: GamePlaylist;
  /** String to use as a search query */
  query: string;
  /** The field to order the games by. */
  orderBy: GameOrderBy;
  /** The way to order the games. */
  orderReverse: GameOrderReverse;
  /** Library to search (all if none) */
  library?: string;
}

function searchGames(state: BackState, opts: SearchGamesOpts): IGameInfo[] {
  // Build opts from preferences and query
  const filterOpts: FilterGameOpts = {
    search: opts.query,
    extreme: opts.extreme,
    broken: opts.broken,
    playlist: opts.playlist,
  };

  // Filter games
  const platforms = state.gameManager.platforms;
  let foundGames: IGameInfo[] = [];
  for (let i = 0; i < platforms.length; i++) {
    // If library matches filter, or no library filter given, filter this platforms games
    if (!opts.library || platforms[i].library === opts.library) {
      foundGames = foundGames.concat(filterGames(platforms[i].collection.games, filterOpts));
    }
  }

  // Order games
  if (opts.playlist) {
    orderGamesInPlaylist(foundGames, opts.playlist);
  } else {
    orderGames(foundGames, { orderBy: opts.orderBy, orderReverse: opts.orderReverse });
  }

  return foundGames;
}

async function deletePlaylist(id: string, folder: string, playlists: GamePlaylist[]): Promise<void> {
  if (id && folder !== undefined) { // (Check if id is not empty and if the folder watcher is set up)
    const playlist = playlists.find(p => p.filename === id);
    if (playlist) {
      const filepath = path.join(folder, playlist.filename);
      if (filepath.length > folder.length && filepath.startsWith(folder)) { // (Ensure that the filepath doesnt climb out of the platylist folder)
        await unlink(filepath);
      }
    }
  }
}

function queryGames(state: BackState, query: BackQuery): BackQueryChache {
  const playlist = state.playlists.find(p => p.filename === query.playlistId);

  const results = searchGames(state, {
    extreme: query.extreme,
    broken: query.broken,
    query: query.search,
    orderBy: query.orderBy,
    orderReverse: query.orderReverse,
    library: query.library,
    playlist: playlist,
  });

  const viewGames: ViewGame[] = [];
  for (let i = 0; i < results.length; i++) {
    const g = results[i];
    viewGames[i] = {
      id: g.id,
      title: g.title,
      platform: g.platform,
      genre: g.tags,
      developer: g.developer,
      publisher: g.publisher,
    };
  }

  return {
    query: query,
    games: results,
    viewGames: viewGames,
  };
}

/** Find the game with the specified ID. */
function findGame(state: BackState, gameId: string): IGameInfo | undefined {
  const platforms = state.gameManager.platforms;
  for (let i = 0; i < platforms.length; i++) {
    const games = platforms[i].collection.games;
    for (let j = 0; j < games.length; j++) {
      if (games[j].id === gameId) { return games[j]; }
    }
  }
}

/** Find all add apps with the specified game ID. */
function findAddApps(state: BackState, gameId: string): IAdditionalApplicationInfo[] {
  const result: IAdditionalApplicationInfo[] = [];
  const platforms = state.gameManager.platforms;
  for (let i = 0; i < platforms.length; i++) {
    const addApps = platforms[i].collection.additionalApplications;
    for (let j = 0; j < addApps.length; j++) {
      if (addApps[j].gameId === gameId) { result.push(addApps[j]); }
    }
  }
  return result;
}

function countGames(state: BackState): number {
  let count = 0;
  const platforms = state.gameManager.platforms;
  for (let i = 0; i < platforms.length; i++) {
    count += platforms[i].collection.games.length;
  }
  return count;
}

function getLibraries(state: BackState): string[] {
  const platforms = state.gameManager.platforms;
  const libraries: string[] = [];
  for (let i = 0; i < platforms.length; i++) {
    const library = platforms[i].library;
    if (libraries.indexOf(library) === -1) { libraries.push(library); }
  }
  return libraries;
}

/** Create an array with all games in the game manager. */
function allGames(state: BackState): IGameInfo[] {
  const games: IGameInfo[] = [];
  const platforms = state.gameManager.platforms;
  for (let i = 0; i < platforms.length; i++) {
    Array.prototype.push.apply(games, platforms[i].collection.games);
  }
  return games;
}
