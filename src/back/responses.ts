import { createSearchFilter, getTaggedSearch } from '@back/util/search';
import {
  GameSearchOffset,
  GameSearchSortable,
  newSubfilter,
  PartialTagCategory
} from '@fparchive/flashpoint-archive';
import { LogLevel } from '@shared/Log/interface';
import { MetaEditFile, MetaEditMeta } from '@shared/MetaEdit';
import { deepCopy, downloadFile, padEnd } from '@shared/Util';
import {
  BackIn,
  BackInit,
  BackOut,
  ComponentState,
  CurationImageEnum,
  DownloadDetails,
  GameOfTheDay,
  GetRendererLoadedDataResponse
} from '@shared/back/types';
import { overwriteConfigData } from '@shared/config/util';
import {
  CURATIONS_FOLDER_EXPORTED,
  CURATIONS_FOLDER_WORKING,
  LOGOS,
  SCREENSHOTS,
  VIEW_PAGE_SIZE
} from '@shared/constants';
import { FPFSS_INFO_FILENAME } from '@shared/curate/fpfss';
import { convertGameToCurationMetaFile } from '@shared/curate/metaToMeta';
import { getContentFolderByKey } from '@shared/curate/util';
import { AppProvider, BrowserApplicationOpts } from '@shared/extensions/interfaces';
import { DeepPartial, GamePropSuggestions, ProcessAction, ProcessState } from '@shared/interfaces';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { defaultPreferencesData, overwritePreferenceData } from '@shared/preferences/util';
import { formatString } from '@shared/utils/StringFormatter';
import { TaskProgress } from '@shared/utils/TaskProgress';
import { chunkArray, getGameDataFilename, newGame } from '@shared/utils/misc';
import { sanitizeFilename } from '@shared/utils/sanitizeFilename';
import { throttle } from '@shared/utils/throttle';
import { execSync } from 'child_process';
import {
  ConfigSchema,
  CurationState,
  DownloadTask,
  Game,
  GameData,
  GameLaunchInfo,
  GameMetadataSource,
  GameMiddlewareInfo,
  LaunchInfo,
  LoadedCuration,
  Tag,
  TagCategory
} from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import * as fs_extra from 'fs-extra';
import * as https from 'https';
import { snakeCase, transform } from 'lodash';
import { add, Progress } from 'node-7z';
import * as os from 'os';
import * as path from 'path';
import * as url from 'url';
import * as util from 'util';
import * as YAML from 'yaml';
import { ConfigFile } from './ConfigFile';
import { ExtConfigFile } from './ExtConfigFile';
import { escapeArgsForShell, GameLauncher } from './GameLauncher';
import { ManagedChildProcess } from './ManagedChildProcess';
import { importAllMetaEdits } from './MetaEdit';
import { DEFAULT_PLAYLIST_DATA, overwritePlaylistData, PlaylistFile } from './PlaylistFile';
import { CONFIG_FILENAME, EXT_CONFIG_FILENAME, PREFERENCES_FILENAME } from './constants';
import { loadCurationIndexImage } from './curate/parse';
import {
  duplicateCuration,
  genCurationWarnings,
  loadCurationFolder,
  makeCurationFromGame,
  refreshCurationContent
} from './curate/util';
import { saveCuration } from './curate/write';
import { downloadGameData } from './download';
import { parseAppVar } from './extensions/util';
import { clearWininetCache, importCuration, launchAddAppCuration, launchCuration } from './importGame';
import { databaseReady, fpDatabase, loadCurationArchive } from './index';
import { importGames, importPlatforms, importTagCategories, importTags } from './metadataImport';
import {
  addPlaylistGame,
  deletePlaylist,
  deletePlaylistGame,
  duplicatePlaylist,
  filterPlaylists,
  getPlaylistGame,
  importPlaylist,
  savePlaylistGame,
  updatePlaylist
} from './playlist';
import { genContentTree } from './rust';
import { getMetaUpdateInfo, syncGames, syncPlatforms, syncRedirects, syncTags } from './sync';
import { BackState, MetadataRaw, TagsFile } from './types';
import { pathTo7zBack } from './util/SevenZip';
import { awaitDialog, createNewDialog } from './util/dialog';
import { onDidUninstallGameData, onWillUninstallGameData } from './util/events';
import {
  compareSemVerVersions,
  copyError,
  createAddAppFromLegacy,
  createContainer,
  createGameFromLegacy,
  dateToFilenameString,
  deleteCuration,
  exit,
  getCwd,
  getTempFilename,
  openFlashpointManager,
  pathExists,
  processPlatformAppPaths,
  procToService,
  promiseSleep,
  removeService,
  runService
} from './util/misc';
import { uuid } from './util/uuid';
import { axios } from './dns';
import { Downloader } from './Downloader';

/**
 * Register all request callbacks to the socket server.
 *
 * @param state State of the back.
 * @param init Initialization function (only runs once per state)
 */
export function registerRequestCallbacks(state: BackState, init: () => Promise<void>): void {
  state.socketServer.register(BackIn.KEEP_ALIVE, () => {});

  state.socketServer.register(BackIn.PREP_RELOAD_WINDOW, async () => {
    state.ignoreQuit = true;
    await state.extensionsService.unloadAll();
    await state.extensionsService.loadAll();
    setTimeout(() => {
      state.ignoreQuit = false;
    }, 1000);
  });

  state.socketServer.register(BackIn.TEST_RECONNECTIONS, async () => {
    // Close connections, expect them to restart
    state.socketServer.onError(new Error('test'));
  });

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

  state.socketServer.register(BackIn.GET_MAIN_INIT_DATA, () => {
    return {
      preferences: state.preferences,
      config: state.config,
    };
  });

  state.socketServer.register(BackIn.GET_LOGGER_INIT_DATA, () => {
    return {
      preferences: state.preferences,
      config: state.config,
      log: state.log
    };
  });

  state.socketServer.register(BackIn.GET_RENDERER_EXTENSION_INFO, async () => {
    return {
      devScripts: await state.extensionsService.getContributions('devScripts'),
      contextButtons: await state.extensionsService.getContributions('contextButtons'),
      curationTemplates: await state.extensionsService.getContributions('curationTemplates'),
      extConfigs: await state.extensionsService.getContributions('configuration'),
      extConfig: state.extConfig,
      extensions: (await state.extensionsService.getExtensions()).map(e => {
        return {
          id: e.id,
          ...e.manifest
        };
      }),
    };
  });

  state.socketServer.register(BackIn.CANCEL_DOWNLOAD, async () => {
    state.downloadController.abort();
  });

  state.socketServer.register(BackIn.GET_RENDERER_LOADED_DATA, async (event) => {
    const libraries = await fpDatabase.findAllGameLibraries();

    // Fetch update feed in background
    if (state.preferences.updateFeedUrl) {
      axios.get(state.preferences.updateFeedUrl, { timeout: 3000 })
      .then((res) => {
        state.socketServer.broadcast(BackOut.UPDATE_FEED, res.data);
      })
      .catch((err) => {
        log.debug('Launcher', `Failed to fetch news feed from ${state.preferences.updateFeedUrl}, ERROR: ${err}`);
      });
    } else {
      log.debug('Launcher', 'No Update Feed URL specified');
    }

    // Fetch GOTD file
    const gotdUrl = state.config.gotdUrl;
    const gotdPath = path.join(state.config.flashpointPath, 'Data', 'gotd.json');
    const gotdDownload = new Promise((resolve, reject) => {
      const thumbnailWriter = fs.createWriteStream(gotdPath);
      console.log('downloading gotd');
      axios.get(gotdUrl, { responseType: 'stream' })
      .then((res) => {
        res.data.pipe(thumbnailWriter);
        thumbnailWriter.on('close', resolve);
        thumbnailWriter.on('error', (err) => {
          thumbnailWriter.close();
          reject(err);
        });
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
    })
    .catch(() => {
      log.error('Launcher', 'Failed to download gotd list from ' + gotdUrl);
    });

    let gotdList: GameOfTheDay[] | undefined = undefined;
    try {
      // Try to load the existing file first
      gotdList = JSON.parse(fs.readFileSync(gotdPath, { encoding: 'utf8' })).games || [];
      gotdList = (gotdList as GameOfTheDay[]).filter((g: any) => g.id !== '');

      // Now let the download update in its own time
      gotdDownload.then(() => {
        try {
          gotdList = JSON.parse(fs.readFileSync(gotdPath, { encoding: 'utf8' })).games || [];
          gotdList = (gotdList as GameOfTheDay[]).filter((g: any) => g.id !== '');
          state.socketServer.broadcast(BackOut.UPDATE_GOTD, gotdList);
        } catch {
          /** Bad download, ignore */
        }
      })
      .catch(() => {
        /** Bad download, ignore */
      });
    } catch {
      // File doesn't exist, or broken, lets wait for a new one before trying again and returning
      gotdList = await gotdDownload
      .then(() => {
        // Try loading again
        let list = [];
        try {
          list = JSON.parse(fs.readFileSync(gotdPath, { encoding: 'utf8' })).games || [];
          list = list.filter((g: any) => g.id !== '');
          return list;
        } catch {
          /** Neither local or remote, give up */
          return [];
        }
      })
      .catch(() => {
        /** Neither local or remote, give up */
        return [];
      });
    }

    fpDatabase.findPlatformAppPaths().then((paths) => {
      paths = processPlatformAppPaths(paths);
      state.platformAppPaths = paths;
      state.socketServer.broadcast(BackOut.UPDATE_PLATFORM_APP_PATHS, paths);
    });

    const res: GetRendererLoadedDataResponse = {
      gotdList: gotdList,
      libraries: libraries,
      services: Array.from(state.services.values()).map(s => procToService(s)),
      serverNames: state.serviceInfo ? state.serviceInfo.server.map(i => i.name || '') : [],
      tagCategories: await fpDatabase.findAllTagCategories(),
      suggestions: state.suggestions,
      platformAppPaths: state.platformAppPaths,
      logoSets: Array.from(state.registry.logoSets.values()),
      mad4fpEnabled: state.serviceInfo ? (state.serviceInfo.server.findIndex(s => s.mad4fp === true) !== -1) : false,
      componentStatuses: state.componentStatuses,
      shortcuts: state.shortcuts,
    };

    // Fire after return has sent
    setTimeout(async () => {
      state.apiEmitters.onDidConnect.fire();
    }, 100);

    return res;
  });

  state.socketServer.register(BackIn.PRE_UPDATE_INFO, async (event, source: GameMetadataSource) => {
    let totalGames = 0;
    try {
      totalGames = await fpDatabase.countGames();
    } catch {/** ignore, errors if 0 count */}
    if (totalGames === 0) {
      return getMetaUpdateInfo(source, false, true);
    } else {
      return getMetaUpdateInfo(source);
    }
  });

  state.socketServer.register(BackIn.GET_RENDERER_INIT_DATA, async () => {
    state.languageContainer = createContainer(
      state.languages,
      state.preferences.currentLanguage,
      state.localeCode,
      state.preferences.fallbackLanguage
    );

    return {
      preferences: state.preferences,
      config: state.config,
      fileServerPort: state.fileServerPort,
      log: state.log,
      customVersion: state.customVersion,
      languages: state.languages,
      language: state.languageContainer,
      themes: Array.from(state.registry.themes.values()),
      localeCode: state.localeCode,
    };

  });

  state.socketServer.register(BackIn.SYNC_TAGGED, async (event, source) => {
    const openDialog = state.socketServer.showMessageBoxBack(state, event.client);
    const dialogId = await openDialog({
      largeMessage: true,
      message: `Updating tags from ${source.name}...`,
      buttons: []
    });
    try {
      const newDate = new Date();
      let lastDate = new Date();
      const lastDatePlats = await syncPlatforms(source);
      const lastDateTags = await syncTags(source);
      if (lastDatePlats > lastDateTags) {
        lastDate = lastDatePlats;
      } else {
        lastDate = lastDateTags;
      }
      /** Success */
      const sourceIdx = state.preferences.gameMetadataSources.findIndex(s => s.name === source.name);
      if (sourceIdx !== -1) {
        state.preferences.gameMetadataSources[sourceIdx].tags.latestUpdateTime = lastDate.toISOString();
        state.preferences.gameMetadataSources[sourceIdx].tags.actualUpdateTime = newDate.toISOString();
        state.prefsQueue.push(() => {
          PreferencesFile.saveFile(path.join(state.config.flashpointPath, PREFERENCES_FILENAME), state.preferences, state);
        });
      }
    } finally {
      state.socketServer.broadcast(BackOut.CANCEL_DIALOG, dialogId);
    }
  });

  state.socketServer.register(BackIn.SYNC_ALL, async (event, source) => {
    if (!state.isDev) {
      // Make sure we meet minimum verison requirements
      const updatesReady = state.componentStatuses.filter(c => c.id === 'core-launcher' && c.state === ComponentState.NEEDS_UPDATE).length > 0;
      const version = state.version;
      const versionUrl = `${source.baseUrl}/api/min-launcher`;
      const res = await axios.get(versionUrl)
      .catch((err) => { throw `Failed to find minimum launcher version requirement from metadata server.\n${err}`; });
      if (compareSemVerVersions(version, res.data['min-version'] || '9999999999999') < 0) {
        if (!updatesReady) {
          // No software update ready but metadata server requires it
          const openDialog = state.socketServer.showMessageBoxBack(state, event.client);
          await openDialog({
            largeMessage: true,
            message: state.languageContainer.app.noLauncherUpdateReady,
            buttons: [state.languageContainer.misc.ok]
          });
          return false;
        }
        // Too old to sync metadata, prompt a software update
        const openDialog = state.socketServer.showMessageBoxBack(state, event.client);
        const dialogId = await openDialog({
          largeMessage: true,
          message: state.languageContainer.app.softwareUpdateRequired,
          buttons: [state.languageContainer.misc.yes, state.languageContainer.misc.no],
          cancelId: 1
        });
        const button = (await awaitDialog(state, dialogId)).buttonIdx;
        if (button !== 0) {
          log.info('Launcher', 'User aborted metadata update: Refused required software update.');
          return false;
        } else {
          openFlashpointManager(state);
          return false;
        }
      }
    }

    let totalGames = 0;
    try {
      totalGames = await fpDatabase.countGames();
    } catch {/** ignore, errors on 0 count */}
    // Always do a full sync if empty DB
    if (totalGames === 0) {
      source.games = {
        actualUpdateTime: source.games.actualUpdateTime,
        latestDeleteTime: source.games.latestDeleteTime,
        latestUpdateTime: '1970-01-01'
      };
      source.tags = {
        actualUpdateTime: source.games.actualUpdateTime,
        latestDeleteTime: source.games.latestDeleteTime,
        latestUpdateTime: '1970-01-01'
      };
    }

    // Fetch pre-update info to estimate progress bar size
    const total = await getMetaUpdateInfo(source, true, totalGames === 0);
    const chunks = Math.ceil(total / 2500);

    const openDialog = state.socketServer.showMessageBoxBack(state, event.client);
    const dialogId = await openDialog({
      largeMessage: true,
      message: `Syncing metadata from ${source.name}...`,
      buttons: [],
      fields: [
        {
          type: 'progress',
          name: 'progress',
          message: `${total} Updates...`,
          value: 0
        }
      ]
    });

    try {
      // Tags and platforms
      const newDate = new Date();
      let lastDate = new Date();
      const lastDatePlats = await syncPlatforms(source);
      const lastDateTags = await syncTags(source);
      if (lastDatePlats > lastDateTags) {
        lastDate = lastDatePlats;
      } else {
        lastDate = lastDateTags;
      }
      const sourceIdx = state.preferences.gameMetadataSources.findIndex(s => s.name === source.name);
      if (sourceIdx !== -1) {
        state.preferences.gameMetadataSources[sourceIdx].tags.latestUpdateTime = lastDate.toISOString();
        state.preferences.gameMetadataSources[sourceIdx].tags.actualUpdateTime = newDate.toISOString();
        state.prefsQueue.push(() => {
          PreferencesFile.saveFile(path.join(state.config.flashpointPath, PREFERENCES_FILENAME), state.preferences, state);
        });
      }

      console.log('games');
      const dataPacksFolder = path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath);
      let chunk = 0;
      lastDate = await syncGames(source, dataPacksFolder, () => {
        chunk = chunk + 1;
        const progress = chunk / chunks;
        state.socketServer.broadcast(BackOut.UPDATE_DIALOG_FIELD_VALUE, dialogId, 'progress', progress * 100);
      });
      await syncRedirects(source);
      if (sourceIdx !== -1) {
        state.preferences.gameMetadataSources[sourceIdx].games.latestUpdateTime = lastDate.toISOString();
        state.preferences.gameMetadataSources[sourceIdx].games.actualUpdateTime = newDate.toISOString();
        state.prefsQueue.push(() => {
          PreferencesFile.saveFile(path.join(state.config.flashpointPath, PREFERENCES_FILENAME), state.preferences, state);
        });
        state.socketServer.broadcast(BackOut.UPDATE_PREFERENCES_RESPONSE, state.preferences);
      }

      // Send out new suggestions and library lists
      state.suggestions = {
        tags: [],
        playMode: await fpDatabase.findAllGamePlayModes(),
        platforms: (await fpDatabase.findAllPlatforms()).map(p => p.name),
        status: await fpDatabase.findAllGameStatuses(),
        applicationPath: await fpDatabase.findAllGameApplicationPaths(),
        library: await fpDatabase.findAllGameLibraries(),
      };
      state.platformAppPaths = processPlatformAppPaths(await fpDatabase.findPlatformAppPaths()); // Update cache
      const total = await fpDatabase.countGames();
      const cats = await fpDatabase.findAllTagCategories();
      state.socketServer.broadcast(BackOut.POST_SYNC_CHANGES, state.suggestions.library, state.suggestions, state.platformAppPaths, cats, total);
      return true;
    } finally {
      state.socketServer.broadcast(BackOut.CANCEL_DIALOG, dialogId);
    }
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

    if (!state.runInit) {
      state.runInit = true;
      init();
    }

    return { done };
  });

  state.socketServer.register(BackIn.GET_SUGGESTIONS, async () => {
    const suggestions: GamePropSuggestions = {
      tags: [],
      playMode: await fpDatabase.findAllGamePlayModes(),
      platforms: (await fpDatabase.findAllPlatforms()).map(p => p.name),
      status: await fpDatabase.findAllGameStatuses(),
      applicationPath: await fpDatabase.findAllGameApplicationPaths(),
      library: await fpDatabase.findAllGameLibraries(),
    };
    state.platformAppPaths = processPlatformAppPaths(await fpDatabase.findPlatformAppPaths()); // Update cache
    return {
      suggestions: suggestions,
      platformAppPaths: {},
    };
  });

  state.socketServer.register(BackIn.GET_GAMES_TOTAL, async () => {
    return fpDatabase.countGames();
  });

  state.socketServer.register(BackIn.SET_LOCALE, (event, data) => {
    state.localeCode = data;

    // @TODO Update the language container if the locale changes

    return data;
  });

  state.socketServer.register(BackIn.GET_EXEC, () => {
    return state.execMappings;
  });

  state.socketServer.register(BackIn.LAUNCH_ADDAPP, async (event, id, override) => {
    const addApp = await fpDatabase.findAddAppById(id);
    if (addApp) {
      // Force load relation
      const parentGame = await fpDatabase.findGame(addApp.parentGameId);
      if (!parentGame) {
        log.error('Game Launcher', 'Add app missing parent game?: {}');
        return;
      }
      // const configs = parentGame?.gameConfigs;
      // const activeConfigIdx = configs.findIndex(c => c.id === addApp.parentGame.activeGameConfigId);
      // if (addApp.parentGame.activeGameConfigId && activeConfigIdx === -1) {
      //   throw 'Failed to load game config data despite it being selected?';
      // }
      // const activeConfig = configs[activeConfigIdx];
      const activeConfig = null;
      // If it has GameData, make sure it's present
      let gameData: GameData | null;
      if (parentGame.activeDataId) {
        gameData = await fpDatabase.findGameDataById(parentGame.activeDataId);
        if (gameData && !gameData.presentOnDisk) {
          // Download GameData
          try {
            await downloadGameDataRes(state, gameData);
          } catch (error: any) {
            state.socketServer.broadcast(BackOut.OPEN_ALERT, error);
            log.info('Game Launcher', `Add App Launch Aborted: ${error}`);
            return;
          }
        }
      }
      await state.apiEmitters.games.onWillLaunchAddApp.fireAlert(state, addApp, event.client, 'Error during add app launch api event');
      await GameLauncher.launchAdditionalApplication({
        addApp,
        changeServer: changeServerFactory(state),
        fpPath: path.resolve(state.config.flashpointPath),
        htdocsPath: state.preferences.htdocsFolderPath,
        dataPacksFolderPath: state.preferences.dataPacksFolderPath,
        sevenZipPath: state.sevenZipPath,
        native: parentGame && state.preferences.nativePlatforms.some(p => parentGame.platforms.includes(p)) || false,
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        appPathOverrides: state.preferences.appPathOverrides,
        providers: await getProviders(state),
        proxy: state.preferences.browserModeProxy,
        openDialog: state.socketServer.showMessageBoxBack(state, event.client),
        openExternal: state.socketServer.openExternal(event.client),
        runGame: runGameFactory(state),
        envPATH: state.pathVar,
        activeConfig,
        state,
        parentGame,
        runAddApp: runAddAppFactory(state),
        autoClearWininetCache: state.preferences.autoClearWininetCache,
        override,
      }, false);
      state.apiEmitters.games.onDidLaunchAddApp.fireAlert(state, addApp, event.client, 'Error during post add app launch api event');
    }
  });

  state.socketServer.register(BackIn.LAUNCH_GAME, async (event, id, override) => {
    const game = await fpDatabase.findGame(id);
    console.log('override: ' + override);

    if (game) {
      // Make sure Server is set to configured server - Curations may have changed it
      const configServer = state.serviceInfo ? state.serviceInfo.server.find(s => s.name === state.preferences.server) : undefined;
      if (configServer) {
        const server = state.services.get('server');
        if (!server || !('name' in server.info) || server.info.name !== configServer.name) {
          // Server is different, change now
          if (server) { await removeService(state, 'server'); }
          runService(state, 'server', 'Server', state.config.flashpointPath, { env: {
            ...process.env,
            'PATH': state.pathVar ?? process.env.PATH,
          } }, configServer);
          await promiseSleep(1500);
        }
      }

      // If it has GameData, make sure it's present
      if (game.activeDataId && game.gameData) {
        log.debug('Launcher', 'Found active game data');
        let gameData = game.gameData.find(gd => gd.id === game.activeDataId);
        if (gameData && !gameData.presentOnDisk) {
          // Game data is not downloaded, check if an old one was being used before
          const orderedGameData = [...game.gameData].sort((a, b) => a.dateAdded.localeCompare(b.dateAdded)).reverse();
          for (const oldGd of orderedGameData) {
            if (oldGd.presentOnDisk) {
              // Found existing game data, verify with the user that we should upgrade it
              const lcDifferent = oldGd.launchCommand !== gameData.launchCommand;
              if (lcDifferent) {
                const strings = state.languageContainer;
                const dialogId = await state.socketServer.showMessageBoxBack(state, event.client)({
                  largeMessage: true,
                  message: `${strings.dialog.gameDataUpdateReadyLcDifferent}`,
                  buttons: [strings.misc.yes, strings.misc.no],
                  cancelId: 1,
                });
                const result = (await awaitDialog(state, dialogId)).buttonIdx;
                if (result === 1) {
                  log.info('Game Launcher', 'User chose to keep using old game data');
                  // Mark this as the new active game data
                  game.activeDataId = oldGd.id;
                  game.activeDataOnDisk = oldGd.presentOnDisk;
                  await fpDatabase.saveGame(game);
                  gameData = oldGd;
                } else {
                  log.info('Game Launcher', 'Upgrading from old game data (lc changed)...');
                }
              } else {
                const strings = state.languageContainer;
                const dialogId = await state.socketServer.showMessageBoxBack(state, event.client)({
                  largeMessage: true,
                  message: `${strings.dialog.gameDataUpdateReady}`,
                  buttons: [strings.misc.yes, strings.misc.no],
                  cancelId: 1,
                });
                const result = (await awaitDialog(state, dialogId)).buttonIdx;
                if (result === 1) {
                  log.info('Game Launcher', 'User chose to keep using old game data');
                  // Mark this as the new active game data
                  game.activeDataId = oldGd.id;
                  game.activeDataOnDisk = oldGd.presentOnDisk;
                  await fpDatabase.saveGame(game);
                  gameData = oldGd;
                } else {
                  log.info('Game Launcher', 'Upgrading from old game data (lc same)...');
                }
              }
              break;
            }
          }
          if (!gameData.presentOnDisk) {
            // Make sure we didn't choose to swap game data during the user dialog above
            log.debug('Game Launcher', 'Downloading Game Data for ' + getGameDataFilename(gameData) || 'UNKNOWN');
            // Download GameData
            try {
              await downloadGameDataRes(state, gameData);
              gameData = (await fpDatabase.findGameDataById(gameData.id)) as GameData;
            } catch (error: any) {
              state.socketServer.broadcast(BackOut.OPEN_ALERT, error);
              log.info('Game Launcher', `Game Launch Aborted: ${error}`);
              return;
            }
          }
        }

        // Make sure it has a path set, check the default location if it does not then save it back
        if (gameData && !gameData.path) {
          const realPath = path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath, `${gameData.gameId}-${(new Date(gameData.dateAdded)).getTime()}.zip`);
          if (fs.existsSync(realPath)) {
            gameData.path = realPath;
            gameData.presentOnDisk = true;
            game.activeDataOnDisk = true;
            await fpDatabase.saveGameData(gameData);
            await fpDatabase.saveGame(game);
          }
        }
      }
      // Game config
      // const configs = await GameManager.findGameConfigs(game.id, state.registry.middlewares);
      // const activeConfig = configs.find(c => c.id === game.activeGameConfigId);
      // if (game.activeGameConfigId && activeConfig === undefined) {
      //   throw 'Could not load game config despite one being selected?';
      // }
      const activeConfig = null;
      // Launch game
      await GameLauncher.launchGame({
        game,
        fpPath: path.resolve(state.config.flashpointPath),
        htdocsPath: state.preferences.htdocsFolderPath,
        dataPacksFolderPath: state.preferences.dataPacksFolderPath,
        sevenZipPath: state.sevenZipPath,
        native: state.preferences.nativePlatforms.some(p => game.platforms.includes(p)),
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        appPathOverrides: state.preferences.appPathOverrides,
        providers: await getProviders(state),
        proxy: state.preferences.browserModeProxy,
        openDialog: state.socketServer.showMessageBoxBack(state, event.client),
        openExternal: state.socketServer.openExternal(event.client),
        runGame: runGameFactory(state),
        runAddApp: runAddAppFactory(state),
        envPATH: state.pathVar,
        changeServer: changeServerFactory(state),
        activeConfig: activeConfig ? activeConfig : null,
        state,
        autoClearWininetCache: state.preferences.autoClearWininetCache,
        override,
      },
      state.apiEmitters.games.onWillLaunchGame.fireableFactory(state, event.client, 'Error during game launch api event'), false);
      await state.apiEmitters.games.onDidLaunchGame.fireAlert(state, game, event.client, 'Error from post game launch api event');
    }
  });

  state.socketServer.register(BackIn.SAVE_GAMES, async (event, data) => {
    await fpDatabase.saveGames(data);
  });

  state.socketServer.register(BackIn.SAVE_GAME, async (event, game) => {
    try {
      // Save configs
      // for (let i = 0; i < info.configs.length; i++) {
      //   const config = info.configs[i];
      //   info.configs[i] = await GameManager.saveGameConfig(config, state.registry.middlewares);
      // }
      // const validConfigIds = info.configs.map(c => c.id);
      // // Save game
      // if (info.activeConfig && validConfigIds.includes(info.activeConfig.id)) {
      //   info.game.activeGameConfigId = info.activeConfig.id;
      //   info.game.activeGameConfigOwner = info.activeConfig.owner;
      // } else {
      //   info.game.activeGameConfigId = undefined;
      //   info.game.activeGameConfigOwner = undefined;
      // }
      const savedGame = await fpDatabase.saveGame(game);
      state.queries = {}; // Clear entire cache
      return savedGame;
    } catch (err) {
      console.error(err);
      throw err;
    }
  });

  state.socketServer.register(BackIn.DELETE_GAME_CONFIG, async (event, id) => {
    // await GameManager.deleteGameConfig(id);
  });

  state.socketServer.register(BackIn.DELETE_GAME, async (event, id) => {
    const game = await fpDatabase.findGame(id);
    if (game) {
      await fpDatabase.deleteGame(id);
    } else {
      throw 'Invalid game';
    }
    // TODO: Copy over file operations
    // path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath),
    // path.join(state.config.flashpointPath, state.preferences.imageFolderPath),
    // path.join(state.config.flashpointPath, state.preferences.htdocsFolderPath));

    state.queries = {}; // Clear entire cache

    return null;
  });

  state.socketServer.register(BackIn.DUPLICATE_GAME, async (event, id, dupeImages) => {
    const game = await fpDatabase.findGame(id);
    let result: Game | null = null;
    if (game) {
      // Copy and apply new IDs
      const newGame = deepCopy(game);
      const newAddApps = game.addApps!.map(addApp => deepCopy(addApp));
      newGame.id = uuid();
      for (let j = 0; j < newAddApps.length; j++) {
        newAddApps[j].id = uuid();
        newAddApps[j].parentGameId = newGame.id;
      }
      newGame.addApps = newAddApps;

      // Add copies
      result = await fpDatabase.saveGame(newGame);

      // Copy images
      if (dupeImages) {
        const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
        const oldLast = path.join(game.id.substring(0, 2), game.id.substring(2, 4), game.id+'.png');
        const newLast = path.join(newGame.id.substring(0, 2), newGame.id.substring(2, 4), newGame.id+'.png');

        const oldLogoPath = path.join(imageFolder, LOGOS, oldLast);
        const newLogoPath = path.join(imageFolder, LOGOS, newLast);
        try {
          if (await pathExists(oldLogoPath)) {
            await fs.promises.mkdir(path.dirname(newLogoPath), { recursive: true });
            await fs.promises.copyFile(oldLogoPath, newLogoPath);
          }
        } catch (e) { console.error(e); }

        const oldScreenshotPath = path.join(imageFolder, SCREENSHOTS, oldLast);
        const newScreenshotPath = path.join(imageFolder, SCREENSHOTS, newLast);
        try {
          if (await pathExists(oldScreenshotPath)) {
            await fs.promises.mkdir(path.dirname(newScreenshotPath), { recursive: true });
            await fs.promises.copyFile(oldScreenshotPath, newScreenshotPath);
          }
        } catch (e) { console.error(e); }
      }

      state.queries = {}; // Clear entire cache
    }

    return result;
  });

  state.socketServer.register(BackIn.DUPLICATE_PLAYLIST, async (event, playlistId) => {
    await duplicatePlaylist(state, playlistId);
  });

  state.socketServer.register(BackIn.DOWNLOAD_PLAYLIST_CONTENTS, async (event, playlistId) => {
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (playlist) {
      // Create a downloader for it
      const downloader = new Downloader(
        state.config.flashpointPath,
        state.preferences.dataPacksFolderPath,
        state.preferences.imageFolderPath,
        state.preferences.onDemandBaseUrl,
        state.preferences.gameDataSources,
        state,
        4
      );
      log.info('Downloads', 'Adding playlist to downloader with ' + playlist.games.length + ' games');
      const taskId = uuid();
      await state.socketServer.request(event.client, BackOut.CREATE_TASK, {
        id: taskId,
        name: `Downloading Playlist ${playlist.title}`,
        progress: 0,
        status: 'Creating Downloader...',
        finished: false,
      });

      downloader.stop();
      let total = 0;
      for (const { gameId } of playlist.games) {
        try {
          const game = await fpDatabase.findGame(gameId);
          if (game) {
            log.info('Downloads', 'Adding game ' + game.id);
            if (downloader.addTask(game)) {
              total += 1;
            }
          }
        } catch (e) {
          console.error('bad game get');
          console.error(e);
        }
      }

      state.socketServer.broadcast(BackOut.UPDATE_TASK, {
        id: taskId,
        status: `Completed: ${0} / ${total}`,
      });
      let completed = 0;
      let errors: string[] = [];
      const watcherCb = (task: DownloadTask) => {
        if (task.status !== 'waiting' && task.status !== 'in_progress') {
          completed += 1;
          if (task.status === 'failure') {
            log.error('Downloader', `Game download failed (${task.game.title}): ${task.errors.join('\n')}`);
            errors = errors.concat(task.errors);
          }
        }
        state.socketServer.broadcast(BackOut.UPDATE_TASK, {
          id: taskId,
          status: `Completed: ${completed} / ${total}`,
          progress: completed / total,
        });
        if (completed === total) {
          // Finished, unregister itself
          if (errors.length > 0) {
            state.socketServer.broadcast(BackOut.UPDATE_TASK, {
              id: taskId,
              finished: true,
              status: `Completed with ${errors.length} errors.`,
              error: errors.join('\n'),
            });
          } else {
            state.socketServer.broadcast(BackOut.UPDATE_TASK, {
              id: taskId,
              finished: true,
              status: 'Done',
            });
          }

          downloader.off('taskChange', watcherCb);
          downloader.clear(); // Downloader should discard itself after this loop anyway? Not sure honestly
        }
      };
      downloader.on('taskChange', watcherCb);
      downloader.start();
    } else {
      log.error('Downloads', 'Could not find playlist with id ' + playlistId);
    }
  });

  state.socketServer.register(BackIn.IMPORT_PLAYLIST, async (event, filePath, library) => {
    return importPlaylist(state, filePath, library, event);
  });

  state.socketServer.register(BackIn.EXPORT_GAME, async (event, id, location, metaOnly) => {
    if (await pathExists(metaOnly ? path.dirname(location) : location)) {
      const game = await fpDatabase.findGame(id);
      if (game) {
        // Save to file
        try {
          await fs.promises.writeFile(
            metaOnly ? location : path.join(location, 'meta.yaml'),
            YAML.stringify(convertGameToCurationMetaFile(game, await fpDatabase.findAllTagCategories())));
        } catch (e) { console.error(e); }

        // Copy images
        if (!metaOnly) {
          const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
          const last = path.join(game.id.substring(0, 2), game.id.substring(2, 4), game.id+'.png');

          const oldLogoPath = path.join(imageFolder, LOGOS, last);
          const newLogoPath = path.join(location, 'logo.png');
          try {
            if (await pathExists(oldLogoPath)) { await fs.promises.copyFile(oldLogoPath, newLogoPath); }
          } catch (e) { console.error(e); }

          const oldScreenshotPath = path.join(imageFolder, SCREENSHOTS, last);
          const newScreenshotPath = path.join(location, 'ss.png');
          try {
            if (await pathExists(oldScreenshotPath)) { await fs.promises.copyFile(oldScreenshotPath, newScreenshotPath); }
          } catch (e) { console.error(e); }
        }
      }
    }
  });

  state.socketServer.register(BackIn.GET_VALID_MIDDLEWARE, (event, game) => {
    const list: GameMiddlewareInfo[] = [];
    for (const middleware of state.registry.middlewares.entries()) {
      if (middleware[1].isValid(game)) {
        list.push({
          middlewareId: middleware[0],
          name: middleware[1].name,
        });
      }
    }
    return list;
  });

  state.socketServer.register(BackIn.GET_GAME, async (event, id) => {
    return await fpDatabase.findGame(id);
    // TODO: Reimplement game configs
  });

  state.socketServer.register(BackIn.GET_MIDDLEWARE_CONFIG_SCHEMAS, async (event, mIds) => {
    const schemas: Record<string, ConfigSchema> = {};

    for (const pair of mIds) {
      // Find middleware in reg
      const { id, version } = pair;
      const middleware = state.registry.middlewares.get(id);
      if (middleware) {
        try {
          schemas[`${id}-${version}`] = middleware.getConfigSchema(version);
        } catch (err) {
          log.error('Launcher', `Failed to load config schema for ${id} - ${err}`);
        }
      }
    }

    return schemas;
  });

  state.socketServer.register(BackIn.GET_MIDDLEWARE_DEFAULT_CONFIG, async (event, mId, game) => {
    const middleware = state.registry.middlewares.get(mId);
    if (middleware) {
      try {
        const defaultConfig = middleware.getDefaultConfig(game);
        const schema = middleware.getConfigSchema(defaultConfig.version);
        return {
          config: {
            ...defaultConfig,
            enabled: true,
            middlewareId: middleware.id,
            name: middleware.name
          },
          schema
        };
      } catch (err) {
        log.error('Launcher', `Failed to get default config for ${mId} - ${err}`);
        throw `Failed to get default config for ${mId} - ${err}`;
      }
    } else {
      throw `Failed to find middleware for ${mId}`;
    }
  });

  state.socketServer.register(BackIn.CHECK_MIDDLEWARE_VERSION_VALIDITY, async (event, mId, version) => {
    const middleware = state.registry.middlewares.get(mId);
    if (middleware) {
      return Promise.resolve(middleware.isValidVersion(version));
    } else {
      throw 'Could not find middleware';
    }
  });

  state.socketServer.register(BackIn.GET_GAME_DATA, async (event, id) => {
    const gameData = await fpDatabase.findGameDataById(id);
    // Verify it's still on disk
    if (gameData) {
      const gameDataFilename = getGameDataFilename(gameData);
      try {
        await fs.promises.access(path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath, gameDataFilename), fs.constants.F_OK);
        if (!gameData.presentOnDisk) {
          gameData.presentOnDisk = true;
          return fpDatabase.saveGameData(gameData);
        }
      } catch (err) {
        if (gameData.presentOnDisk) {
          gameData.presentOnDisk = false;
          return fpDatabase.saveGameData(gameData);
        }
      }
    }
    return gameData;
  });

  state.socketServer.register(BackIn.GET_GAMES_GAME_DATA, async (event, id) => {
    return fpDatabase.findGameData(id);
  });

  state.socketServer.register(BackIn.SAVE_GAME_DATAS, async (event, data) => {
    // Ignore presentOnDisk, client isn't the most aware
    await Promise.all(data.map(async (d) => {
      const existingData = await fpDatabase.findGameDataById(d.id);
      if (existingData) {
        existingData.title = d.title;
        existingData.applicationPath = d.applicationPath;
        existingData.launchCommand = d.launchCommand;
        existingData.parameters = d.parameters;
        return fpDatabase.saveGameData(existingData);
      }
    }));
  });

  state.socketServer.register(BackIn.DELETE_GAME_DATA, async (event, gameDataId) => {
    const gameData = await fpDatabase.findGameDataById(gameDataId);
    if (gameData) {
      if (gameData.presentOnDisk) {
        const gameDataFilename = getGameDataFilename(gameData);
        await onWillUninstallGameData.fire(gameData);
        const gameDataPath = path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath, gameDataFilename);
        await fs.promises.unlink(gameDataPath);
        gameData.path = undefined;
        gameData.presentOnDisk = false;
        onDidUninstallGameData.fire(gameData);
      }
      const game = await fpDatabase.findGame(gameData.gameId);
      if (game) {
        game.activeDataId = undefined;
        game.activeDataOnDisk = false;
        await fpDatabase.saveGame(game);
      }
      await fpDatabase.deleteGameData(gameDataId);
    }
  });

  // state.socketServer.register(BackIn.IMPORT_GAME_DATA, async (event, gameId, filePath) => {
  //   return GameDataManager.importGameData(gameId, filePath, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath));
  // });

  state.socketServer.register(BackIn.DOWNLOAD_GAME_DATA, async (event, gameDataId) => {
    const gameData = await fpDatabase.findGameDataById(gameDataId);
    if (gameData) {
      await downloadGameDataRes(state, gameData)
      .catch((err) => {
        throw 'Failed to download';
      });
    } else {
      log.error('Launcher', `Game Data not found (ID=${gameDataId})`);
      throw new Error(`Game Data not found (ID=${gameDataId})`);
    }
  });

  state.socketServer.register(BackIn.UNINSTALL_GAME_DATA, async (event, id) => {
    const gameData = await fpDatabase.findGameDataById(id);
    if (gameData && gameData.presentOnDisk) {
      const gameDataFilename = getGameDataFilename(gameData);
      await onWillUninstallGameData.fire(gameData);
      // Delete Game Data
      const gameDataPath = path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath, gameDataFilename);
      await fs.promises.unlink(gameDataPath)
      .catch((error) => {
        if (error.code !== 'ENOENT') {
          log.error('Launcher', `Error Deleting Game: ${error}`);
          throw error;
        }
      });
      gameData.path = undefined;
      gameData.presentOnDisk = false;
      await fpDatabase.saveGameData(gameData);
      onDidUninstallGameData.fire(gameData);
      // Update Game
      const game = await fpDatabase.findGame(gameData.gameId);
      if (game && game.activeDataId === gameData.id) {
        game.activeDataOnDisk = false;
        return fpDatabase.saveGame(game);
      }
    }
    return null;
  });

  state.socketServer.register(BackIn.GET_SOURCES, async () => {
    return state.preferences.gameDataSources;
  });

  state.socketServer.register(BackIn.GET_ALL_GAMES, async (event, offsetGameTitle, offsetGameId) => {
    const search = fpDatabase.parseUserSearchInput('').search;
    search.limit = 10000;
    if (offsetGameId && offsetGameTitle) {
      search.offset = {
        value: offsetGameTitle,
        gameId: offsetGameId,
        title: offsetGameTitle,
      };
    }
    return fpDatabase.searchGames(search);
  });

  state.socketServer.register(BackIn.RANDOM_GAMES, async (event, data) => {
    const search = fpDatabase.parseUserSearchInput('').search;
    // Add library filters
    search.filter.exactBlacklist.library = data.excludedLibraries;
    // Add tag filters
    const filteredTags = state.preferences.tagFilters
    .filter(t => t.enabled || (t.extreme && !state.preferences.browsePageShowExtreme))
    .map(t => t.tags)
    .reduce((prev, cur) => prev.concat(cur), []);
    /** For now, view identifiers always map to libraries to filter by */
    if (filteredTags.length > 0) {
      const filter = newSubfilter();
      filter.exactBlacklist.tags = filteredTags;
      filter.matchAny = true;
      search.filter.subfilters.push(filter);
    }
    return fpDatabase.searchGamesRandom(search, data.count);
  });

  state.socketServer.register(BackIn.BROWSE_VIEW_KEYSET, async (event, search) => {
    const startTime = Date.now();
    // Set page size
    search.limit = VIEW_PAGE_SIZE;

    const searchLimit = (!search.playlist && state.preferences.searchLimit) ? state.preferences.searchLimit : undefined;
    const countLimit = (!search.playlist && state.preferences.searchLimit) ? state.preferences.searchLimit : 999999999;
    const result = await fpDatabase.searchGamesIndex(search, searchLimit);
    const total = Math.min(await fpDatabase.searchGamesTotal(search), countLimit);
    log.debug('Launcher', `Keyset Search Time: ${Date.now() - startTime}ms - count: ${total}`);
    return {
      // This mapping is dumb, TODO: Fix at source library
      keyset: result.map((value) => {
        const offset: GameSearchOffset = {
          value: value.orderVal,
          gameId: value.id,
          title: value.title,
        };
        return offset;
      }),
      total,
    };
  });

  state.socketServer.register(BackIn.PARSE_QUERY_DATA, async (event, query) => {
    return createSearchFilter(query, state.preferences);
  });

  state.socketServer.register(BackIn.BROWSE_VIEW_FIRST_PAGE, async (event, search) => {
    // Sort out playlist ordering for query if requsted
    if (search.playlist && search.order.column === GameSearchSortable.CUSTOM && search.customIdOrder) {
      await fpDatabase.newCustomIdOrder(search.playlist.games.map(p => p.gameId));
    }
    if (!search.playlist && search.order.column === GameSearchSortable.CUSTOM) {
      search.order.column = GameSearchSortable.TITLE;
    }

    const startTime = Date.now();
    search.slim = true;

    const searchLimit = state.preferences.searchLimit ? state.preferences.searchLimit : 999999999;
    search.limit = Math.min(VIEW_PAGE_SIZE, searchLimit);
    const results = await fpDatabase.searchGames(search);

    log.debug('Launcher', `First Page Search Time (${results.length}): ` + (Date.now() - startTime) + 'ms');

    return {
      games: results
    };
  });

  state.socketServer.register(BackIn.BROWSE_ALL_RESULTS, async (event, search) => {
    search.limit = 99999999999;

    return await fpDatabase.searchGames(search);
  });

  state.socketServer.register(BackIn.BROWSE_VIEW_PAGE, async (event, search) => {
    search.slim = true;

    const games = await fpDatabase.searchGames(search);

    await state.socketServer.send(event.client, BackOut.BROWSE_VIEW_PAGE, {
      viewId: search.viewId,
      searchId: search.searchId,
      page: search.page,
      games,
    });
  });

  // state.socketServer.register(BackIn.DELETE_TAG_CATEGORY, async (event, data) => {
  //   const result = await TagManager.deleteTagCategory(data, state.socketServer.showMessageBoxBack(state, event.client), state);
  //   state.socketServer.send(event.client, BackOut.DELETE_TAG_CATEGORY, result);
  //   state.socketServer.broadcast(BackOut.TAG_CATEGORIES_CHANGE, await fpDatabase.findAllTagCategories());
  //   return result;
  // });

  state.socketServer.register(BackIn.GET_DISTINCT_DEVELOPERS, async (event, tagFilters) => {
    const search = getTaggedSearch(tagFilters);
    return databaseReady()
    .then((db) => {
      return db.findAllGameDevelopers(search);
    });
  });

  state.socketServer.register(BackIn.GET_DISTINCT_PUBLISHERS, async (event, tagFilters) => {
    const search = getTaggedSearch(tagFilters);
    return databaseReady()
    .then((db) => {
      return db.findAllGamePublishers(search);
    });
  });

  state.socketServer.register(BackIn.GET_DISTINCT_SERIES, async (event, tagFilters) => {
    const search = getTaggedSearch(tagFilters);
    return databaseReady()
    .then((db) => {
      return db.findAllGameSeries(search);
    });
  });

  state.socketServer.register(BackIn.GET_TAG_CATEGORY_BY_ID, async (event, data) => {
    const result = await fpDatabase.findTagCategoryById(data);
    state.socketServer.send(event.client, BackOut.GET_TAG_CATEGORY_BY_ID, result);
    return result;
  });

  state.socketServer.register(BackIn.SAVE_TAG_CATEGORY, async (event, data) => {
    const result = await fpDatabase.saveTagCategory(data);
    state.socketServer.send(event.client, BackOut.SAVE_TAG_CATEGORY, result);
    state.socketServer.broadcast(BackOut.TAG_CATEGORIES_CHANGE, await fpDatabase.findAllTagCategories());
    return result;
  });

  state.socketServer.register(BackIn.GET_TAG_BY_ID, async (event, data) => {
    const tag = await fpDatabase.findTagById(data);
    state.socketServer.send(event.client, BackOut.GET_TAG_BY_ID, tag);
    return tag;
  });

  state.socketServer.register(BackIn.GET_PLATFORM_BY_ID, async (event, data) => {
    const platform = await fpDatabase.findPlatformById(data);
    return platform;
  });

  state.socketServer.register(BackIn.GET_TAGS, async (event, tagFilters) => {
    const flatFilters: string[] = tagFilters ? tagFilters.reduce<string[]>((prev, cur) => prev.concat(cur.tags), []) : [];
    return databaseReady()
    .then(async (db) => {
      const tags = (await db.findAllTags()).filter(t => !t.aliases.some(a => flatFilters.includes(a)));
      return tags;
    });
  });

  state.socketServer.register(BackIn.MERGE_TAGS, async (event, data) => {
    const newTag = await fpDatabase.mergeTags(data.toMerge, data.mergeInto);
    state.socketServer.send(event.client, BackOut.MERGE_TAGS, newTag);
    return newTag;
  });

  state.socketServer.register(BackIn.DELETE_TAG, async (event, data) => {
    await fpDatabase.deleteTag(data);
  });

  state.socketServer.register(BackIn.SAVE_TAG, async (event, data) => {
    const result = await fpDatabase.saveTag(data);
    state.socketServer.send(event.client, BackOut.SAVE_TAG, result);
    return result;
  });

  state.socketServer.register(BackIn.GET_TAG_SUGGESTIONS, async (event, text, tagFilters) => {
    const flatTagFilter = tagFilters.reduce<string[]>((prev, cur) => prev.concat(cur.tags.map(t => t.toLowerCase())), []);
    const result = await fpDatabase.searchTagSuggestions(text, flatTagFilter);
    const filtered = result.filter(sugg => !flatTagFilter.includes(sugg.name.toLowerCase()));
    state.socketServer.send(event.client, BackOut.GET_TAG_SUGGESTIONS, filtered);
    return result;
  });

  state.socketServer.register(BackIn.GET_PLATFORM_SUGGESTIONS, async (event, text) => {
    const result = await fpDatabase.searchPlatformSuggestions(text);
    return result;
  });

  state.socketServer.register(BackIn.SAVE_IMAGE, async (event, raw_folder, raw_id, content) => {
    const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
    const folder = sanitizeFilename(raw_folder);
    const id = sanitizeFilename(raw_id);
    const fullPath = path.join(imageFolder, folder, id.substring(0, 2), id.substring(2, 4), id + '.png');

    if (fullPath.startsWith(imageFolder)) { // (Ensure that it does not climb out of the image folder)
      try {
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.writeFile(fullPath, Buffer.from(content, 'base64'));
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
    const fullPath = path.join(imageFolder, folder, id.substring(0, 2), id.substring(2, 4), id + '.png');

    if (fullPath.startsWith(imageFolder)) { // (Ensure that it does not climb out of the image folder)
      try {
        if ((await fs.promises.stat(fullPath)).isFile()) {
          await fs.promises.unlink(fullPath);
          // @TODO Remove the two top folders if they are empty (so no empty folders are left hanging)
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') { console.error(error); }
      }
    }

    state.socketServer.send(event.client, BackOut.IMAGE_CHANGE, folder, id);
  });

  state.socketServer.register(BackIn.UPDATE_CONFIG, async (event, data) => {
    const newConfig = deepCopy(state.config);
    overwriteConfigData(newConfig, data);

    try { await ConfigFile.saveFile(path.join(state.configFolder, CONFIG_FILENAME), newConfig); }
    catch (error: any) { log.error('Launcher', error); }
  });

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

      overwritePreferenceData(state.preferences, dif, console.error);
      state.prefsQueue.push(() => {
        PreferencesFile.saveFile(path.join(state.config.flashpointPath, PREFERENCES_FILENAME), state.preferences, state);
      });
    }
    if (refresh) {
      state.socketServer.send(event.client, BackOut.UPDATE_PREFERENCES_RESPONSE, state.preferences);
    }
  });

  state.socketServer.register(BackIn.SERVICE_ACTION, async (event, action, id) => {
    const proc = state.services.get(id);
    if (proc) {
      switch (action) {
        case ProcessAction.START:
          proc.spawn();
          break;
        case ProcessAction.STOP:
          await proc.kill();
          break;
        case ProcessAction.RESTART:
          await proc.restart();
          break;
        default:
          console.warn('Unhandled Process Action');
      }
    }
  });

  state.socketServer.register(BackIn.GET_PLAYLIST, async (event, playlistId) => {
    return state.playlists.find(p => p.id === playlistId);
  });

  state.socketServer.register(BackIn.GET_TAG, async (event, data) => {
    const result = await fpDatabase.findTag(data);
    state.socketServer.send(event.client, BackOut.GET_TAG, result);
    return result;
  });

  state.socketServer.register(BackIn.GET_OR_CREATE_TAG, async (event, tagName, tagCategory) => {
    const name = tagName.trim();
    const category = tagCategory ? tagCategory.trim() : undefined;
    let tag = await fpDatabase.findTag(name);
    if (!tag) {
      // Tag doesn't exist, make a new one
      tag = await fpDatabase.createTag(name, category);
    }
    return tag;
  });

  state.socketServer.register(BackIn.GET_OR_CREATE_PLATFORM, async (event, platformName) => {
    const name = platformName.trim();
    let platform = await fpDatabase.findPlatform(name);
    if (!platform) {
      // Platform doesn't exist, make a new one
      platform = await fpDatabase.createPlatform(name);
    }
    return platform;
  });

  state.socketServer.register(BackIn.GET_PLAYLISTS, async () => {
    return filterPlaylists(state.playlists, state.preferences.browsePageShowExtreme);
  });

  state.socketServer.register(BackIn.SAVE_PLAYLIST, async (event, playlist) => {
    return updatePlaylist(state, playlist, playlist);
  });

  state.socketServer.register(BackIn.DELETE_PLAYLIST, async (event, playlistId) => {
    return deletePlaylist(state, playlistId);
  });

  state.socketServer.register(BackIn.GET_PLAYLIST_GAME, async (event, playlistId, gameId) => {
    return getPlaylistGame(state, playlistId, gameId);
  });

  state.socketServer.register(BackIn.ADD_PLAYLIST_GAME, async (event, playlistId, gameId) => {
    log.debug('Launcher', `Adding ${gameId} to ${playlistId}`);
    return addPlaylistGame(state, playlistId, gameId);
  });

  state.socketServer.register(BackIn.SAVE_PLAYLIST_GAME, async (event, playlistId, playlistGame) => {
    return savePlaylistGame(state, playlistId, playlistGame);
  });

  state.socketServer.register(BackIn.DELETE_PLAYLIST_GAME, async (event, playlistId, gameId) => {
    return deletePlaylistGame(state, playlistId, gameId);
  });

  state.socketServer.register(BackIn.RAISE_PLAYLIST_GAME, async (event, playlistId, sourceIdx, destIdx) => {
    const playlistIdx = state.playlists.findIndex(p => p.id === playlistId);
    if (playlistIdx > -1 && state.playlists[playlistIdx].filePath) {
      const playlist = state.playlists[playlistIdx];
      const maxIndex = playlist.games.length;
      if (maxIndex < Math.max(sourceIdx, destIdx)) {
        alert('Out of bounds?');
        return;
      }

      const movedGame = playlist.games[sourceIdx];

      // If moving a game higher, move elements down. If moving a game lower, move elements up.
      const reverse = sourceIdx < destIdx;
      const upperBound = Math.max(destIdx, sourceIdx);
      const lowerBound = Math.min(destIdx, sourceIdx);
      if (reverse) {
        // Moving games up the list
        for (let i = lowerBound; i < upperBound; i++) {
          playlist.games[i] = playlist.games[i + 1];
        }
        playlist.games[destIdx] = movedGame;
      } else {
        // Moving games down the list
        for (let i = upperBound; i > lowerBound; i--) {
          playlist.games[i] = playlist.games[i - 1];
        }
        playlist.games[destIdx] = movedGame;
      }

      state.playlists[playlistIdx] = playlist;
      await PlaylistFile.saveFile(playlist.filePath, playlist);
    }
  });

  state.socketServer.register(BackIn.EXPORT_PLAYLIST, async (event, playlistId, filePath) => {
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (playlist) {
      return PlaylistFile.saveFile(filePath, playlist);
    }
  });

  state.socketServer.register(BackIn.SAVE_LEGACY_PLATFORM, async (event, platform) => {
    const translatedGames = [];
    const tagCache: Record<string, Tag> = {};
    for (const game of platform.collection.games) {
      const addApps = platform.collection.additionalApplications.filter(a => a.gameId === game.id);
      const translatedGame = await createGameFromLegacy(game, tagCache);
      translatedGame.addApps = createAddAppFromLegacy(addApps, translatedGame);
      translatedGames.push(translatedGame);
    }
    await fpDatabase.saveGames(translatedGames);
  });

  state.socketServer.register(BackIn.EXPORT_TAGS, async (event, data) => {
    const jsonTagsFile: TagsFile = { categories: [], tags: [] };
    let res: number;
    try {
      // Collect tag categories
      const allTagCategories = await fpDatabase.findAllTagCategories();
      jsonTagsFile.categories = allTagCategories;
      // Collect tags
      jsonTagsFile.tags = await fpDatabase.findAllTags();
      await fs.promises.writeFile(data, JSON.stringify(jsonTagsFile, null, ' '), { encoding: 'utf8' });
      res = jsonTagsFile.tags.length;
    } catch (error) {
      res = -1;
    }
    state.socketServer.send(event.client, BackOut.EXPORT_TAGS, res);
    return res;
  });

  state.socketServer.register(BackIn.EXPORT_DATABASE, async (event, data) => {
    let jsonFile: any = {
      games: {
        games: [],
        addApps: [],
        gameData: []
      },
      tags: {
        categories: [],
        tags: [],
      },
      platforms: [],
    };

    // --- TAGS ---

    jsonFile.tags.categories = await fpDatabase.findAllTagCategories();
    jsonFile.tags.tags = await fpDatabase.findAllTags();

    // --- PLATFORMS ---

    jsonFile.platforms = await fpDatabase.findAllPlatforms();

    // --- GAMES ----

    // Collect games

    const search = fpDatabase.parseUserSearchInput('').search;
    search.limit = 5000;
    let games = await fpDatabase.searchGames(search);
    while (games.length > 0) {
      for (const game of games) {
        jsonFile.games.games.push({
          ...game,
          platforms: [],
          data: [],
          addApps: [],
          tags: []
        });
      }
      // Get next page
      const newOffset: GameSearchOffset = {
        value: games[games.length - 1].title,
        gameId: games[games.length - 1].id,
        title: games[games.length - 1].title,
      };
      search.offset = newOffset;
      games = await fpDatabase.searchGames(search);
    }

    // --- CONVERSION ---
    const snekify = (obj: Record<string, unknown>) => {
      return transform(obj, (result: Record<string, unknown>, value: unknown, key: string, target) => {
        const camelKey = Array.isArray(target) ? key : snakeCase(key);
        result[camelKey] = (value !== null && typeof value === 'object') ? snekify(value as Record<string, unknown>) : value;
      });
    };

    const res = 'Exported Database:' +
    `\nTag Categories: ${jsonFile.tags.categories.length.toString().padStart(5, ' ')} ` +
    `\nTags: ${jsonFile.tags.tags.length.toString().padStart(11, ' ')} ` +
    `\nPlatforms: ${jsonFile.platforms.length.toString().padStart(9, ' ')} ` +
    `\nGames: ${jsonFile.games.games.length.toString().padStart(14, ' ')} `;

    jsonFile = JSON.stringify(jsonFile, null, 0);
    jsonFile = JSON.parse(jsonFile);
    jsonFile = snekify(jsonFile);
    await fs.promises.writeFile(data, JSON.stringify(jsonFile,  null, ' '), { encoding: 'utf8' });

    return res;
  });

  state.socketServer.register(BackIn.IMPORT_TAGS, async (event, data) => {
    const json: TagsFile = JSON.parse(await fs.promises.readFile(data, 'utf8'));
    let res = 0;
    try {
      // Map JSON category ids to real categories
      const existingCats = await fpDatabase.findAllTagCategories();
      const categories: Record<number, TagCategory> = {};
      for (const rawCat of json.categories) {
        const foundCat = existingCats.find(c => c.name.toLowerCase() === rawCat.name.toLowerCase());
        if (foundCat) {
          categories[rawCat.id] = foundCat;
        } else {
          const partialCat: PartialTagCategory = {
            id: -1,
            name: rawCat.name,
            color: rawCat.color
          };
          const newCat = await fpDatabase.createTagCategory(partialCat);
          if (newCat) {
            categories[rawCat.id] = newCat;
          }
        }
      }
      // Create and fill tags
      for (const tag of json.tags) {
        const existingTag = await fpDatabase.findTag(tag.name);
        if (existingTag) {
          // TODO: Detect alias collisions
        } else {
          const newTag = await fpDatabase.createTag(tag.name, tag.category);
          newTag.aliases = tag.aliases;
          await fpDatabase.saveTag(newTag);
          res += 1;
        }
      }
    } catch (error) {
      res = -1;
    }
    state.socketServer.send(event.client, BackOut.IMPORT_TAGS, res);
    state.socketServer.broadcast(BackOut.TAG_CATEGORIES_CHANGE, await fpDatabase.findAllTagCategories());
    return res;
  });

  state.socketServer.register(BackIn.NUKE_TAGS, async (event, tagNames) => {
    // Get list of tags to nuke
    const tags: Tag[] = [];
    for (const tagName of tagNames) {
      const tag = await fpDatabase.findTag(tagName);
      if (tag) {
        tags.push(tag);
      }
    }

    // Find all matching games
    const games = new Set<Game>();
    for (const tag of tags) {
      const foundGames = await fpDatabase.searchGamesWithTag(tag.name);
      for (const game of foundGames) {
        games.add(game);
      }
    }
    const gameIds = Array.from(games).map(g => g.id);

    // Remove games from any playlists
    for (const playlist of state.playlists) {
      let modified = false;
      for (let i = playlist.games.length - 1; i >= 0; i--) {
        const pg = playlist.games[i];
        if (gameIds.includes(pg.gameId)) {
          playlist.games.splice(i, 1);
          modified = true;
        }
      }
      if (modified) {
        await PlaylistFile.saveFile(playlist.filePath, playlist);
      }
    }

    // Remove games from database
    const gameChunks = chunkArray(Array.from(games), 20);
    for (const chunk of gameChunks) {
      for (const game of chunk) {
        await fpDatabase.deleteGame(game.id);
      }
      state.queries = {}; // Reset search queries
    }

    // Remove tags from database
    for (const tag of tags) {
      if (tag.id) {
        await fpDatabase.deleteTag(tag.name);
      }
    }
  });

  state.socketServer.register(BackIn.CURATE_IMPORT, async (event, data) => {
    const { taskId, saveCuration, date, curations } = data;
    let error: any | undefined;
    let processed = 0;
    const taskProgress = new TaskProgress(curations.length);
    if (taskId) {
      taskProgress.on('progress', (text, done) => {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, {
          id: taskId,
          status: text,
          progress: done,
        });
      });
      taskProgress.on('done', (text) => {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, {
          id: taskId,
          status: text,
          progress: 1,
          finished: true
        });
      });
    }
    for (const curation of curations) {
      try {
        processed += 1;
        taskProgress.setStage(processed, `Importing ${curation.game.title || curation.folder}...`);

        state.socketServer.broadcast(BackOut.CURATE_SELECT_LOCK, curation.folder, true);
        await importCuration({
          curation: curation,
          htdocsFolderPath: state.preferences.htdocsFolderPath,
          date: (date !== undefined) ? new Date(date) : undefined,
          saveCuration: saveCuration,
          fpPath: state.config.flashpointPath,
          dataPacksFolderPath: path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath),
          imageFolderPath: state.preferences.imageFolderPath,
          openDialog: state.socketServer.showMessageBoxBack(state, event.client),
          openExternal: state.socketServer.openExternal(event.client),
          tagCategories: await fpDatabase.findAllTagCategories(),
          taskProgress,
          sevenZipPath: state.sevenZipPath,
          state,
        })
        .then(async () => {
          // Delete curation after
          await deleteCuration(state, curation.folder);
          state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, undefined, [curation.folder]);
        })
        .catch((err) => {
          log.debug('Import', 'Import error: ' + err);
          state.socketServer.broadcast(BackOut.CURATE_SELECT_LOCK, curation.folder, false);
          const alertString = formatString(state.languageContainer.dialog.errorImportingCuration, curation.folder) as string;
          state.socketServer.broadcast(BackOut.OPEN_ALERT, alertString);
        });
        state.queries = {};
      } catch (e) {
        if (util.types.isNativeError(e)) {
          error = copyError(e);
        } else {
          error = e;
        }
      }
    }

    if (data.taskId) {
      state.socketServer.broadcast(BackOut.UPDATE_TASK,
        {
          id: data.taskId,
          status: '',
          finished: true,
          error
        }
      );
    }

    return { error: error || undefined };
  });

  state.socketServer.register(BackIn.LAUNCH_CURATION, async (event, data) => {
    const { curation } = data;
    const skipLink = (curation.folder === state.lastLinkedCurationKey);
    state.lastLinkedCurationKey = data.symlinkCurationContent ? curation.folder : '';
    try {
      let serverOverride: string | undefined = undefined;
      if (state.serviceInfo) {
        // Make sure all 3 relevant server infos are present before considering MAD4FP opt
        const configServer = state.serviceInfo.server.find(s => s.name === state.preferences.curateServer);
        const mad4fpServer = state.serviceInfo.server.find(s => s.mad4fp);
        const activeServer = state.services.get('server');
        const activeServerInfo = state.serviceInfo.server.find(s => (activeServer && 'name' in activeServer.info && s.name === activeServer.info?.name));

        if (activeServerInfo) {
          if (data.mad4fp && mad4fpServer && !activeServerInfo.mad4fp) {
            // Swap to MAD4FP server
            serverOverride = mad4fpServer.name;
          } else if (configServer) {
            // Swap to default curate server (non-mad4fp)
            serverOverride = configServer.name;
          } else {
            serverOverride = activeServerInfo.name;
          }
        }
      }

      const platforms = data.curation.game.platforms ? data.curation.game.platforms : [];
      await launchCuration(data.curation, data.symlinkCurationContent, skipLink, {
        fpPath: path.resolve(state.config.flashpointPath),
        htdocsPath: state.preferences.htdocsFolderPath,
        dataPacksFolderPath: state.preferences.dataPacksFolderPath,
        sevenZipPath: state.sevenZipPath,
        native: state.preferences.nativePlatforms.some(p => platforms.map(p => p.name).includes(p)),
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        appPathOverrides: state.preferences.appPathOverrides,
        providers: await getProviders(state),
        proxy: state.preferences.browserModeProxy,
        openDialog: state.socketServer.showMessageBoxBack(state, event.client),
        openExternal: state.socketServer.openExternal(event.client),
        runGame: runGameFactory(state),
        runAddApp: runAddAppFactory(state),
        envPATH: state.pathVar,
        changeServer: changeServerFactory(state),
        activeConfig: null,
        state,
        autoClearWininetCache: state.preferences.autoClearWininetCache,
        override: data.override,
      },
      state.apiEmitters.games.onWillLaunchCurationGame.fireableFactory(state, event.client, 'Error during curate game launch api event'),
      state.apiEmitters.games.onDidLaunchCurationGame.fireableFactory(state, event.client, 'Error during curate post game launch api event'),
      serverOverride);
    } catch (e) {
      log.error('Launcher', e + '');
    }
  });

  state.socketServer.register(BackIn.LAUNCH_CURATION_ADDAPP, async (event, data) => {
    const skipLink = (data.folder === state.lastLinkedCurationKey);
    state.lastLinkedCurationKey = data.folder;
    try {
      const flatPlatforms = data.platforms?.map(p => p.name);
      await launchAddAppCuration(data.folder, data.addApp, data.platforms || [], data.symlinkCurationContent, skipLink, {
        fpPath: path.resolve(state.config.flashpointPath),
        htdocsPath: state.preferences.htdocsFolderPath,
        dataPacksFolderPath: state.preferences.dataPacksFolderPath,
        sevenZipPath: state.sevenZipPath,
        native: state.preferences.nativePlatforms.some(p => flatPlatforms?.includes(p)) || false,
        execMappings: state.execMappings,
        lang: state.languageContainer,
        isDev: state.isDev,
        exePath: state.exePath,
        appPathOverrides: state.preferences.appPathOverrides,
        providers: await getProviders(state),
        proxy: state.preferences.browserModeProxy,
        openDialog: state.socketServer.showMessageBoxBack(state, event.client),
        openExternal: state.socketServer.openExternal(event.client),
        runGame: runGameFactory(state),
        runAddApp: runAddAppFactory(state),
        changeServer: changeServerFactory(state),
        envPATH: state.pathVar,
        activeConfig: null,
        state,
        parentGame: newGame(),
        autoClearWininetCache: state.preferences.autoClearWininetCache,
        override: data.override,
      },
      state.apiEmitters.games.onWillLaunchCurationAddApp.fireableFactory(state, event.client, 'Error during curate add app launch api event'),
      state.apiEmitters.games.onDidLaunchCurationAddApp.fireableFactory(state, event.client, 'Error during curate post add app launch api event'));
    } catch (e) {
      log.error('Launcher', e + '');
    }
  });

  state.socketServer.register(BackIn.OPEN_LOGS_WINDOW, async () => {
    if (!state.services.has('logger_window')) {
      const env: NodeJS.ProcessEnv = { ...process.env, 'PATH': state.pathVar ?? process.env.PATH };
      if ('ELECTRON_RUN_AS_NODE' in env) {
        delete env['ELECTRON_RUN_AS_NODE']; // If this flag is present, it will disable electron features from the process
      }
      const loggerArgs = [path.join(__dirname, '../main/index.js'), 'logger=true'];
      const dirname = path.dirname(process.execPath);
      runService(
        state,
        'logger_window',
        'Logger Window',
        '',
        {
          detached: false,
          noshell: true,
          cwd: getCwd(state.isDev, state.exePath),
          env: env
        },
        {
          path: dirname,
          filename: process.execPath,
          arguments: escapeArgsForShell(loggerArgs),
          kill: true
        }
      );
    } else {
      const loggerService = state.services.get('logger_window');
      if (loggerService && loggerService.getState() !== ProcessState.RUNNING) {
        loggerService.restart();
      }
    }
  });

  state.socketServer.register(BackIn.UPLOAD_LOG, async (event) => {
    // Filter entries
    const username = os.userInfo().username;
    const entries = state.log.filter(e => e !== undefined).map(e => {
      e.content = e.content.replace(new RegExp('([/\\\\])' + username, 'g'), '$1***');
      return e;
    });

    // Upload to log server
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

  state.socketServer.register(BackIn.FETCH_DIAGNOSTICS, async () => {
    type Diagnostics = {
      services: Array<{
        id: string;
        name: string;
        state: ProcessState;
      }>;
      generics: string[];
    }
    // services
    const diagnostics: Diagnostics = {
      services: Array.from(state.services.values()).map(s => {
        return {
          id: s.id,
          name: s.name,
          state: s.getState()
        };
      }),
      generics: []
    };

    // generics

    if (!fs.existsSync(path.join(state.config.flashpointPath, 'Legacy', 'router.php'))) {
      diagnostics.generics.push('router.php is missing. Possible cause: Antivirus software has deleted it.');
    }
    if (state.log.findIndex(e => e.content.includes('Server exited with code 3221225781')) !== -1) {
      diagnostics.generics.push('Server exited with code 3221225781. Possible cause: .NET Framework or Visual C++ 2015 x86 Redists are not installed.');
    }

    // print

    let message = '';
    const maxLen = 'Operating System: '.length;
    message = message + 'Operating System: ' + os.version() + '\n';
    message = message + padEnd('Architecture:', maxLen) + os.arch() + '\n';
    try {
      const output = execSync('powershell.exe -Command "Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct | Format-Wide -Property displayName"').toString().trim();
      if (output.toLowerCase().includes('avast antivirus') || output.toLowerCase().includes('avg antivirus')) {
        diagnostics.generics.push('AVG or Avast Antivirus is installed. This may cause problems with Flashpoint.');
      }
      message = message + padEnd('Antivirus:', maxLen) + output + '\n';
    } catch (err) {
      message = message + 'Antivirus:\tUnknown\n';
    }
    message = message + '\n';
    for (const service of diagnostics.services) {
      message = message + `${ProcessState[service.state]}:\t${service.name}\n`;
    }
    if (diagnostics.generics.length > 0) {
      message = message + '\n';
      message = message + 'Warnings:\n';
    }
    for (const generic of diagnostics.generics) {
      message = message + `\t${generic}\n`;
    }
    message = message + '\n';
    for (const service of diagnostics.services) {
      const serviceLogs = state.log.filter(e => e.source === service.name);
      if (serviceLogs.length > 0) {
        message = message + `${service.name} recent logs:\n`;
        for (const log of serviceLogs.slice(0, serviceLogs.length > 10 ? 10 : undefined)) {
          message = message + `\t${log.content}\n`;
        }
      }
    }

    return '```' + message + '```';
  });

  state.socketServer.register(BackIn.OPEN_FLASHPOINT_MANAGER, async () => {
    openFlashpointManager(state);
  });

  state.socketServer.register(BackIn.QUIT, async () => {
    if (!state.ignoreQuit) {
      return exitApp(state);
    }
  });

  state.socketServer.register(BackIn.DOWNLOAD_PLAYLIST, async (event, url) => {
    // Attempt download
    console.log(url);
    const res = await axios.get(url);
    if (res.status == 200) {
      // Load as json
      const json = res.data;
      // Check if valid
      const playlist = overwritePlaylistData(deepCopy(DEFAULT_PLAYLIST_DATA), json);
      // Save to file
      const filePath = path.resolve(path.join(state.config.flashpointPath, state.preferences.playlistFolderPath, playlist.id + '.json'));
      await PlaylistFile.saveFile(filePath, playlist);
      const existingIdx = state.playlists.findIndex(p => p.filePath === playlist.filePath);
      if (existingIdx > -1) {
        state.playlists[existingIdx] = playlist;
      } else {
        state.playlists.push(playlist);
      }
      state.socketServer.send(event.client, BackOut.PLAYLISTS_CHANGE, state.playlists);
      return playlist;
    } else {
      throw new Error('Failed to download playlist');
    }
  });

  state.socketServer.register(BackIn.EXPORT_META_EDIT, async (event, id, properties) => {
    const game = await fpDatabase.findGame(id);
    if (game) {
      const meta: MetaEditMeta = {
        id: game.id,
      };

      const keys = Object.keys(properties) as (keyof typeof properties)[];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (properties[key]) {
          switch (key) {
            case 'tags': {
              meta.tags = game.tags;
              break;
            }
            case 'platforms': {
              meta.platforms = game.platforms;
              break;
            }
            default:
              (meta as any)[key] = (game as any)[key]; // (I wish typescript could understand this...)
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
          const dialogId = await state.socketServer.showMessageBoxBack(state, event.client)({
            message: `${strings.dialog.overwriteFileMessage}\n${strings.dialog.overwriteFileDetail}\n${filePath}`,
            buttons: [strings.misc.yes, strings.misc.no],
            cancelId: 1,
          });
          const result = (await awaitDialog(state, dialogId)).buttonIdx;

          if (result === 1) { save = false; }
        }

        if (save) {
          await fs_extra.ensureDir(folderPath);
          await fs.promises.writeFile(filePath, JSON.stringify(output, null, '\t'));
        }
      } catch (error: any) {
        log.error('Launcher', `Failed to export meta edit.\nError: ${error.message || error}`);
      }
    }
  });

  state.socketServer.register(BackIn.IMPORT_META_EDITS, async (event) => {
    const result = await importAllMetaEdits(
      path.join(state.config.flashpointPath, state.preferences.metaEditsFolderPath),
      state.socketServer.showMessageBoxBack(state, event.client),
      state,
    );

    return result;
  });

  state.socketServer.register(BackIn.CURATE_LOAD_ARCHIVES, async (event, filePaths, taskId) => {
    let processed = 0;
    const taskProgress = new TaskProgress(filePaths.length);
    if (taskId) {
      taskProgress.on('progress', (text, done) => {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, {
          id: taskId,
          status: text,
          progress: done,
        });
      });
      taskProgress.on('done', (text) => {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, {
          id: taskId,
          status: text,
          progress: 1,
          finished: true
        });
      });
    }
    for (const filePath of filePaths) {
      processed = processed + 1;
      taskProgress.setStage(processed, `Loading ${filePath}`);
      await loadCurationArchive(filePath, null, throttle((progress: Progress) => {
        taskProgress.setStageProgress((progress.percent / 100), `Extracting Files - ${progress.fileCount}`);
      }, 200))
      .catch((error) => {
        log.error('Curate', `Failed to load curation archive! ${error.toString()}`);
        state.socketServer.broadcast(BackOut.OPEN_ALERT, formatString(state.languageContainer['dialog'].failedToLoadCuration, error.toString())  as string);
      });
      taskProgress.setStageProgress(1, 'Extracted');
    }
    taskProgress.done('Loaded Curation Archives');
  });

  state.socketServer.register(BackIn.CURATE_GEN_WARNINGS, async (event, curation) => {
    return genCurationWarnings(curation, state.config.flashpointPath, state.suggestions, state.languageContainer.curate, state.apiEmitters.curations.onWillGenCurationWarnings);
  });

  state.socketServer.register(BackIn.CURATE_GET_LIST, async () => {
    return state.loadedCurations;
  });

  state.socketServer.register(BackIn.CURATE_DUPLICATE, async (event, folders) => {
    for (const folder of folders) {
      await duplicateCuration(folder, state);
    }
  });

  state.socketServer.register(BackIn.CURATE_SYNC_CURATIONS, async (event, curations) => {
    for (const curation of curations) {
      const idx = state.loadedCurations.findIndex(c => c.folder === curation.folder);
      if (idx > -1) {
        state.loadedCurations[idx] = {
          ...curation,
          contents: curation.contents ? curation.contents : state.loadedCurations[idx].contents
        };
        state.apiEmitters.curations.onDidCurationChange.fire(state.loadedCurations[idx]);
        // Save curation
        saveCuration(path.join(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, curation.folder), curation)
        .then(() => state.apiEmitters.curations.onDidCurationChange.fire(state.loadedCurations[idx]));
      }
    }
  });

  state.socketServer.register(BackIn.CURATE_EDIT_REMOVE_IMAGE, async (event, folder, type) => {
    const curationIdx = state.loadedCurations.findIndex(c => c.folder === folder);
    if (curationIdx > -1) {
      const curation = state.loadedCurations[curationIdx];
      switch (type) {
        case CurationImageEnum.THUMBNAIL: {
          const imagePath = curation.thumbnail.exists ? curation.thumbnail.filePath : undefined;
          if (imagePath) {
            await fs.promises.unlink(imagePath);
            curation.thumbnail.exists = false;
            state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
            // TODO: Send update
          }
          break;
        }
        case CurationImageEnum.SCREENSHOT: {
          const imagePath = curation.screenshot.exists ? curation.screenshot.filePath : undefined;
          if (imagePath) {
            await fs.promises.unlink(imagePath);
            curation.screenshot.exists = false;
            state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
            // TODO: Send update
          }
          break;
        }
      }
    }
  });

  state.socketServer.register(BackIn.CURATE_DELETE, async (event, folders, taskId) => {
    try {
      for (let idx = 0; idx < folders.length; idx++) {
        if (taskId) {
          state.socketServer.broadcast(BackOut.UPDATE_TASK, {
            id: taskId,
            status: `Deleting ${folders[idx]}...`,
            progress: idx / folders.length
          });
        }
        await deleteCuration(state, folders[idx]);
      }
      if (taskId) {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, {
          id: taskId,
          status: '',
          finished: true
        });
      }
    } catch (e: any) {
      log.error('Curate', `Failed to delete curation: ${e}`);
      if (taskId) {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, {
          id: taskId,
          error: e.toString(),
          finished: true
        });
      }
    }
  });

  state.socketServer.register(BackIn.CURATE_EXPORT_DATA_PACK, async (event, curations, taskId) => {
    // Obselete
  });

  state.socketServer.register(BackIn.CURATE_EXPORT, async (event, curations, taskId) => {
    let processed = 0;
    const taskProgress = new TaskProgress(curations.length);
    if (taskId) {
      taskProgress.on('progress', (text, done) => {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, {
          id: taskId,
          status: text,
          progress: done,
        });
      });
      taskProgress.on('done', (text) => {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, {
          id: taskId,
          status: text,
          progress: 1,
          finished: true
        });
      });
    }
    for (const curation of curations) {
      processed += 1;
      taskProgress.setStage(processed, `Exporting ${curation.game.title || curation.folder}`);
      // Find most appropriate filepath based on what already exists
      const name = (curation.game.title ? sanitizeFilename(curation.game.title) : curation.folder);
      const filePathCheck = path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_EXPORTED, `${name}.7z`);
      const filePath = await fs.promises.access(filePathCheck, fs.constants.F_OK)
      .then(() => {
        // Exists, use date instead
        return path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_EXPORTED, `${name}_${dateToFilenameString(new Date())}.7z`);
      })
      .catch(() => { return filePathCheck; /** Doesn't exist, carry on */ });
      await fs.ensureDir(path.dirname(filePath));
      const curPath = path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, curation.folder);
      await saveCuration(curPath, curation);
      await new Promise<void>((resolve) => {
        // Cast required until types fixed
        return (add as any)(filePath, curPath, { recursive: true, exclude: [`!${FPFSS_INFO_FILENAME}`], $bin: pathTo7zBack(state.isDev, state.exePath) })
        .on('end', () => { resolve(); })
        .on('error', (error: any) => {
          log.error('Curate', error.message);
          resolve();
        });
      })
      .finally(() => {
        state.socketServer.broadcast(BackOut.CURATE_SELECT_LOCK, curation.folder, false);
      });
      taskProgress.setStageProgress(1, 'Packed');
    }
    taskProgress.done('Exported Curations');
  });

  state.socketServer.register(BackIn.CURATE_REFRESH_CONTENT, async (event, folder) => {
    return refreshCurationContent(state, folder);
  });

  state.socketServer.register(BackIn.CURATE_SCAN_NEW_CURATIONS, async () => {
    const curationsPath = path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_WORKING);
    await fs.ensureDir(curationsPath);
    const curations = await fs.promises.readdir(curationsPath, { withFileTypes: true });
    for (const curation of curations) {
      console.log(curation.name);
      if (curation.isDirectory()) {
        const exists = state.loadedCurations.find(c => c.folder === curation.name);
        if (!exists) {
          await loadCurationFolder(curationsPath, curation.name, state);
          const curationIdx = state.loadedCurations.findIndex(c => c.folder === curation.name);
          state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [state.loadedCurations[curationIdx]]);
        }
      }
    }
  });

  state.socketServer.register(BackIn.CURATE_FROM_GAME, async (event, gameId) => {
    return makeCurationFromGame(state, gameId);
  });

  state.socketServer.register(BackIn.CURATE_CREATE_CURATION, async (event, folder, meta) => {
    const existingCuration = state.loadedCurations.find(c => c.folder === folder);
    if (!existingCuration) {
      const curPath = path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, folder);
      await fs.promises.mkdir(curPath, { recursive: true });
      const contentFolder = path.join(curPath, 'content');
      await fs.promises.mkdir(contentFolder, { recursive: true });

      const defaultPlats = await fpDatabase.findPlatform('Flash');

      const data: LoadedCuration = {
        folder,
        uuid: uuid(),
        group: '',
        game: meta || {
          language: 'en',
          primaryPlatform: defaultPlats ? defaultPlats.name : undefined,
          platforms: defaultPlats ? [defaultPlats] : [],
          playMode: 'Single Player',
          status:   'Playable',
          library:  'Arcade'.toLowerCase() // must be lower case
        },
        addApps: [],
        fpfssInfo: null,
        thumbnail: await loadCurationIndexImage(path.join(curPath, 'logo.png')),
        screenshot: await loadCurationIndexImage(path.join(curPath, 'ss.png'))
      };
      if (data.game.primaryPlatform && data.game.primaryPlatform in state.platformAppPaths) {
        data.game.applicationPath = state.platformAppPaths[data.game.primaryPlatform][0].appPath;
      }
      const curation: CurationState = {
        ...data,
        alreadyImported: false,
        warnings: await genCurationWarnings(data, state.config.flashpointPath, state.suggestions, state.languageContainer.curate, state.apiEmitters.curations.onWillGenCurationWarnings),
        contents: await genContentTree(getContentFolderByKey(folder, state.config.flashpointPath))
      };
      await saveCuration(curPath, curation);
      state.loadedCurations.push(curation);
      state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
    }
  });

  state.socketServer.register(BackIn.FPFSS_OPEN_CURATION, async (event, fpfssInfo, url, accessToken, taskId) => {
    // Setup task info
    const taskProgress = new TaskProgress(2);
    if (taskId) {
      taskProgress.on('progress', (text, done) => {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, {
          id: taskId,
          status: text,
          progress: done,
        });
      });
      taskProgress.on('done', (text) => {
        state.socketServer.broadcast(BackOut.UPDATE_TASK, {
          id: taskId,
          status: text,
          progress: 1,
          finished: true
        });
      });
    }

    // Download to temp file
    let tempFile = '';
    try {
      taskProgress.setStage(1, `Downloading ${url}`);
      tempFile = await getTempFilename('.7z');
      await downloadFile(axios, url, tempFile, undefined, undefined, undefined, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      taskProgress.setStageProgress(1, 'Downloaded');
    } catch (err) {
      throw 'Error downloading curation file';
    }


    taskProgress.setStage(2, `Loading ${tempFile}`);
    await loadCurationArchive(tempFile, fpfssInfo, throttle((progress: Progress) => {
      taskProgress.setStageProgress((progress.percent / 100), `Extracting Files - ${progress.fileCount}`);
    }, 200))
    .catch((error) => {
      log.error('Curate', `Failed to load curation archive! ${error.toString()}`);
      state.socketServer.broadcast(BackOut.OPEN_ALERT, formatString(state.languageContainer['dialog'].failedToLoadCuration, error.toString())  as string);
    });
    taskProgress.setStageProgress(2, 'Extracted');
    taskProgress.done('Imported FPFSS Curation');
  });

  state.socketServer.register(BackIn.CLEAR_PLAYTIME_TRACKING, async (event) => {
    const openDialog = state.socketServer.showMessageBoxBack(state, event.client);
    const dialogId = await openDialog({
      message: 'Clearing Playtime Data...',
      largeMessage: true,
      buttons: []
    });
    await fpDatabase.clearPlaytimeTracking();
    state.socketServer.broadcast(BackOut.CANCEL_DIALOG, dialogId);
  });

  state.socketServer.register(BackIn.CLEAR_PLAYTIME_TRACKING_BY_ID, async (event, gameId) => {
    if (gameId !== '') {
      await fpDatabase.clearPlaytimeTrackingById(gameId);
    }
  });


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

  state.socketServer.register(BackIn.NEW_DIALOG_RESPONSE, (event, dialogId, code) => {
    state.newDialogEvents.emit(code, dialogId);
  });

  state.socketServer.register(BackIn.DIALOG_RESPONSE, (event, dialog, buttonIdx) => {
    state.resolveDialogEvents.emit(dialog.id, dialog, buttonIdx);
  });

  state.socketServer.register(BackIn.DELETE_ALL_IMAGES, async (event) => {
    // Display dialog to prevent user input
    const openDialog = state.socketServer.showMessageBoxBack(state, event.client);
    const dialogId = await openDialog({
      message: 'Deleting Images, Please Wait...',
      buttons: []
    });
    const imagesFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
    // Delete images
    try {
      await fs.remove(imagesFolder);
    } finally {
      setTimeout(() => {
        // Close dialog, finished task
        state.socketServer.broadcast(BackOut.CANCEL_DIALOG, dialogId);
      }, 1000);
      await fs.ensureDir(imagesFolder);
    }
  });

  state.socketServer.register(BackIn.IMPORT_METADATA, async (event, data) => {
    console.log('importing platforms');
    // Import platforms
    await importPlatforms(data.platforms);
    console.log('importing tag cats');
    // Import tag cats
    await importTagCategories(data.categories);
    console.log('importing tags');
    // Import tags
    await importTags(data.tags);
    console.log('importing games');
    // Import games
    await importGames(data.games);
    // Check for extras
    if (data.gameDataSources) {
      // Add any extra sources
      for (const source of data.gameDataSources) {
        const existingSourceIdx = state.preferences.gameDataSources.findIndex(s => s.name === source.name);
        if (existingSourceIdx > -1) {
          state.preferences.gameDataSources[existingSourceIdx] = source;
        } else {
          state.preferences.gameDataSources.push(source);
        }
      }
    }
    if (data.tagFilters) {
      // Add any extra filters
      for (const tfg of data.tagFilters) {
        const existingTfgIdx = state.preferences.tagFilters.findIndex(tfg => tfg.name === tfg.name);
        if (existingTfgIdx > -1) {
          state.preferences.tagFilters[existingTfgIdx] = tfg;
        } else {
          state.preferences.tagFilters.push(tfg);
        }
      }
    }
    // Save prefs
    state.prefsQueue.push(() => {
      PreferencesFile.saveFile(path.join(state.config.flashpointPath, PREFERENCES_FILENAME), state.preferences, state)
      .catch((err) => {
        console.error(`Save prefs err: ${err}`);
      });
    });
  });

  state.socketServer.register(BackIn.SYNC_METADATA_SERVER, async (event, serverInfo) => {
    // OUTDATED CODE
    switch (serverInfo.type) {
      case 'raw': {
        // Download file
        const data: MetadataRaw = unsafeParseJsonBuffer(await downloadJsonDataToBuffer(serverInfo.host));
        // Import platforms
        await importPlatforms(data.platforms);
        // Import tags
        await importTags(data.tags);
        // Import games
        await importGames(data.games);
        break;
      }
      case 'python': {
        break;
      }
      default:
        throw 'Unsupported type';
    }
  });

  state.socketServer.register(BackIn.CLEAR_WININET_CACHE, async (event) => {
    clearWininetCache();
  });

  state.socketServer.register(BackIn.OPTIMIZE_DATABASE, async (event) => {
    const dialogId = await createNewDialog(state, {
      largeMessage: true,
      message: 'Optimizing Database...',
      buttons: []
    });
    // Make the user feel like we're doing something special
    await promiseSleep(1000);
    // Actually do the work now
    await fpDatabase.optimizeDatabase();
    state.socketServer.broadcast(BackOut.CANCEL_DIALOG, dialogId);
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
 *
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
        // Works, but type checker complains
        dif[key] = bVal as any;
      }
    }
  }

  return dif;
}

function runGameService(state: BackState, launchInfo: LaunchInfo, id: string, name: string): ManagedChildProcess {
  const dirname = path.dirname(launchInfo.gamePath);
  // Keep file path relative to cwd
  const proc = runService(
    state,
    id,
    name,
    '',
    {
      detached: false,
      cwd: launchInfo.cwd,
      noshell: !!launchInfo.noshell,
      env: launchInfo.env
    },
    {
      path: dirname,
      filename: createCommand(launchInfo.gamePath, launchInfo.useWine, !!launchInfo.noshell),
      // Don't escape args if we're not using a shell.
      arguments: launchInfo.noshell
        ? typeof launchInfo.gameArgs == 'string'
          ? [launchInfo.gameArgs]
          : launchInfo.gameArgs
        : escapeArgsForShell(launchInfo.gameArgs),
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
}

function runAddAppFactory(state: BackState) {
  return (launchInfo: LaunchInfo): ManagedChildProcess => {
    const id = uuid();
    return runGameService(state, launchInfo, `add-app.${id}`, `Add App ${id}`);
  };
}

/**
 * Creates a function that will run any game launch info given to it and register it as a service
 *
 * @param state Current back state
 */
function runGameFactory(state: BackState) {
  return (gameLaunchInfo: GameLaunchInfo): ManagedChildProcess => {
    // Run game as a service and register it
    const id = `game.${gameLaunchInfo.game.id}`;
    const proc = runGameService(state, gameLaunchInfo.launchInfo, id, gameLaunchInfo.game.title);

    proc.on('change', () => {
      if (proc.getState() === ProcessState.STOPPED) {
        // Update game playtime counter when process exits
        if (state.preferences.enablePlaytimeTracking) {
          const secondsPlayed = (Date.now() - proc.getStartTime()) / 1000;
          if (!state.preferences.enablePlaytimeTrackingExtreme) {
            const extremeTags = state.preferences.tagFilters.filter(t => t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
            const isExtreme = gameLaunchInfo.game.tags.findIndex(t => extremeTags.includes(t.trim())) !== -1;
            if (!isExtreme) {
              fpDatabase.addGamePlaytime(gameLaunchInfo.game.id, secondsPlayed)
              .catch(() => {
                /** Game probably doesn't exist */
              });
            }
          } else {
            fpDatabase.addGamePlaytime(gameLaunchInfo.game.id, secondsPlayed)
            .catch(() => {
              /** Game probably doesn't exist */
            });
          }
        }
      }
    });

    return proc;
  };
}

function createCommand(filename: string, useWine: boolean, noshell: boolean): string {
  // This whole escaping thing is horribly broken. We probably want to switch
  // to an array representing the argv instead and not have a shell
  // in between.
  switch (process.platform) {
    case 'win32':
      return noshell ? filename : `"${filename}"`; // Quotes cause issues without a shell.
    case 'darwin':
    case 'linux':
      if (useWine) {
        return `wine start /wait /unix "${filename}"`;
      }
      return noshell ? filename : `"${filename}"`;
    default:
      throw Error('Unsupported platform');
  }
}

/**
 * Run a command registered by an Extension
 *
 * @param state Back state
 * @param command Command to run
 * @param args Arguments for the command
 */
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
 *
 * @param state Current back state
 */
async function getProviders(state: BackState): Promise<AppProvider[]> {
  return state.extensionsService.getContributions('applications')
  .then(contributions => {
    return contributions.map(c => {
      const apps = c.value;
      return apps.map(app => {
        return {
          ...app,
          callback: async (game: Game, launchCommand: string) => {
            if (app.command) {
              return runCommand(state, app.command, [game]);
            } else if (app.path) {
              const parsedArgs = await Promise.all(app.arguments.map(a => parseAppVar(c.extId, a, launchCommand, state)));
              const parsedPath = await parseAppVar(c.extId, app.path, launchCommand, state);
              return [parsedPath, ...parsedArgs];
            } else if (app.url) {
              const formattedUrl = await parseAppVar(c.extId, app.url, launchCommand, state);
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
    .reduce((prev, cur) => cur.concat(prev), []);
  }
  );
}

function changeServerFactory(state: BackState): (server?: string) => Promise<void> {
  return async (server?: string) => {
    if (state.serviceInfo) {
      if (!server) {
        // No server name given, assume the default server
        server = state.preferences.server;
      }
      // Cast to fix type error after if check above
      const serverInfo = state.serviceInfo.server.find(s => s.name === server || s.aliases.includes(server as string));
      if (serverInfo) {
        // Found server info, safely stop the server if it's not the correct one, then run the correct one
        const runningServer = state.services.get('server');
        if (!runningServer || !('name' in runningServer.info) || runningServer.info.name !== serverInfo.name) {
          if (runningServer) {
            // Wrong server running, stop it
            await removeService(state, 'server');
          }
          // Start the correct server
          log.debug('Launcher', `Changing server to: ${serverInfo.name}`);
          state.services.delete('server');
          runService(state, 'server', 'Server', state.config.flashpointPath, { env: {
            ...process.env,
            'PATH': state.pathVar ?? process.env.PATH,
          } }, serverInfo);
          await promiseSleep(1500);
        }
      } else {
        throw new Error(`Server '${server}' not found`);
      }
    }
  };
}

/**
 * Exits the Flashpoint Launcher safely
 *
 * @param state Back State
 * @param beforeProcessExit Function to call right before process exit
 */
export async function exitApp(state: BackState, beforeProcessExit?: () => void | Promise<void>) {
  return exit(state, beforeProcessExit);
}

async function downloadGameDataRes(state: BackState, gameData: GameData) {
  const onDetails = (details: DownloadDetails) => {
    state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_DETAILS, details);
  };
  const onProgress = (percent: number) => {
    // Sent to PLACEHOLDER download dialog on client
    state.socketServer.broadcast(BackOut.SET_PLACEHOLDER_DOWNLOAD_PERCENT, percent);
  };
  state.socketServer.broadcast(BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG);
  try {
    await downloadGameData(gameData.id, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath), state.preferences.gameDataSources, state.downloadController.signal(), onProgress, onDetails);
  } finally {
    // Close PLACEHOLDER download dialog on client, cosmetic delay to look nice
    setTimeout(() => {
      state.socketServer.broadcast(BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG);
    }, 250);
  }
}

const unsafeParseJsonBuffer = <T>(buffer: Buffer): T => {
  const data = buffer.toString();
  return JSON.parse(data) as T;
};

// Download the JSON file from a URL and save it to a buffer
const downloadJsonDataToBuffer = async (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const data: Buffer[] = [];
      response.on('data', (chunk) => {
        data.push(chunk);
      });
      response.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve(buffer);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};
