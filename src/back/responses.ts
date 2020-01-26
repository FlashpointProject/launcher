import { Game } from '@database/entity/Game';
import { AddLogData, BackIn, BackInit, BackOut, BrowseChangeData, BrowseViewIndexData, BrowseViewIndexResponse, BrowseViewPageData, BrowseViewPageResponseData, DeleteGameData, DeleteImageData, DeletePlaylistData, DeletePlaylistGameData, DeletePlaylistGameResponse, DeletePlaylistResponse, DuplicateGameData, ExportGameData, GetAllGamesResponseData, GetExecData, GetGameData, GetGameResponseData, GetGamesTotalResponseData, GetMainInitDataResponse, GetPlaylistData, GetPlaylistGameData, GetPlaylistGameResponse, GetPlaylistResponse, GetPlaylistsResponse, GetRendererInitDataResponse, GetSuggestionsResponseData, ImageChangeData, ImportCurationData, ImportCurationResponseData, InitEventData, LanguageChangeData, LaunchAddAppData, LaunchCurationAddAppData, LaunchCurationData, LaunchGameData, LocaleUpdateData, RandomGamesData, RandomGamesResponseData, SaveGameData, SaveImageData, SavePlaylistData, SavePlaylistGameData, SavePlaylistGameResponse, SavePlaylistResponse, ServiceActionData, SetLocaleData, UpdateConfigData, ViewGame, SearchGamesOpts, SearchGamesResponse } from '@shared/back/types';
import { overwriteConfigData } from '@shared/config/util';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import { findMostUsedApplicationPaths } from '@shared/curate/defaultValues';
import { stringifyCurationFormat } from '@shared/curate/format/stringifier';
import { convertToCurationMeta } from '@shared/curate/metaToMeta';
import { DeepPartial, IService, ProcessAction } from '@shared/interfaces';
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
import { respond } from './SocketServer';
import { getSuggestions } from './suggestions';
import { BackQuery, BackQueryChache, BackState } from './types';
import { copyError, createContainer, exit, log, pathExists, procToService } from './util/misc';
import { sanitizeFilename } from './util/sanitizeFilename';
import { uuid } from './util/uuid';
import { shallow } from 'enzyme';

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
    if (state.services.redirector) { services.push(procToService(state.services.redirector)); }

    state.languageContainer = createContainer(
      state.languages,
      state.preferences.currentLanguage,
      state.localeCode,
      state.preferences.fallbackLanguage
    );

    const libraries = await GameManager.findLibraries();
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

  state.socketServer.register(BackIn.GET_SUGGESTIONS, async (event, req) => {
    const { games } = await GameManager.findGames();
    respond<GetSuggestionsResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        suggestions: getSuggestions(games, await GameManager.findLibraries()),
        appPaths: findMostUsedApplicationPaths(games),
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
      GameLauncher.launchAdditionalApplication({
        addApp,
        fpPath: path.resolve(state.config.flashpointPath),
        native: addApp.parentGame && state.config.nativePlatforms.some(p => p === addApp.parentGame.platform) || false,
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

  state.socketServer.register<LaunchGameData>(BackIn.LAUNCH_GAME, async (event, req) => {
    const reqData: LaunchGameData = req.data;
    const game = await GameManager.findGame(reqData.id);

    if (game) {
      GameLauncher.launchGame({
        game,
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
    const game = await GameManager.updateGame(req.data);
    state.queries = {}; // Clear entire cache

    respond<BrowseChangeData>(event.target, {
      id: req.id,
      type: BackOut.BROWSE_CHANGE,
      data: {
        game: game,
        gamesTotal: await GameManager.countGames(),
      }
    });
  });

  state.socketServer.register<DeleteGameData>(BackIn.DELETE_GAME, async (event, req) => {
    const reqData: DeleteGameData = req.data;
    await GameManager.removeGameAndAddApps(reqData.id);

    state.queries = {}; // Clear entire cache

    respond<BrowseChangeData>(event.target, {
      id: req.id,
      type: BackOut.BROWSE_CHANGE,
      data: {
        game: undefined,
        gamesTotal: await GameManager.countGames(),
      }
    });
  });

  state.socketServer.register<DuplicateGameData>(BackIn.DUPLICATE_GAME, async (event, req) => {
    const game = await GameManager.findGame(req.data.id);
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
      const result = GameManager.updateGame(newGame);

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
        game: undefined,
        gamesTotal: await GameManager.countGames(),
      }
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
            stringifyCurationFormat(convertToCurationMeta(game)));
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
    const { games } = await GameManager.findGames();
    respond<GetAllGamesResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: { games }
    });
  });

  state.socketServer.register<RandomGamesData>(BackIn.RANDOM_GAMES, async (event, req) => {
    const reqData: RandomGamesData = req.data;
    let { games } = await GameManager.findGames();

    const pickedGames: Game[] = [];
    for (let i = 0; i < reqData.count; i++) {
      const index = (Math.random() * games.length) | 0;
      const game = games[index];
      if (game) {
        pickedGames.push(game);
        games.splice(index, 1);
      }
    }

    respond<RandomGamesResponseData>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: pickedGames
    });
  });

  state.socketServer.register<BrowseViewPageData>(BackIn.BROWSE_VIEW_PAGE, async (event, req) => {
    const { query, offset, limit, getTotal } = req.data;
    const { games, total } = await GameManager.findGames(query.filter, query.orderBy, query.orderReverse, offset, limit, true, getTotal);

    respond<BrowseViewPageResponseData>(event.target, {
      id: req.id,
      type: BackOut.BROWSE_VIEW_PAGE_RESPONSE,
      data: {
        games: games as ViewGame[],
        offset: offset,
        total: total
      },
    });
  });

  state.socketServer.register<BrowseViewIndexData>(BackIn.BROWSE_VIEW_INDEX, async (event, req) => {
    const { gameId, query } = req.data;
    const position = await GameManager.findGameIndex(gameId, query.filter, query.orderBy, query.orderReverse, 0, 1, true, false);

    respond<BrowseViewIndexResponse>(event.target, {
      id: req.id,
      type: BackOut.GENERIC_RESPONSE,
      data: {
        index: position,
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