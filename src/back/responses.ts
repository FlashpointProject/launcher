import * as SourceManager from '@back/game/SourceManager';
import { Game } from '@database/entity/Game';
import { GameData } from '@database/entity/GameData';
import { Playlist } from '@database/entity/Playlist';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { BackIn, BackInit, BackOut, DownloadDetails } from '@shared/back/types';
import { overwriteConfigData } from '@shared/config/util';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import { convertGameToCurationMetaFile } from '@shared/curate/metaToMeta';
import { getContentFolderByKey } from '@shared/curate/util';
import { AppProvider, BrowserApplicationOpts } from '@shared/extensions/interfaces';
import { FilterGameOpts } from '@shared/game/GameFilter';
import { DeepPartial, GamePropSuggestions, ProcessAction, ProcessState } from '@shared/interfaces';
import { LogLevel } from '@shared/Log/interface';
import { MetaEditFile, MetaEditMeta } from '@shared/MetaEdit';
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
import * as YAML from 'yaml';
import { ConfigFile } from './ConfigFile';
import { CONFIG_FILENAME, EXT_CONFIG_FILENAME, PREFERENCES_FILENAME } from './constants';
import { ExtConfigFile } from './ExtConfigFile';
import { parseAppVar } from './extensions/util';
import * as GameDataManager from './game/GameDataManager';
import * as GameManager from './game/GameManager';
import * as TagManager from './game/TagManager';
import { escapeArgsForShell, GameLauncher, GameLaunchInfo } from './GameLauncher';
import { importCuration, launchCuration, launchCurationExtras } from './importGame';
import { ManagedChildProcess } from './ManagedChildProcess';
import { importAllMetaEdits } from './MetaEdit';
import { BackState, BareTag, TagsFile } from './types';
import { pathToBluezip } from './util/Bluezip';
import { copyError, createChildFromFromLegacyAddApp, createContainer, createGameFromLegacy, createPlaylistFromJson, exit, pathExists, procToService, removeService, runService } from './util/misc';
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
  state.socketServer.register(BackIn.ADD_LOG, (event, data) => {
    switch (data.logLevel) {
      case LogLevel.TRACE:
        log.trace(data.source, data.content);
        break;
      case LogLevel.DEBUG:
        log.debug(data.source, data.content);
        break;
      case LogLevel.INFO:
        log.info(data.source, data.content);
        break;
      case LogLevel.WARN:
        log.warn(data.source, data.content);
        break;
      case LogLevel.ERROR:
        log.error(data.source, data.content);
        break;
    }
  });

  state.socketServer.register(BackIn.GET_MAIN_INIT_DATA, (event) => {
    return {
      preferences: state.preferences,
      config: state.config,
    };
  });

  state.socketServer.register(BackIn.GET_RENDERER_INIT_DATA, async (event) => {
    state.languageContainer = createContainer(
      state.languages,
      state.preferences.currentLanguage,
      state.localeCode,
      state.preferences.fallbackLanguage
    );

    const playlists = await GameManager.findPlaylists(state.preferences.browsePageShowExtreme);
    const libraries = await GameManager.findUniqueValues(Game, 'library');
    const serverNames = state.serviceInfo ? state.serviceInfo.server.map(i => i.name || '') : [];
    const mad4fpEnabled = state.serviceInfo ? (state.serviceInfo.server.findIndex(s => s.mad4fp === true) !== -1) : false;
    const platforms: Record<string, string[]> = {};
    for (const library of libraries) {
      platforms[library] = (await GameManager.findPlatforms(library)).sort();
    }

    // Fire after return has sent
    setTimeout(() => state.apiEmitters.onDidConnect.fire(), 100);

    // Fetch update feed
    let updateFeedMarkdown = '';
    if (state.preferences.updateFeedUrl) {
      updateFeedMarkdown = await axios.get(state.preferences.updateFeedUrl, { timeout: 3000 })
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        log.debug('Launcher', 'Failed to fetch update feed, ERROR: ' + err);
        return '';
      });
    } else {
      log.debug('Launcher', 'No Update Feed URL specified');
    }

    return {
      preferences: state.preferences,
      config: state.config,
      fileServerPort: state.fileServerPort,
      log: state.log,
      services: Array.from(state.services.values()).map(s => procToService(s)),
      customVersion: state.customVersion,
      languages: state.languages,
      language: state.languageContainer,
      themes: Array.from(state.registry.themes.values()),
      playlists: playlists,
      libraries: libraries,
      serverNames: serverNames,
      mad4fpEnabled: mad4fpEnabled,
      platforms: platforms,
      localeCode: state.localeCode,
      tagCategories: await TagManager.findTagCategories(),
      extensions: (await state.extensionsService.getExtensions()).map(e => {
        return {
          id: e.id,
          ...e.manifest
        };
      }),
      devScripts: await state.extensionsService.getContributions('devScripts'),
      contextButtons: await state.extensionsService.getContributions('contextButtons'),
      logoSets: Array.from(state.registry.logoSets.values()),
      extConfigs: await state.extensionsService.getContributions('configuration'),
      extConfig: state.extConfig,
      updateFeedMarkdown: updateFeedMarkdown,
    };

  });

  state.socketServer.register(BackIn.INIT_LISTEN, (event) => {
    const done: BackInit[] = [];
    for (const key in state.init) {
      const init: BackInit = key as any;
      if (state.init[init]) {
        done.push(init);
      } else {
        state.initEmitter.once(init, () => {
          state.socketServer.send(event.client, BackOut.INIT_EVENT, { done: [ init ] });
        });
      }
    }

    return { done };
  });

  // Ardil TODO
  state.socketServer.register(BackIn.GET_SUGGESTIONS, async (event) => {
    const startTime = Date.now();
    const suggestions: GamePropSuggestions = {
      tags: await GameManager.findUniqueValues(TagAlias, 'name'),
      platform: (await GameManager.findUniqueValues(Game, 'platform')).sort(),
      playMode: await GameManager.findUniqueValues(Game, 'playMode'),
      status: await GameManager.findUniqueValues(Game, 'status'),
      applicationPath: await GameManager.findUniqueValues(Game, 'applicationPath'),
      library: await GameManager.findUniqueValues(Game, 'library'),
    };
    const appPaths: {[platform: string]: string} = {};
    for (const platform of suggestions.platform) {
      appPaths[platform] = (await GameManager.findPlatformAppPaths(platform))[0] || '';
    }
    console.log(Date.now() - startTime);
    return {
      suggestions: suggestions,
      appPaths: appPaths,
    };
  });

  // Ardil TODO
  state.socketServer.register(BackIn.GET_GAMES_TOTAL, async (event) => {
    return await GameManager.countGames();
  });

  state.socketServer.register(BackIn.SET_LOCALE, (event, data) => {
    state.localeCode = data;

    // @TODO Update the language container if the locale changes

    return data;
  });

  // Ardil TODO
  state.socketServer.register(BackIn.GET_EXEC, (event) => {
    return state.execMappings;
  });

  state.socketServer.register(BackIn.LAUNCH_EXTRAS, async (event, id) => {
    const game = await GameManager.findGame(id);
    if (game && game.extras) {
      await GameLauncher.launchExtras({
        extrasPath: game.extras,
        fpPath: path.resolve(state.config.flashpointPath),
        htdocsPath: state.preferences.htdocsFolderPath,
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        appPathOverrides: state.preferences.appPathOverrides,
        providers: await getProviders(state),
        proxy: state.preferences.browserModeProxy,
        openDialog: state.socketServer.showMessageBoxBack(event.client),
        openExternal: state.socketServer.openExternal(event.client),
        runGame: runGameFactory(state),
      });
    }
  });
  // Ardil TODO
  state.socketServer.register(BackIn.LAUNCH_GAME, async (event, id) => {
    const game = await GameManager.findGame(id);

    if (game) {
      // Ardil TODO not needed? Temp fix, see if it happens.
      if (game.parentGameId && !game.parentGame) {
        log.debug("Game Launcher", "Fetching parent game.");
        game.parentGame = await GameManager.findGame(game.parentGameId)
      }
      // Make sure Server is set to configured server - Curations may have changed it
      const configServer = state.serviceInfo ? state.serviceInfo.server.find(s => s.name === state.config.server) : undefined;
      if (configServer) {
        const server = state.services.get('server');
        if (!server || !('name' in server.info) || server.info.name !== configServer.name) {
          // Server is different, change now
          if (server) { await removeService(state, 'server'); }
          runService(state, 'server', 'Server', state.config.flashpointPath, {}, configServer);
        }
      }
      // If it has GameData, make sure it's present
      let gameData: GameData | undefined;
      if (game.activeDataId) {
        gameData = await GameDataManager.findOne(game.activeDataId);
        if (gameData && !gameData.presentOnDisk) {
          // Download GameData
          const onDetails = (details: DownloadDetails) => {
            state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_DETAILS, details);
          };
          const onProgress = (percent: number) => {
            // Sent to PLACEHOLDER download dialog on client
            state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_PERCENT, percent);
          };
          state.socketServer.broadcast(BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG);
          try {
            await GameDataManager.downloadGameData(gameData.id, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath), onProgress, onDetails)
            .finally(() => {
              // Close PLACEHOLDER download dialog on client, cosmetic delay to look nice
              setTimeout(() => {
                state.socketServer.broadcast(BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG);
              }, 250);
            });
          } catch (error) {
            state.socketServer.broadcast(BackOut.OPEN_ALERT, error);
            log.info('Game Launcher', `Game Launch Aborted: ${error}`);
            return;
          }
        }
      }
      // Make sure the parent's GameData is present too.
      if (game.parentGame && game.parentGame.activeDataId) {
        gameData = await GameDataManager.findOne(game.parentGame.activeDataId);
        if (gameData && !gameData.presentOnDisk) {
          // Download GameData
          const onDetails = (details: DownloadDetails) => {
            state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_DETAILS, details);
          };
          const onProgress = (percent: number) => {
            // Sent to PLACEHOLDER download dialog on client
            state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_PERCENT, percent);
          };
          state.socketServer.broadcast(BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG);
          try {
            await GameDataManager.downloadGameData(gameData.id, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath), onProgress, onDetails)
            .finally(() => {
              // Close PLACEHOLDER download dialog on client, cosmetic delay to look nice
              setTimeout(() => {
                state.socketServer.broadcast(BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG);
              }, 250);
            });
          } catch (error) {
            state.socketServer.broadcast(BackOut.OPEN_ALERT, error);
            log.info('Game Launcher', `Game Launch Aborted: ${error}`);
            return;
          }
        }
      }
      // Launch game
      await GameLauncher.launchGame({
        game,
        fpPath: path.resolve(state.config.flashpointPath),
        htdocsPath: state.preferences.htdocsFolderPath,
        native: state.preferences.nativePlatforms.some(p => p === game.platform),
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        appPathOverrides: state.preferences.appPathOverrides,
        providers: await getProviders(state),
        proxy: state.preferences.browserModeProxy,
        openDialog: state.socketServer.showMessageBoxBack(event.client),
        openExternal: state.socketServer.openExternal(event.client),
        runGame: runGameFactory(state),
      },
      state.apiEmitters.games.onWillLaunchGame);
      await state.apiEmitters.games.onDidLaunchGame.fire(game);
    }
  });

  // Ardil TODO
  state.socketServer.register(BackIn.SAVE_GAMES, async (event, data) => {
    await GameManager.updateGames(data);
  });

  // Ardil TODO
  state.socketServer.register(BackIn.SAVE_GAME, async (event, data) => {
    try {
      const game = await GameManager.save(data);
      state.queries = {}; // Clear entire cache
      return {
        game,
        library: game.library,
        gamesTotal: await GameManager.countGames(),
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  });

  // Ardil TODO
  state.socketServer.register(BackIn.DELETE_GAME, async (event, id) => {
    // Ardil TODO figure out this thing.
    const game = await GameManager.removeGameAndChildren(id, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath));

    state.queries = {}; // Clear entire cache

    return {
      game,
      library: game && game.library,
      gamesTotal: await GameManager.countGames(),
    };
  });

  // Ardil TODO check that this was the right move.
  /*state.socketServer.register(BackIn.DUPLICATE_GAME, async (event, id, dupeImages) => {
    const game = await GameManager.findGame(id);
    let result: Game | undefined;
    if (game) {

      // Copy and apply new IDs
      
      const newGame = deepCopy(game);
      /* Ardil TODO figure this out.
      const newAddApps = game.addApps.map(addApp => deepCopy(addApp));
      newGame.id = uuid();
      for (let j = 0; j < newAddApps.length; j++) {
        newAddApps[j].id = uuid();
        newAddApps[j].parentGame = newGame;
      }
      newGame.addApps = newAddApps;

      // Add copies
      result = await GameManager.save(newGame);

      // Copy images
      if (dupeImages) {
        const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
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

    return {
      library: result && result.library,
      gamesTotal: await GameManager.countGames(),
    };
  });*/

  // Ardil TODO
  state.socketServer.register(BackIn.DUPLICATE_PLAYLIST, async (event, data) => {
    const playlist = await GameManager.findPlaylist(data, true);
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
      state.socketServer.send(event.client, BackOut.PLAYLISTS_CHANGE, await GameManager.findPlaylists(state.preferences.browsePageShowExtreme));
    }
  });

  // Ardil TODO
  state.socketServer.register(BackIn.IMPORT_PLAYLIST, async (event, filePath, library) => {
    try {
      const rawData = await fs.promises.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(rawData);
      const newPlaylist = createPlaylistFromJson(jsonData, library);
      const existingPlaylist = await GameManager.findPlaylistByName(newPlaylist.title, true);
      if (existingPlaylist) {
        newPlaylist.title += ' - New';
        // Conflict, resolve with user
        const dialogFunc = state.socketServer.showMessageBoxBack(event.client);
        const strings = state.languageContainer;
        const result = await dialogFunc({
          title: strings.dialog.playlistConflict,
          message:  `${formatString(strings.dialog.importedPlaylistAlreadyExists, existingPlaylist.title)}\n\n${strings.dialog.importPlaylistAs} ${newPlaylist.title}?`,
          buttons: [strings.misc.yes, strings.misc.no, strings.dialog.cancel]
        });
        switch (result) {
          case 0: {
            // Continue importing
            break;
          }
          default:
            // Cancel or No
            throw 'User Cancelled';
        }
      }
      await GameManager.updatePlaylist(newPlaylist);
      log.info('Launcher', `Imported playlist - ${newPlaylist.title}`);
      state.socketServer.broadcast(BackOut.PLAYLISTS_CHANGE, await GameManager.findPlaylists(state.preferences.browsePageShowExtreme));
      state.socketServer.send(event.client, BackOut.IMPORT_PLAYLIST, newPlaylist);
    } catch (e) {
      console.log(e);
    }
  });

  // Ardil TODO
  state.socketServer.register(BackIn.DELETE_ALL_PLAYLISTS, async (event) => {
    const playlists = await GameManager.findPlaylists(true);
    for (const playlist of playlists) {
      await GameManager.removePlaylist(playlist.id);
    }
    state.socketServer.send(event.client, BackOut.PLAYLISTS_CHANGE, await GameManager.findPlaylists(state.preferences.browsePageShowExtreme));
  });

  // Ardil TODO
  state.socketServer.register(BackIn.EXPORT_PLAYLIST, async (event, id, location) => {
    const playlist = await GameManager.findPlaylist(id, true);
    if (playlist) {
      try {
        await writeFile(location, JSON.stringify(playlist, null, '\t'));
      } catch (e) { console.error(e); }
    }
  });

  // Ardil TODO
  state.socketServer.register(BackIn.EXPORT_GAME, async (event, id, location, metaOnly) => {
    if (await pathExists(metaOnly ? path.dirname(location) : location)) {
      const game = await GameManager.findGame(id);
      if (game) {
        // Save to file
        try {
          await writeFile(
            metaOnly ? location : path.join(location, 'meta.yaml'),
            YAML.stringify(convertGameToCurationMetaFile(game, await TagManager.findTagCategories())));
        } catch (e) { console.error(e); }

        // Copy images
        if (!metaOnly) {
          const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
          const last = path.join(game.id.substr(0, 2), game.id.substr(2, 2), game.id+'.png');

          const oldLogoPath = path.join(imageFolder, LOGOS, last);
          const newLogoPath = path.join(location, 'logo.png');
          try {
            if (await pathExists(oldLogoPath)) { await copyFile(oldLogoPath, newLogoPath); }
          } catch (e) { console.error(e); }

          const oldScreenshotPath = path.join(imageFolder, SCREENSHOTS, last);
          const newScreenshotPath = path.join(location, 'ss.png');
          try {
            if (await pathExists(oldScreenshotPath)) { await copyFile(oldScreenshotPath, newScreenshotPath); }
          } catch (e) { console.error(e); }
        }
      }
    }
  });

  // Ardil TODO
  state.socketServer.register(BackIn.GET_GAME, async (event, id) => {
    return GameManager.findGame(id);
  });

  // Ardil TODO
  state.socketServer.register(BackIn.GET_GAME_DATA, async (event, id) => {
    const gameData = await GameDataManager.findOne(id);
    // Verify it's still on disk
    if (gameData && gameData.presentOnDisk && gameData.path) {
      try {
        await fs.promises.access(path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath, gameData.path), fs.constants.F_OK);
      } catch (err) {
        gameData.path = undefined;
        gameData.presentOnDisk = false;
        return await GameDataManager.save(gameData);
      }
    }
    return gameData;
  });

  // Ardil TODO
  state.socketServer.register(BackIn.GET_GAMES_GAME_DATA, async (event, id) => {
    return GameDataManager.findGameData(id);
  });

  // Ardil TODO
  state.socketServer.register(BackIn.SAVE_GAME_DATAS, async (event, data) => {
    // Ignore presentOnDisk, client isn't the most aware
    await Promise.all(data.map(async (d) => {
      const existingData = await GameDataManager.findOne(d.id);
      if (existingData) {
        existingData.title = d.title;
        existingData.parameters = d.parameters;
        return GameDataManager.save(existingData);
      }
    }));
  });

  // Ardil TODO
  state.socketServer.register(BackIn.DELETE_GAME_DATA, async (event, gameDataId) => {
    const gameData = await GameDataManager.findOne(gameDataId);
    if (gameData) {
      if (gameData.presentOnDisk && gameData.path) {
        await GameDataManager.onWillUninstallGameData.fire(gameData);
        const gameDataPath = path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath, gameData.path);
        await fs.promises.unlink(gameDataPath);
        gameData.path = undefined;
        gameData.presentOnDisk = false;
        GameDataManager.onDidUninstallGameData.fire(gameData);
      }
      const game = await GameManager.findGame(gameData.gameId);
      if (game) {
        game.activeDataId = undefined;
        game.activeDataOnDisk = false;
        await GameManager.save(game);
      }
      await GameDataManager.remove(gameDataId);
    }
  });

  // Ardil TODO
  state.socketServer.register(BackIn.IMPORT_GAME_DATA, async (event, gameId, filePath) => {
    return GameDataManager.importGameData(gameId, filePath, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath));
  });

  // Ardil TODO
  state.socketServer.register(BackIn.DOWNLOAD_GAME_DATA, async (event, gameDataId) => {
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
  });

  // Ardil TODO This actually is important, don't ignore!
  state.socketServer.register(BackIn.UNINSTALL_GAME_DATA, async (event, id) => {
    const gameData = await GameDataManager.findOne(id);
    if (gameData && gameData.path && gameData.presentOnDisk) {
      await GameDataManager.onWillUninstallGameData.fire(gameData);
      // Delete Game Data
      const gameDataPath = path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath, gameData.path);
      await fs.promises.unlink(gameDataPath)
      .catch((error) => {
        if (error.code !== 'ENOENT') {
          log.error('Launcher', `Error Deleting Game: ${error}`);
          throw error;
        }
      });
      gameData.path = '';
      gameData.presentOnDisk = false;
      await GameDataManager.save(gameData);
      GameDataManager.onDidUninstallGameData.fire(gameData);
      // Update Game
      const game = await GameManager.findGame(gameData.gameId);
      if (game && game.activeDataId === gameData.id) {
        game.activeDataOnDisk = false;
        return GameManager.save(game);
      }
    }
  });

  // Ardil TODO should be quick.
  state.socketServer.register(BackIn.ADD_SOURCE_BY_URL, async (event, url) => {
    const sourceDir = path.join(state.config.flashpointPath, 'Data/Sources');
    await fs.promises.mkdir(sourceDir, { recursive: true });
    return SourceManager.importFromURL(url.trim(), sourceDir, (percent) => {
      log.debug('Launcher', `Progress: ${percent * 100}%`);
    });
  });

  // Ardil TODO
  state.socketServer.register(BackIn.DELETE_SOURCE, async (event, id) => {
    return SourceManager.remove(id);
  });

  // Ardil TODO
  state.socketServer.register(BackIn.GET_SOURCES, async (event) => {
    return SourceManager.find();
  });

  // Ardil TODO
  state.socketServer.register(BackIn.GET_SOURCE_DATA, async (event, hashes) => {
    return GameDataManager.findSourceDataForHashes(hashes);
  });

  // Ardil TODO
  state.socketServer.register(BackIn.GET_ALL_GAMES, async (event) => {
    return GameManager.findAllGames();
  });

  // Ardil TODO
  state.socketServer.register(BackIn.RANDOM_GAMES, async (event, data) => {
    const flatFilters = data.tagFilters ? data.tagFilters.reduce<string[]>((prev, cur) => prev.concat(cur.tags),  []) : [];
    return await GameManager.findRandomGames(data.count, data.broken, data.excludedLibraries, flatFilters);
  });

  // Ardil TODO
  state.socketServer.register(BackIn.BROWSE_VIEW_KEYSET, async (event, library, query) => {
    query.filter = adjustGameFilter(query.filter);
    const result = await GameManager.findGamePageKeyset(query.filter, query.orderBy, query.orderReverse, query.searchLimit);
    return {
      keyset: result.keyset,
      total: result.total,
    };
  });

  // Ardil TODO
  state.socketServer.register(BackIn.BROWSE_VIEW_PAGE, async (event, data) => {
    data.query.filter = adjustGameFilter(data.query.filter);
    const startTime = new Date();
    const results = await GameManager.findGames({
      ranges: data.ranges,
      filter: data.query.filter,
      orderBy: data.query.orderBy,
      direction: data.query.orderReverse,
    }, !!data.shallow);
    const timeTaken = (new Date()).getTime() - startTime.getTime();
    log.debug('Launcher', `FindGames Time: ${timeTaken}ms`);

    return {
      ranges: results,
      library: data.library,
    };
  });

  state.socketServer.register(BackIn.DELETE_TAG_CATEGORY, async (event, data) => {
    const result = await TagManager.deleteTagCategory(data, state.socketServer.showMessageBoxBack(event.client));
    state.socketServer.send(event.client, BackOut.DELETE_TAG_CATEGORY, result);
    await TagManager.sendTagCategories(state.socketServer);
    return result;
  });

  state.socketServer.register(BackIn.GET_TAG_CATEGORY_BY_ID, async (event, data) => {
    const result = await TagManager.getTagCategoryById(data);
    state.socketServer.send(event.client, BackOut.GET_TAG_CATEGORY_BY_ID, result);
    return result;
  });

  state.socketServer.register(BackIn.SAVE_TAG_CATEGORY, async (event, data) => {
    const result = await TagManager.saveTagCategory(data);
    state.socketServer.send(event.client, BackOut.SAVE_TAG_CATEGORY, result);
    await TagManager.sendTagCategories(state.socketServer);
    return result;
  });

  state.socketServer.register(BackIn.GET_TAG_BY_ID, async (event, data) => {
    const tag = await TagManager.getTagById(data);
    state.socketServer.send(event.client, BackOut.GET_TAG_BY_ID, tag);
    return tag;
  });

  state.socketServer.register(BackIn.GET_TAGS, async (event, name, tagFilters) => {
    const flatFilters: string[] = tagFilters ? tagFilters.reduce<string[]>((prev, cur) => prev.concat(cur.tags), []) : [];
    const tags = await TagManager.findTags(name, flatFilters);
    state.socketServer.send(event.client, BackOut.GET_TAGS, tags);
    return tags;
  });

  state.socketServer.register(BackIn.MERGE_TAGS, async (event, data) => {
    const newTag = await TagManager.mergeTags(data, state.socketServer.showMessageBoxBack(event.client)) as Tag; // @TYPESAFE fix this?
    state.socketServer.send(event.client, BackOut.MERGE_TAGS, newTag);
    return newTag;
  });

  state.socketServer.register(BackIn.CLEANUP_TAGS, async (event) => {
    const allTags = await TagManager.findTags();
    const commaTags = allTags.filter(t => t.primaryAlias.name.includes(','));
    for (const oldTag of commaTags) {
      const allAliases = oldTag.primaryAlias.name.split(',').map(a => a.trim());
      const tagsToAdd: Tag[] = [];
      for (const alias of allAliases) {
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
        for (const newTag of tagsToAdd) {
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
        await TagManager.deleteTag(oldTag.id, state.socketServer.showMessageBoxBack(event.client));
      }
    }
  });

  state.socketServer.register(BackIn.DELETE_TAG, async (event, data) => {
    const success = await TagManager.deleteTag(data, state.socketServer.showMessageBoxBack(event.client));
    return {
      success: success,
      id: data,
    };
  });

  state.socketServer.register(BackIn.SAVE_TAG, async (event, data) => {
    const result = await TagManager.saveTag(data);
    state.socketServer.send(event.client, BackOut.SAVE_TAG, result);
    return result;
  });

  state.socketServer.register(BackIn.SAVE_TAG_ALIAS, async (event, data) => {
    return TagManager.saveTagAlias(data);
  });

  state.socketServer.register(BackIn.GET_TAG_SUGGESTIONS, async (event, text, tagFilters) => {
    const flatTagFilter = tagFilters.reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
    const flatCatFilter = tagFilters.reduce<string[]>((prev, cur) => prev.concat(cur.categories), []);
    const result = await TagManager.findTagSuggestions(text, flatTagFilter, flatCatFilter);
    state.socketServer.send(event.client, BackOut.GET_TAG_SUGGESTIONS, result);
    return result;
  });

  // Ardil TODO
  state.socketServer.register(BackIn.BROWSE_VIEW_INDEX, async (event, gameId, query) => {
    const position = await GameManager.findGameRow(
      gameId,
      query.filter,
      query.orderBy,
      query.orderReverse,
      undefined);

    return position - 1; // ("position" starts at 1, while "index" starts at 0)
  });

  state.socketServer.register(BackIn.SAVE_IMAGE, async (event, raw_folder, raw_id, content) => {
    const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
    const folder = sanitizeFilename(raw_folder);
    const id = sanitizeFilename(raw_id);
    const fullPath = path.join(imageFolder, folder, id.substr(0, 2), id.substr(2, 2), id + '.png');

    if (fullPath.startsWith(imageFolder)) { // (Ensure that it does not climb out of the image folder)
      try {
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, Buffer.from(content, 'base64'));
      } catch (e) {
        log.error('Launcher', e + '');
      }
    }

    state.socketServer.send(event.client, BackOut.IMAGE_CHANGE, folder, id);
  });

  state.socketServer.register(BackIn.DELETE_IMAGE, async (event, raw_folder, raw_id) => {
    const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
    const folder = sanitizeFilename(raw_folder);
    const id = sanitizeFilename(raw_id);
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

    state.socketServer.send(event.client, BackOut.IMAGE_CHANGE, folder, id);
  });

  state.socketServer.register(BackIn.UPDATE_CONFIG, async(event, data) => {
    const newConfig = deepCopy(state.config);
    overwriteConfigData(newConfig, data);

    try { await ConfigFile.saveFile(path.join(state.configFolder, CONFIG_FILENAME), newConfig); }
    catch (error) { log.error('Launcher', error); }
  });

  // Ardil TODO add pref to make add-apps searchable? Later?
  state.socketServer.register(BackIn.UPDATE_PREFERENCES, async (event, data, refresh) => {
    const dif = difObjects(defaultPreferencesData, state.preferences, data);
    if (dif) {
      if ((typeof dif.currentLanguage  !== 'undefined' && dif.currentLanguage  !== state.preferences.currentLanguage) ||
          (typeof dif.fallbackLanguage !== 'undefined' && dif.fallbackLanguage !== state.preferences.fallbackLanguage)) {
        state.languageContainer = createContainer(
          state.languages,
          (typeof dif.currentLanguage !== 'undefined') ? dif.currentLanguage : state.preferences.currentLanguage,
          state.localeCode,
          (typeof dif.fallbackLanguage !== 'undefined') ? dif.fallbackLanguage : state.preferences.fallbackLanguage
        );
        state.socketServer.broadcast(BackOut.LANGUAGE_CHANGE, state.languageContainer);
      }

      overwritePreferenceData(state.preferences, dif);
      state.writeLocks += 1;
      await PreferencesFile.saveFile(path.join(state.config.flashpointPath, PREFERENCES_FILENAME), state.preferences);
      state.writeLocks -= 1;
    }
    if (refresh) {
      state.socketServer.send(event.client, BackOut.UPDATE_PREFERENCES_RESPONSE, state.preferences);
    }
  });

  state.socketServer.register(BackIn.SERVICE_ACTION, (event, action, id) => {
    const proc = state.services.get(id);
    if (proc) {
      switch (action) {
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
  });

  state.socketServer.register(BackIn.GET_PLAYLIST, async (event, playlistId) => {
    return await GameManager.findPlaylist(playlistId, true) as Playlist; // @TYPESAFE fix this?
  });

  state.socketServer.register(BackIn.CLEANUP_TAG_ALIASES, async (event) => {
    await TagManager.cleanupTagAliases();
  });

  state.socketServer.register(BackIn.GET_TAG, async (event, data) => {
    const result = await TagManager.findTag(data);
    state.socketServer.send(event.client, BackOut.GET_TAG, result);
    return result;
  });

  state.socketServer.register(BackIn.FIX_TAG_PRIMARY_ALIASES, async (event, data) => {
    const fixed = await TagManager.fixPrimaryAliases();
    state.socketServer.send(event.client, BackOut.FIX_TAG_PRIMARY_ALIASES, fixed);
    return fixed;
  });

  state.socketServer.register(BackIn.GET_OR_CREATE_TAG, async (event, tagName, tagCategory) => {
    const name = tagName.trim();
    const category = tagCategory ? tagCategory.trim() : undefined;
    let tag = await TagManager.findTag(name);
    if (!tag) {
      // Tag doesn't exist, make a new one
      tag = await TagManager.createTag(name, category);
    }
    return tag as Tag; // @TYPESAFE fix this?
  });

  state.socketServer.register(BackIn.GET_PLAYLISTS, async (event) => {
    return await GameManager.findPlaylists(state.preferences.browsePageShowExtreme); // @TYPESAFE fix this?
  });

  state.socketServer.register(BackIn.SAVE_PLAYLIST, async (event, playlist) => {
    const savedPlaylist = await GameManager.updatePlaylist(playlist);
    state.queries = {};
    return savedPlaylist;
  });

  state.socketServer.register(BackIn.DELETE_PLAYLIST, async (event, playlistId) => {
    const playlist = await GameManager.removePlaylist(playlistId);
    state.queries = {};
    return playlist as Playlist; // @TYPESAFE fix this?
  });

  state.socketServer.register(BackIn.GET_PLAYLIST_GAME, async (event, playlistId, gameId) => {
    const playlistGame = await GameManager.findPlaylistGame(playlistId, gameId);
    return playlistGame;
  });

  state.socketServer.register(BackIn.ADD_PLAYLIST_GAME, async (event, playlistId, gameId) => {
    await GameManager.addPlaylistGame(playlistId, gameId);
  });

  state.socketServer.register(BackIn.SAVE_PLAYLIST_GAME, async (event, data) => {
    const playlistGame = await GameManager.updatePlaylistGame(data);
    state.queries = {};
    return playlistGame;
  });

  state.socketServer.register(BackIn.DELETE_PLAYLIST_GAME, async (event, playlistId, gameId) => {
    const playlistGame = await GameManager.removePlaylistGame(playlistId, gameId);
    state.queries = {};
    return playlistGame;
  });

  // Ardil done
  state.socketServer.register(BackIn.SAVE_LEGACY_PLATFORM, async (event, platform) => {
    const translatedGames = [];
    const tagCache: Record<string, Tag> = {};
    for (const game of platform.collection.games) {
      const addApps = platform.collection.additionalApplications.filter(a => a.gameId === game.id);
      const translatedGame = await createGameFromLegacy(game, tagCache);
      translatedGame.children = createChildFromFromLegacyAddApp(addApps, translatedGame);
      translatedGames.push(translatedGame);
    }
    await GameManager.updateGames(translatedGames);
  });

  state.socketServer.register(BackIn.EXPORT_TAGS, async (event, data) => {
    const jsonTagsFile: TagsFile = { categories: [], tags: [] };
    let res = 0;
    try {
      const allTagCategories = await TagManager.findTagCategories();
      jsonTagsFile.categories = allTagCategories;
      const allTags = await TagManager.findTags('');
      jsonTagsFile.tags = allTags.map(t => {
        const primaryAlias = t.aliases.find(a => a.id === t.primaryAliasId);
        const bareTag: BareTag = {
          categoryId: t.categoryId || -1,
          description: t.description,
          primaryAlias: primaryAlias ? primaryAlias.name : 'ERROR',
          aliases: t.aliases.map(a => a.name)
        };
        return bareTag;
      });
      await fs.promises.writeFile(data, JSON.stringify(jsonTagsFile, null, ' '), { encoding: 'utf8' });
      res = allTags.length;
    } catch (error) {
      res = -1;
    }
    state.socketServer.send(event.client, BackOut.EXPORT_TAGS, res);
    return res;
  });

  state.socketServer.register(BackIn.IMPORT_TAGS, async (event, data) => {
    const json: TagsFile = JSON.parse(await fs.promises.readFile(data, 'utf8'));
    let res = 0;
    try {
      // Map JSON category ids to real categories
      const existingCats = await TagManager.findTagCategories();
      const categories: Record<number, TagCategory> = {};
      for (const rawCat of json.categories) {
        const foundCat = existingCats.find(c => c.name.toLowerCase() === rawCat.name.toLowerCase());
        if (foundCat) {
          categories[rawCat.id] = foundCat;
        } else {
          const newCat = await TagManager.createTagCategory(rawCat.name, rawCat.color);
          if (newCat) {
            categories[rawCat.id] = newCat;
          }
        }
      }
      // Create and fill tags
      for (const bareTag of json.tags) {
        const existingTag = await TagManager.findTag(bareTag.primaryAlias);
        if (existingTag) {
          // TODO: Detect alias collisions
          continue;
        } else {
          await TagManager.createTag(bareTag.primaryAlias, categories[bareTag.categoryId].name, bareTag.aliases.filter(a => a !== bareTag.primaryAlias));
          res += 1;
        }
      }
    } catch (error) {
      res = -1;
    }
    state.socketServer.send(event.client, BackOut.IMPORT_TAGS, res);
    await TagManager.sendTagCategories(state.socketServer);
    return res;
  });

  // Ardil TODO
  state.socketServer.register(BackIn.IMPORT_CURATION, async (event, data) => {
    let error: any | undefined;
    try {
      await importCuration({
        curation: data.curation,
        gameManager: state.gameManager,
        date: (data.date !== undefined) ? new Date(data.date) : undefined,
        saveCuration: data.saveCuration,
        fpPath: state.config.flashpointPath,
        dataPacksFolderPath: path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath),
        bluezipPath: pathToBluezip(state.isDev, state.exePath),
        imageFolderPath: state.preferences.imageFolderPath,
        openDialog: state.socketServer.showMessageBoxBack(event.client),
        openExternal: state.socketServer.openExternal(event.client),
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

    return { error: error || undefined };
  });

  state.socketServer.register(BackIn.LAUNCH_CURATION_EXTRAS, async (event, data) => {
    const skipLink = (data.key === state.lastLinkedCurationKey);
    state.lastLinkedCurationKey = data.symlinkCurationContent ? data.key : '';
    try {
      if (state.serviceInfo) {
        // Make sure all 3 relevant server infos are present before considering MAD4FP opt
        const configServer = state.serviceInfo.server.find(s => s.name === state.config.server);
        const mad4fpServer = state.serviceInfo.server.find(s => s.mad4fp);
        const activeServer = state.services.get('server');
        const activeServerInfo = state.serviceInfo.server.find(s => (activeServer && 'name' in activeServer.info && s.name === activeServer.info?.name));
        if (activeServer && configServer && mad4fpServer) {
          if (data.mad4fp && activeServerInfo && !activeServerInfo.mad4fp) {
            // Swap to mad4fp server
            const mad4fpServerCopy = deepCopy(mad4fpServer);
            // Set the content folder path as the final parameter
            mad4fpServerCopy.arguments.push(getContentFolderByKey(data.key, state.config.flashpointPath));
            await removeService(state, 'server');
            runService(state, 'server', 'Server', state.config.flashpointPath, {}, mad4fpServerCopy);
          } else if (!data.mad4fp && activeServerInfo && activeServerInfo.mad4fp && !configServer.mad4fp) {
            // Swap to mad4fp server
            await removeService(state, 'server');
            runService(state, 'server', 'Server', state.config.flashpointPath, {}, configServer);
          }
        }
      }
      if (data.meta.extras) {
        await launchCurationExtras(data.key, data.meta, data.symlinkCurationContent, skipLink, {
          fpPath: path.resolve(state.config.flashpointPath),
          htdocsPath: state.preferences.htdocsFolderPath,
          execMappings: state.execMappings,
          lang: state.languageContainer,
          isDev: state.isDev,
          exePath: state.exePath,
          appPathOverrides: state.preferences.appPathOverrides,
          providers: await getProviders(state),
           proxy: state.preferences.browserModeProxy,
          openDialog: state.socketServer.showMessageBoxBack(event.client),
          openExternal: state.socketServer.openExternal(event.client),
          runGame: runGameFactory(state)
        });
      }
    } catch (e) {
      log.error('Launcher', e + '');
    }
  });
  // Ardil TODO
  state.socketServer.register(BackIn.LAUNCH_CURATION, async (event, data) => {
    const skipLink = (data.key === state.lastLinkedCurationKey);
    state.lastLinkedCurationKey = data.symlinkCurationContent ? data.key : '';
    try {
      if (state.serviceInfo) {
        // Make sure all 3 relevant server infos are present before considering MAD4FP opt
        const configServer = state.serviceInfo.server.find(s => s.name === state.config.server);
        const mad4fpServer = state.serviceInfo.server.find(s => s.mad4fp);
        const activeServer = state.services.get('server');
        const activeServerInfo = state.serviceInfo.server.find(s => (activeServer && 'name' in activeServer.info && s.name === activeServer.info?.name));
        if (activeServer && configServer && mad4fpServer) {
          if (data.mad4fp && activeServerInfo && !activeServerInfo.mad4fp) {
            // Swap to mad4fp server
            const mad4fpServerCopy = deepCopy(mad4fpServer);
            // Set the content folder path as the final parameter
            mad4fpServerCopy.arguments.push(getContentFolderByKey(data.key, state.config.flashpointPath));
            await removeService(state, 'server');
            runService(state, 'server', 'Server', state.config.flashpointPath, {}, mad4fpServerCopy);
          } else if (!data.mad4fp && activeServerInfo && activeServerInfo.mad4fp && !configServer.mad4fp) {
            // Swap to mad4fp server
            await removeService(state, 'server');
            runService(state, 'server', 'Server', state.config.flashpointPath, {}, configServer);
          }
        }
      }

      await launchCuration(data.key, data.meta, data.symlinkCurationContent, skipLink, {
        fpPath: path.resolve(state.config.flashpointPath),
        htdocsPath: state.preferences.htdocsFolderPath,
        native: state.preferences.nativePlatforms.some(p => p === data.meta.platform),
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        appPathOverrides: state.preferences.appPathOverrides,
        providers: await getProviders(state),
        proxy: state.preferences.browserModeProxy,
        openDialog: state.socketServer.showMessageBoxBack(event.client),
        openExternal: state.socketServer.openExternal(event.client),
        runGame: runGameFactory(state),
      },
      state.apiEmitters.games.onWillLaunchCurationGame,
      state.apiEmitters.games.onDidLaunchCurationGame);
    } catch (e) {
      log.error('Launcher', e + '');
    }
  });

  state.socketServer.register(BackIn.UPLOAD_LOG, async (event) => {
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
    state.socketServer.send(event.client, BackOut.UPLOAD_LOG, getUrl);
    return getUrl;
  });

  state.socketServer.register(BackIn.QUIT, async (event) => {
    // Unload all extensions before quitting
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(resolve, 20000);
    });
    const writePromise = new Promise<void>((resolve, reject) => {
      const loopFunc = () => {
        if (state.writeLocks > 0) {
          setTimeout(loopFunc, 100);
        } else {
          resolve();
        }
      };
      loopFunc();
    });
    await Promise.race([timeoutPromise, writePromise])
    .catch((err) => {
      /** Bit late to really do anything here */
    });
    await state.extensionsService.unloadAll();
    state.socketServer.send(event.client, BackOut.QUIT);
    exit(state);
  });

  // Ardil TODO
  state.socketServer.register(BackIn.EXPORT_META_EDIT, async (event, id, properties) => {
    const game = await GameManager.findGame(id);
    if (game) {
      const meta: MetaEditMeta = {
        id: game.id,
      };

      const keys = Object.keys(properties) as (keyof typeof properties)[];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (properties[key]) {
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

      const folderPath = path.join(state.config.flashpointPath, state.preferences.metaEditsFolderPath);
      const filePath = path.join(folderPath, game.id + '.json');
      try {
        let save = true;

        if (await pathExists(filePath)) {
          const strings = state.languageContainer;
          const result = await state.socketServer.showMessageBoxBack(event.client)({
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
        log.error('Launcher', `Failed to export meta edit.\nError: ${error.message || error}`);
      }
    }
  });

  state.socketServer.register(BackIn.IMPORT_META_EDITS, async (event) => {
    const result = await importAllMetaEdits(
      path.join(state.config.flashpointPath, state.preferences.metaEditsFolderPath),
      state.socketServer.showMessageBoxBack(event.client),
    );

    return result;
  });

  // Ardil TODO what is this?
  state.socketServer.register(BackIn.RUN_COMMAND, async (event, command, args = []) => {
    // Find command
    const c = state.registry.commands.get(command);
    let res = undefined;
    let success = false;
    if (c) {
      // Run Command
      try {
        res = await Promise.resolve(c.callback(...args));
        success = true;
      } catch (error) {
        log.error('Launcher', `Error running Command (${command})\n${error}`);
      }
    } else {
      log.error('Launcher', `Command requested but "${command}" not registered!`);
    }
    // Return response
    const result = {
      success: success,
      res: res,
    };
    state.socketServer.send(event.client, BackOut.RUN_COMMAND, result);
    return result;
  });

  state.socketServer.register(BackIn.SET_EXT_CONFIG_VALUE, async (event, key, value) => {
    state.extConfig[key] = value;
    await ExtConfigFile.saveFile(path.join(state.config.flashpointPath, EXT_CONFIG_FILENAME), state.extConfig);
    state.socketServer.send(event.client, BackOut.UPDATE_EXT_CONFIG_DATA, state.extConfig);
  });
}

/**
 * Recursively iterate over all properties of the template object and compare the values of the same
 * properties in object A and B. All properties that are not equal will be added to the returned object.
 * Missing properties, or those with the value undefined, in B will be ignored.
 * If all property values are equal undefined is returned.
 *
 * __Note:__ Arrays work differently in order to preserve the types and indices.
 * If the length of the arrays are not equal, or if not all items in the array are strictly equal (to the items of the other array),
 * then the whole array will be added to the return object.
 * @param template Template object. Iteration will be done over this object.
 * @param a Compared to B.
 * @param b Compared to A. Values in the returned object is copied from this.
 */
function difObjects<T>(template: T, a: T, b: DeepPartial<T>): DeepPartial<T> | undefined {
  let dif: DeepPartial<T> | undefined;

  for (const key in template) {
    const tVal = template[key];
    const aVal = a[key];
    const bVal = b[key];

    if (aVal !== bVal && bVal !== undefined) {
      // Array
      if (Array.isArray(tVal) && Array.isArray(aVal) && Array.isArray(bVal)) {
        let notEqual = false;

        if (aVal.length === bVal.length) {
          for (let i = 0; i < aVal.length; i++) {
            if (aVal[i] !== bVal[i]) {
              notEqual = true;
              break;
            }
          }
        } else {
          notEqual = true;
        }

        if (notEqual) {
          if (!dif) { dif = {}; }
          dif[key] = [ ...bVal ] as any;
        }
      }
      // Object
      else if (typeof tVal === 'object' && typeof aVal === 'object' && typeof bVal === 'object') {
        const subDif = difObjects(tVal, aVal, bVal as any);
        if (subDif) {
          if (!dif) { dif = {}; }
          dif[key] = subDif as any;
        }
      }
      // Other
      else {
        if (!dif) { dif = {}; }
        dif[key] = bVal;
      }
    }
  }

  return dif;
}

function adjustGameFilter(filterOpts: FilterGameOpts): FilterGameOpts {
  if (filterOpts && filterOpts.playlistId && filterOpts.searchQuery) {
    // Remove library filter if viewing playlist
    let index = filterOpts.searchQuery.whitelist.findIndex(f => f.field === 'library');
    while (index > -1) {
      filterOpts.searchQuery.whitelist.splice(index);
      index = filterOpts.searchQuery.whitelist.findIndex(f => f.field === 'library');
    }
    index = filterOpts.searchQuery.blacklist.findIndex(f => f.field === 'library');
    while (index > -1) {
      filterOpts.searchQuery.blacklist.splice(index);
      index = filterOpts.searchQuery.blacklist.findIndex(f => f.field === 'library');
    }
  }
  return filterOpts;
}

// Ardil TODO
/**
 * Creates a function that will run any game launch info given to it and register it as a service
 */
function runGameFactory(state: BackState) {
  return (gameLaunchInfo: GameLaunchInfo): ManagedChildProcess => {
    // Run game as a service and register it
    const dirname = path.dirname(gameLaunchInfo.launchInfo.gamePath);
    // Keep file path relative to cwd
    const proc = runService(
      state,
      `game.${gameLaunchInfo.game.id}`,
      gameLaunchInfo.game.title,
      '',
      {
        detached: false,
        shell: true,
        cwd: gameLaunchInfo.launchInfo.cwd,
        execFile: !!gameLaunchInfo.launchInfo.execFile,
        env: gameLaunchInfo.launchInfo.env
      },
      {
        path: dirname,
        filename: createCommand(gameLaunchInfo.launchInfo.gamePath, gameLaunchInfo.launchInfo.useWine, !!gameLaunchInfo.launchInfo.execFile),
        arguments: escapeArgsForShell(gameLaunchInfo.launchInfo.gameArgs),
        kill: true
      }
    );
    // Remove game service when it exits
    proc.on('change', () => {
      if (proc.getState() === ProcessState.STOPPED) {
        removeService(state, proc.id);
      }
    });
    return proc;
  };
}

// Ardil TODO
function createCommand(filename: string, useWine: boolean, execFile: boolean): string {
  // This whole escaping thing is horribly broken. We probably want to switch
  // to an array representing the argv instead and not have a shell
  // in between.
  switch (process.platform) {
    case 'win32':
      return execFile ? filename : `"${filename}"`; // Quotes cause issues with execFile
    case 'darwin':
    case 'linux':
      if (useWine) {
        return `wine start /unix "${filename}"`;
      }
      return `"${filename}"`;
    default:
      throw Error('Unsupported platform');
  }
}

/**
 * Run a command registered by an Extension
 * @param command Command to run
 * @param args Arguments for the command
 */
// Ardil TODO what is this?
async function runCommand(state: BackState, command: string, args: any[] = []): Promise<any> {
  const callback = state.registry.commands.get(command);
  let res = undefined;
  if (callback) {
    // Run Command
    try {
      res = await Promise.resolve(callback.callback(...args));
    } catch (error) {
      throw new Error(`Error running Command (${command})\n${error}`);
    }
  } else {
    throw new Error(`Command requested but "${command}" not registered!`);
  }
  return res;
}

/**
 * Returns a set of AppProviders from all extension registered Applications, complete with callbacks to run them.
 */
// Ardil TODO
async function getProviders(state: BackState): Promise<AppProvider[]> {
  return state.extensionsService.getContributions('applications')
  .then(contributions => {
    return contributions.map(c => {
      const apps = c.value;
      return apps.map(app => {
        return {
          ...app,
          callback: async (game: Game) => {
            if (app.command) {
              return runCommand(state, app.command, [game]);
            } else if (app.path) {
              const parsedArgs = await Promise.all(app.arguments.map(a => parseAppVar(c.extId, a, game.launchCommand, state)));
              const parsedPath = await parseAppVar(c.extId, app.path, game.launchCommand, state);
              return [parsedPath, ...parsedArgs];
            } else if (app.url) {
              const formattedUrl = await parseAppVar(c.extId, app.url, game.launchCommand, state);
              const opts: BrowserApplicationOpts = {
                url: formattedUrl
              };
              return opts;
            } else {
              throw new Error('Neither path or command are defined for application, cannot run.');
            }
          }
        };
      });
    })
    .reduce((prev, cur) => cur = cur.concat(prev), []);
  }
  );
}
