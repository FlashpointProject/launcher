import * as child_process from 'child_process';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { promisify } from 'util';
import * as WebSocket from 'ws';
import { AddLogData, BackIn, BackInit, BackInitArgs, BackOut, BrowseChangeData, BrowseViewAllData, BrowseViewPageData, BrowseViewPageResponseData, DeleteGameData, DeletePlaylistData, GetAllGamesResponseData, GetGameData, GetGameResponseData, GetMainInitDataResponse, GetRendererInitDataResponse, LanguageChangeData, LanguageListChangeData, LaunchAddAppData, LaunchGameData, PlaylistRemoveData, PlaylistUpdateData, SaveGameData, SavePlaylistData, ServiceActionData, ThemeListChangeData, ViewGame, WrappedRequest, WrappedResponse, GetPlaylistResponse } from '../shared/back/types';
import { ConfigFile } from '../shared/config/ConfigFile';
import { overwriteConfigData } from '../shared/config/util';
import { FilterGameOpts, filterGames, orderGames, orderGamesInPlaylist } from '../shared/game/GameFilter';
import { IAdditionalApplicationInfo, IGameInfo } from '../shared/game/interfaces';
import { DeepPartial, GamePlaylist, IBackProcessInfo, IService, ProcessAction, RecursivePartial } from '../shared/interfaces';
import { autoCode, getDefaultLocalization, LangContainer, LangFile, LangFileContent } from '../shared/lang';
import { ILogEntry, ILogPreEntry } from '../shared/Log/interface';
import { GameOrderBy, GameOrderReverse } from '../shared/order/interfaces';
import { PreferencesFile } from '../shared/preferences/PreferencesFile';
import { defaultPreferencesData, overwritePreferenceData } from '../shared/preferences/util';
import { parseThemeMetaData, themeEntryFilename, ThemeMeta } from '../shared/ThemeFile';
import { createErrorProxy, deepCopy, isErrorProxy, recursiveReplace, removeFileExtension, stringifyArray } from '../shared/Util';
import { GameManager } from './game/GameManager';
import { GameLauncher } from './GameLauncher';
import { ManagedChildProcess } from './ManagedChildProcess';
import { PlaylistFile } from './PlaylistFile';
import { ServicesFile } from './ServicesFile';
import { BackQuery, BackState } from './types';
import { EventQueue } from './util/EventQueue';
import { FolderWatcher } from './util/FolderWatcher';
import { getContentType } from './util/misc';
import { sanitizeFilename } from './util/sanitizeFilename';

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

// Make sure the process.send function is available
type Required<T> = T extends undefined ? never : T;
const send: Required<typeof process.send> = process.send
  ? process.send.bind(process)
  : (() => { throw new Error('process.send is undefined.'); });

const state: BackState = {
  isInit: false,
  isExit: false,
  server: createErrorProxy('server'),
  fileServer: new http.Server(onFileServerRequest),
  imageServerPort: -1,
  secret: createErrorProxy('secret'),
  preferences: createErrorProxy('preferences'),
  config: createErrorProxy('config'),
  configFolder: createErrorProxy('configFolder'),
  countryCode: createErrorProxy('countryCode'),
  gameManager: new GameManager(),
  messageQueue: [],
  isHandling: false,
  init: {
    0: false,
    1: false,
  },
  initEmitter: new EventEmitter() as any,
  queries: {},
  log: [],
  serviceInfo: undefined,
  services: {},
  languageWatcher: new FolderWatcher(),
  languageQueue: new EventQueue(),
  languages: [],
  themeWatcher: new FolderWatcher(),
  themeQueue: new EventQueue(),
  themeFiles: [],
  playlistWatcher: new FolderWatcher(),
  playlistQueue: new EventQueue(),
  playlists: [],
};

const preferencesFilename = 'preferences.json';
const configFilename = 'config.json';

const servicesSource = 'Background Services';

process.on('message', onProcessMessage);
process.on('disconnect', () => { exit(); }); // (Exit when the main process does)

async function onProcessMessage(message: any, sendHandle: any): Promise<void> {
  if (!state.isInit) {
    state.isInit = true;
    const content: BackInitArgs = JSON.parse(message);
    state.secret = content.secret;
    state.configFolder = content.configFolder;
    state.countryCode = content.countryCode;

    // Read configs & preferences
    const [pref, conf] = await (Promise.all([
      PreferencesFile.readOrCreateFile(path.join(state.configFolder, preferencesFilename)),
      ConfigFile.readOrCreateFile(path.join(state.configFolder, configFilename))
    ]));
    state.preferences = pref;
    state.config = conf;

    // Init services
    try {
      state.serviceInfo = await ServicesFile.readFile(
        path.join(state.config.flashpointPath, state.config.jsonFolderPath),
        error => { log({ source: servicesSource, content: error.toString() }); }
      );
    } catch (error) { /* @TODO Do something about this error */ }
    if (state.serviceInfo) {
      // Run start commands
      for (let i = 0; i < state.serviceInfo.start.length; i++) {
        await execProcess(state.serviceInfo.start[i]);
      }
      // Run processes
      if (state.serviceInfo.server) {
        state.services.server = runService('server', 'Server', state.serviceInfo.server, false);
      }
      if (state.config.startRedirector && process.platform !== 'linux') {
        const redirectorInfo = state.config.useFiddler ? state.serviceInfo.fiddler : state.serviceInfo.redirector;
        if (!redirectorInfo) { throw new Error(`Redirector process information not found. (Type: ${state.config.useFiddler ? 'Fiddler' : 'Redirector'})`); }
        state.services.redirector = runService('redirector', 'Redirector', redirectorInfo, false);
      }
    }

    // Init language
    state.languageWatcher.on('ready', () => {
      // Add event listeners
      state.languageWatcher.on('add', onLangAddOrChange);
      state.languageWatcher.on('change', onLangAddOrChange);
      state.languageWatcher.on('remove', (filename: string, offsetPath: string) => {
        state.languageQueue.push(() => {
          const filePath = path.join(state.languageWatcher.getFolder() || '', offsetPath, filename);
          const index = state.languages.findIndex(l => l.filename === filePath);
          if (index >= 0) { state.languages.splice(index, 1); }
        });
      });
      // Add initial files
      for (let filename of state.languageWatcher.filenames) {
        onLangAddOrChange(filename, '');
      }
      // Functions
      function onLangAddOrChange(filename: string, offsetPath: string) {
        state.languageQueue.push(async () => {
          const filePath = path.join(state.languageWatcher.getFolder() || '', offsetPath, filename);
          const langFile = await readLangFile(filePath);
          let lang = state.languages.find(l => l.filename === filePath);
          if (lang) {
            lang.data = langFile;
          } else {
            lang = {
              filename: filePath,
              code: removeFileExtension(filename),
              data: langFile,
            };
            state.languages.push(lang);
          }

          broadcast<LanguageListChangeData>({
            id: '',
            type: BackOut.LANGUAGE_LIST_CHANGE,
            data: state.languages,
          });

          if (lang.code === state.preferences.currentLanguage ||
              lang.code === state.countryCode ||
              lang.code === state.preferences.fallbackLanguage) {
            broadcast<LanguageChangeData>({
              id: '',
              type: BackOut.LANGUAGE_CHANGE,
              data: createContainer(
                state.preferences.currentLanguage,
                state.countryCode,
                state.preferences.fallbackLanguage)
            });
          }
        });
      }
    });
    const langFolder = path.join(content.isDev ? process.cwd() : content.configFolder, 'lang');
    fs.stat(langFolder, (error) => {
      if (!error) { state.languageWatcher.watch(langFolder); }
      else {
        log({ source: 'Back', content: (typeof error.toString === 'function') ? error.toString() : (error + '') });
        if (error.code === 'ENOENT') {
          log({ source: 'Back', content: `Failed to watch language folder. Folder does not exist (Path: "${langFolder}")` });
        } else {
          log({ source: 'Back', content: (typeof error.toString === 'function') ? error.toString() : (error + '') });
        }
      }
    });

    // Init themes
    state.themeWatcher.on('ready', () => {
      // Add event listeners
      state.themeWatcher.on('add', onThemeAdd);
      state.themeWatcher.on('change', (filename: string, offsetPath: string) => {
        state.themeQueue.push(() => {
          const item = findOwner(filename, offsetPath);
          if (item) {
            // A FILE HAS BEEN CHANGED IN A THEME
          } else {
            console.warn('A file has been changed in a theme that is not registered '+
                         `(Filename: "${filename}", OffsetPath: "${offsetPath}")`);
          }
        });
      });
      state.themeWatcher.on('remove', (filename: string, offsetPath: string) => {
        state.themeQueue.push(() => {
          const item = findOwner(filename, offsetPath);
          if (item) {
            if (item.entryPath === path.join(offsetPath, filename)) { // (Entry file was removed)
              state.themeFiles.splice(state.themeFiles.indexOf(item), 1);
              // A THEME HAS BEEN REMOVED
            } else { // (Non-entry file was removed)
              // A FILE HAS BEEN REMOVED IN A THEME
            }
          } else {
            console.warn('A file has been removed from a theme that is not registered '+
                         `(Filename: "${filename}", OffsetPath: "${offsetPath}")`);
          }
        });
      });
      // Add initial files
      for (let filename of state.themeWatcher.filenames) {
        onThemeAdd(filename, '', false);
      }
      // Functions
      function onThemeAdd(filename: string, offsetPath: string, doBroadcast: boolean = true) {
        state.themeQueue.push(async () => {
          const item = findOwner(filename, offsetPath);
          if (item) {
            // THIS THEME HAS BEEN UPDATED (a file has been added to it)
          } else {
            // Check if it is a potential entry file
            // (Entry files are either directly inside the "Theme Folder", or one folder below that and named "theme.css")
            const folders = offsetPath.split(path.sep);
            const folderName = folders[0] || offsetPath;
            const file = state.themeWatcher.getFile(folderName ? [...folders, filename] : [filename]);
            if ((file && file.isFile()) && (offsetPath === '' || (offsetPath === folderName && filename === themeEntryFilename))) {
              const themeFolder = state.themeWatcher.getFolder() || '';
              const entryPath = path.join(themeFolder, folderName, filename);
              let meta: Partial<ThemeMeta> | undefined;
              try {
                const data = await readFile(entryPath, 'utf8');
                meta = parseThemeMetaData(data) || {};
              } catch (error) { console.warn(`Failed to load theme entry file (File: "${entryPath}")`, error); }
              if (meta) {
                state.themeFiles.push({
                  basename: folderName || filename,
                  meta: meta,
                  entryPath: path.relative(themeFolder, entryPath),
                });
                if (doBroadcast) {
                  broadcast<ThemeListChangeData>({
                    id: '',
                    type: BackOut.THEME_LIST_CHANGE,
                    data: state.themeFiles,
                  });
                }
              }
            }
          }
        });
      }
      function findOwner(filename: string, offsetPath: string) {
        const index = offsetPath.indexOf(path.sep);
        if (index >= 0) { // (Sub-folder)
          const folderName = offsetPath.substr(0, index);
          return state.themeFiles.find(item => item.basename === folderName);
        } else { // (Theme folder)
          return state.themeFiles.find(item => item.entryPath === filename);
        }
      }
    });
    const themeFolder = path.join(state.config.flashpointPath, state.config.themeFolderPath);
    fs.stat(themeFolder, (error) => {
      if (!error) { state.themeWatcher.watch(themeFolder, { recursionDepth: -1 }); }
      else {
        log({ source: 'Back', content: (typeof error.toString === 'function') ? error.toString() : (error + '') });
        if (error.code === 'ENOENT') {
          log({ source: 'Back', content: `Failed to watch theme folder. Folder does not exist (Path: "${themeFolder}")` });
        } else {
          log({ source: 'Back', content: (typeof error.toString === 'function') ? error.toString() : (error + '') });
        }
      }
    });

    // Init playlists
    state.playlistWatcher.on('ready', () => {
      // Add event listeners
      state.playlistWatcher.on('add', onPlaylistAddOrChange);
      state.playlistWatcher.on('change', onPlaylistAddOrChange);
      state.playlistWatcher.on('remove', (filename: string, offsetPath: string) => {
        state.playlistQueue.push(async () => {
          const index = state.playlists.findIndex(p => p.filename === filename);
          if (index >= 0) {
            const id = state.playlists[index].filename;
            state.playlists.splice(index, 1);
            // Clear all query caches that uses this playlist
            const hashes = Object.keys(state.queries);
            for (let hash of hashes) {
              const cache = state.queries[hash];
              if (cache.query.playlistId === id) {
                delete state.queries[hash]; // Clear query from cache
              }
            }
            broadcast<PlaylistRemoveData>({
              id: '',
              type: BackOut.PLAYLIST_REMOVE,
              data: id,
            });
          } else {
            log({ source: 'Playlist', content: `Failed to remove playlist. Playlist is not registered (Filename: ${filename})` });
          }
        });
      });
      // Add initial files
      for (let filename of state.playlistWatcher.filenames) {
        onPlaylistAddOrChange(filename, '', false);
      }
      // Track when all playlist are done loading
      state.playlistQueue.push(async () => {
        state.init[BackInit.PLAYLISTS] = true;
        state.initEmitter.emit(BackInit.PLAYLISTS);
      });
      // Functions
      function onPlaylistAddOrChange(filename: string, offsetPath: string, doBroadcast: boolean = true) {
        state.playlistQueue.push(async () => {
          // Load and parse playlist
          const filePath = path.join(state.playlistWatcher.getFolder() || '', filename);
          let playlist: GamePlaylist | undefined;
          try {
            const data = await PlaylistFile.readFile(filePath, error => log({ source: 'Playlist', content: `Error while parsing playlist "${filePath}". ${error}` }));
            playlist = {
              ...data,
              filename,
            };
          } catch (error) {
            log({ source: 'Playlist', content: `Failed to load playlist "${filePath}". ${error}` });
          }
          // Add or update playlist
          if (playlist) {
            const index = state.playlists.findIndex(p => p.filename === filename);
            if (index >= 0) {
              state.playlists[index] = playlist;
              // Clear all query caches that uses this playlist
              const hashes = Object.keys(state.queries);
              for (let hash of hashes) {
                const cache = state.queries[hash];
                if (cache.query.playlistId === playlist.filename) {
                  delete state.queries[hash]; // Clear query from cache
                }
              }
            } else {
              state.playlists.push(playlist);
            }
            if (doBroadcast) {
              broadcast<PlaylistUpdateData>({
                id: '',
                type: BackOut.PLAYLIST_UPDATE,
                data: playlist,
              });
            }
          }
        });
      }
    });
    const playlistFolder = path.join(state.config.flashpointPath, state.config.playlistFolderPath);
    fs.stat(playlistFolder, (error) => {
      if (!error) { state.playlistWatcher.watch(playlistFolder); }
      else {
        log({ source: 'Back', content: (typeof error.toString === 'function') ? error.toString() : (error + '') });
        if (error.code === 'ENOENT') {
          log({ source: 'Back', content: `Failed to watch playlist folder. Folder does not exist (Path: "${playlistFolder}")` });
        } else {
          log({ source: 'Back', content: (typeof error.toString === 'function') ? error.toString() : (error + '') });
        }

        state.init[BackInit.PLAYLISTS] = true;
        state.initEmitter.emit(BackInit.PLAYLISTS);
      }
    });

    // Init Game manager
    state.gameManager.loadPlatforms(path.join(state.config.flashpointPath, state.config.platformFolderPath))
    .catch(error => { console.error(error); })
    .finally(() => {
      state.init[BackInit.GAMES] = true;
      state.initEmitter.emit(BackInit.GAMES);
    });

    // Find the first available port in the range
    let serverPort: number = -1;
    for (let port = state.config.backPortMin; port <= state.config.backPortMax; port++) {
      try {
        state.server = new WebSocket.Server({
          host: 'localhost',
          port,
        });
        serverPort = port;
        break;
      } catch (error) { /* Do nothing. */ }
    }
    if (state.server) { state.server.on('connection', onConnect); }

    // Find the first available port in the range
    state.imageServerPort = await new Promise((resolve) => {
      let port = state.config.imagesPortMin - 1;
      state.fileServer.once('listening', onListening);
      state.fileServer.on('error', onError);
      tryListen();

      function tryListen() {
        if (port <= state.config.imagesPortMax) {
          port += 1;
          state.fileServer.listen(port, 'localhost');
        } else {
          state.fileServer.off('listening', onListening);
          state.fileServer.off('error', onError);
          resolve(-1);
        }
      }
      function onListening() { resolve(port); }
      function onError() { tryListen(); }
    });

    // Respond
    send(serverPort);
  }

  function runService(id: string, name: string, info: IBackProcessInfo, detached: boolean): ManagedChildProcess {
    const proc = new ManagedChildProcess(
      id,
      name,
      path.join(state.config.flashpointPath, info.path),
      !!detached,
      info
    );
    proc.on('output', log);
    proc.on('change', () => {
      broadcast<IService>({
        id: '',
        type: BackOut.SERVICE_CHANGE,
        data: procToService(proc),
      });
    });
    try {
      proc.spawn();
    } catch (error) {
      log({
        source: servicesSource,
        content: `An unexpected error occurred while trying to run the background process "${proc.name}".`+
                 `  ${error.toString()}`
      });
    }
    return proc;
  }
}

function onConnect(this: WebSocket, socket: WebSocket, request: http.IncomingMessage): void {
  socket.onmessage = function onAuthMessage(event) {
    if (event.data === state.secret) {
      socket.onmessage = onMessageWrap;
      socket.send('auth successful'); // (reply with some garbage data)
    } else {
      socket.close();
    }
  };
}

async function onMessageWrap(event: WebSocket.MessageEvent) {
  state.messageQueue.push(event);

  if (!state.isHandling) {
    state.isHandling = true;
    while (state.messageQueue.length > 0) {
      const message = state.messageQueue.shift();
      if (message) { await onMessage(message); }
    }
    state.isHandling = false;
  }
}

async function onMessage(event: WebSocket.MessageEvent): Promise<void> {
  const req: WrappedRequest = JSON.parse(event.data.toString());
  switch (req.type) {
    case BackIn.ADD_LOG: {
      const reqData: AddLogData = req.data;
      log(reqData, req.id);
    } break;

    case BackIn.GET_MAIN_INIT_DATA: {
      const data: GetMainInitDataResponse = {
        preferences: state.preferences,
        config: state.config,
      };
      respond(event.target, {
        id: req.id,
        type: BackOut.GET_MAIN_INIT_DATA,
        data,
      });
    } break;

    case BackIn.GET_RENDERER_INIT_DATA: {
      const services: IService[] = [];
      if (state.services.server) { services.push(procToService(state.services.server)); }
      if (state.services.redirector) { services.push(procToService(state.services.redirector)); }

      respond<GetRendererInitDataResponse>(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: {
          preferences: state.preferences,
          config: state.config,
          imageServerPort: state.imageServerPort,
          log: state.log,
          services: services,
          languages: state.languages,
          language: createContainer(
            state.preferences.currentLanguage,
            state.countryCode,
            state.preferences.fallbackLanguage),
          themes: state.themeFiles.map(theme => ({ entryPath: theme.entryPath, meta: theme.meta })),
          playlists: state.init[BackInit.PLAYLISTS] ? state.playlists : undefined,
          platformNames: state.gameManager.platforms.map(p => p.name),
        },
      });
    } break;

    case BackIn.INIT_LISTEN: {
      const done: BackInit[] = [];
      for (let key in state.init) {
        const init: BackInit = key as any;
        if (state.init[init]) {
          done.push(init);
        } else {
          state.initEmitter.once(init, () => {
            respond(event.target, {
              id: '',
              type: BackOut.INIT_EVENT,
              data: { done: [ init ] },
            });
          });
        }
      }

      respond(event.target, {
        id: req.id,
        type: BackOut.INIT_EVENT,
        data: { done },
      });
    } break;

    case BackIn.GET_LIBRARIES: {
      const platforms = state.gameManager.platforms;
      const libraries: string[] = [];
      for (let i = 0; i < platforms.length; i++) {
        const library = platforms[i].library;
        if (libraries.indexOf(library) === -1) { libraries.push(library); }
      }

      respond<BrowseViewAllData>(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: { libraries: libraries, },
      });
    } break;

    case BackIn.LAUNCH_ADDAPP: {
      const reqData: LaunchAddAppData = req.data;

      let addApp: IAdditionalApplicationInfo | undefined;

      const platforms = state.gameManager.platforms;
      for (let i = 0; i < platforms.length; i++) {
        const aa = platforms[i].collection.additionalApplications.find(item => item.id === reqData.id);
        if (aa) {
          addApp = aa;
          break;
        }
      }

      if (addApp) {
        GameLauncher.launchAdditionalApplication(addApp, path.resolve(state.config.flashpointPath), state.preferences.useWine, log);
      }

      respond(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: undefined
      });
    } break;

    case BackIn.LAUNCH_GAME: {
      const reqData: LaunchGameData = req.data;

      let addApps: IAdditionalApplicationInfo[] | undefined;
      let game: IGameInfo | undefined;

      const platforms = state.gameManager.platforms;
      for (let i = 0; i < platforms.length; i++) {
        const g = platforms[i].collection.games.find(game => game.id === reqData.id);
        if (g) {
          // Find add apps
          for (let i = 0; i < platforms.length; i++) {
            const aa = platforms[i].collection.additionalApplications.filter(addApp => addApp.gameId === reqData.id);
            if (aa.length > 0) {
              addApps = aa;
              break;
            }
          }
          game = g;
          break;
        }
      }

      if (game) {
        GameLauncher.launchGame(game, addApps, path.resolve(state.config.flashpointPath), state.preferences.useWine, log);
      }

      respond(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: undefined
      });
    } break;

    case BackIn.SAVE_GAME: {
      const reqData: SaveGameData = req.data;

      state.gameManager.updateMetas({
        games: [reqData.game],
        addApps: reqData.addApps || [],
        library: reqData.library,
        saveToDisk: reqData.saveToFile,
      });

      state.queries = {}; // Clear entire cache

      respond<BrowseChangeData>(event.target, {
        id: req.id,
        type: BackOut.BROWSE_CHANGE,
        data: { library: reqData.library }
      });
    } break;

    case BackIn.DELETE_GAME: {
      const reqData: DeleteGameData = req.data;

      const platforms = state.gameManager.platforms;
      for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        if (GameManager.removeGame(reqData.id, platform)) {
          // Game was found and removed, search for addApps
          for (let j = 0; j < platforms.length; i++) {
            const addApps = platforms[j].collection.additionalApplications.filter(addApp => addApp.gameId === reqData.id);
            if (addApps.length > 0) {
              // Add apps found, remove all
              for (let addApp of addApps) {
                GameManager.removeAddApp(addApp.id, platform);
              }
            }
            // Save platform to disk
            await state.gameManager.savePlatformToFile(platform);
            break;
          }
        }
      }

      state.queries = {}; // Clear entire cache

      respond<BrowseChangeData>(event.target, {
        id: req.id,
        type: BackOut.BROWSE_CHANGE,
        data: { library: undefined }
      });
    } break;

    case BackIn.GET_GAME: {
      const reqData: GetGameData = req.data;

      let addApps: IAdditionalApplicationInfo[] | undefined;
      let game: IGameInfo | undefined;

      if (reqData.id !== undefined) {
        const platforms = state.gameManager.platforms;
        for (let i = 0; i < platforms.length; i++) {
          const g = platforms[i].collection.games.find(game => game.id === reqData.id);
          if (g) {
            // Find add apps
            for (let i = 0; i < platforms.length; i++) {
              const aa = platforms[i].collection.additionalApplications.filter(addApp => addApp.gameId === reqData.id);
              if (aa.length > 0) {
                addApps = aa;
                break;
              }
            }
            game = g;
            break;
          }
        }
      }

      respond<GetGameResponseData>(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: { game, addApps }
      });
    } break;

    case BackIn.GET_ALL_GAMES: {
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
    } break;

    case BackIn.BROWSE_VIEW_PAGE: {
      const reqData: BrowseViewPageData = req.data;

      const query: BackQuery = {
        extreme: false,
        broken: false,
        library: reqData.query.library,
        search: reqData.query.search,
        orderBy: reqData.query.orderBy as GameOrderBy,
        orderReverse: reqData.query.orderReverse as GameOrderReverse,
        playlistId: reqData.query.playlistId,
      };

      const hash = createHash('sha256').update(JSON.stringify(query)).digest('base64');
      let cache = state.queries[hash];
      if (!cache) {
        // @TODO Start clearing the cache if it gets too full

        const playlist = state.playlists.find(p => p.filename === query.playlistId);

        const results = searchGames({
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
            genre: g.genre,
            developer: g.developer,
            publisher: g.publisher,
          };
        }

        state.queries[hash] = cache = {
          query: query,
          games: results,
          viewGames: viewGames,
        };
      }

      respond<BrowseViewPageResponseData>(event.target, {
        id: req.id,
        type: BackOut.BROWSE_VIEW_PAGE_RESPONSE,
        data: {
          games: cache.viewGames.slice(reqData.offset, reqData.offset + reqData.limit),
          offset: reqData.offset,
          total: cache.games.length,
        },
      });
    } break;

    case BackIn.UPDATE_CONFIG: {
      const newConfig = deepCopy(state.config);
      overwriteConfigData(newConfig, req.data);
      await ConfigFile.saveFile(path.join(state.configFolder, configFilename), newConfig);
      respond(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
      });
    } break;

    case BackIn.UPDATE_PREFERENCES: {
      const dif = difObjects(defaultPreferencesData, state.preferences, req.data);
      if (dif) {
        if ((typeof dif.currentLanguage  !== 'undefined' && dif.currentLanguage  !== state.preferences.currentLanguage) ||
            (typeof dif.fallbackLanguage !== 'undefined' && dif.fallbackLanguage !== state.preferences.fallbackLanguage)) {
          broadcast<LanguageChangeData>({
            id: '',
            type: BackOut.LANGUAGE_CHANGE,
            data: createContainer(
              (typeof dif.currentLanguage !== 'undefined') ? dif.currentLanguage : state.preferences.currentLanguage,
              state.countryCode,
              (typeof dif.fallbackLanguage !== 'undefined') ? dif.fallbackLanguage : state.preferences.fallbackLanguage)
          });
        }

        overwritePreferenceData(state.preferences, dif);
        await PreferencesFile.saveFile(path.join(state.configFolder, preferencesFilename), state.preferences);
      }
      respond(event.target, {
        id: req.id,
        type: BackOut.UPDATE_PREFERENCES_RESPONSE,
        data: state.preferences,
      });
    } break;

    case BackIn.SERVICE_ACTION: {
      const reqData: ServiceActionData = req.data;

      const proc = state.services[reqData.id];
      if (proc) {
        switch (reqData.action) {
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
    } break;

    case BackIn.GET_PLAYLISTS: {
      respond<GetPlaylistResponse>(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: state.playlists,
      });
    } break;

    case BackIn.SAVE_PLAYLIST: {
      const reqData: SavePlaylistData = req.data;

      const folder = state.playlistWatcher.getFolder();
      const filename = sanitizeFilename(reqData.playlist.filename || `${reqData.playlist.title}.json`);
      if (folder && filename) {
        if (reqData.prevFilename === filename) { // (Existing playlist)
          await PlaylistFile.saveFile(path.join(folder, filename), reqData.playlist);
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
            await PlaylistFile.saveFile(path.join(folder, coolFilename), reqData.playlist);

            // Delete old playlist (if renaming it)
            if (reqData.prevFilename) {
              await deletePlaylist(reqData.prevFilename, folder, state.playlists);
            }
          }
        }
      }

      respond(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
      });
    } break;

    case BackIn.DELETE_PLAYLIST: {
      const reqData: DeletePlaylistData = req.data;

      const folder = state.playlistWatcher.getFolder();
      if (folder) { await deletePlaylist(reqData, folder, state.playlists); }

      respond(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
      });
    } break;

    case BackIn.QUIT: {
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
          execProcess(state.serviceInfo.stop[i], true);
        }
        respond(event.target, {
          id: req.id,
          type: BackOut.QUIT,
        });
        exit();
      }
    } break;
  }
}

function onFileServerRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  try {
    let url = req.url || '';
    for (let i = 0; i < url.length; i++) { // (Remove all leading slashes)
      if (url[i] !== '/') {
        url = url.substr(i);
        break;
      }
    }
    const index = url.indexOf('/');
    if (index >= 0) {
      switch (url.substr(0, index).toLowerCase()) {
        case 'logos':
        case 'screenshots': {
          const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
          const filePath = path.join(imageFolder, url);
          if (filePath.startsWith(imageFolder)) {
            fs.readFile(filePath, (error, data) => {
              if (error) {
                res.writeHead(404);
                res.end();
              } else {
                res.writeHead(200, {
                  'Content-Type': 'image/png',
                  'Content-Length': data.length,
                });
                res.end(data);
              }
            });
          }
        } break;

        case 'themes': {
          const themeFolder = path.join(state.config.flashpointPath, state.config.themeFolderPath);
          const index = url.indexOf('/');
          const relativeUrl = (index >= 0) ? url.substr(index + 1) : url;
          const filePath = path.join(themeFolder, relativeUrl);
          if (filePath.startsWith(themeFolder)) {
            fs.readFile(filePath, (error, data) => {
              if (error) {
                res.writeHead(404);
                res.end();
              } else {
                res.writeHead(200, {
                  'Content-Type': getContentType(getFileExtension(filePath)),
                  'Content-Length': data.length,
                });
                res.end(data);
              }
            });
          }
        } break;
      }
    }
  } catch (error) { console.warn(error); }
}

function exit() {
  if (!state.isExit) {
    state.isExit = true;
    state.languageWatcher.abort();
    state.themeWatcher.abort();
    Promise.all([
      new Promise(resolve => state.server.close(error => {
        if (error) { console.log('An error occurred whie closing the WebSocket server.', error); }
        resolve();
      })),
      new Promise(resolve => state.fileServer.close(error => {
        if (error) { console.log('An error occurred whie closing the file server.', error); }
        resolve();
      })),
    ]).then(() => { process.exit(); });
  }
}

function respond<T>(target: WebSocket, response: WrappedResponse<T>): void {
  console.log('RESPOND', response);
  target.send(JSON.stringify(response));
}

function broadcast<T>(response: WrappedResponse<T>): void {
  console.log('BROADCAST', response);
  if (!isErrorProxy(state.server)) {
    const message = JSON.stringify(response);
    state.server.clients.forEach(socket => {
      if (socket.onmessage === onMessageWrap) { // (Check if authorized)
        socket.send(message);
      }
    });
  }
}

function log(preEntry: ILogPreEntry, id?: string): void {
  const entry: ILogEntry = {
    source: preEntry.source,
    content: preEntry.content,
    timestamp: Date.now(),
  };
  state.log.push(entry);

  broadcast({
    id: id || '',
    type: BackOut.LOG_ENTRY_ADDED,
    data: {
      entry,
      index: state.log.length - 1,
    }
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

function searchGames(opts: SearchGamesOpts): IGameInfo[] {
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

async function execProcess(proc: IBackProcessInfo, sync?: boolean): Promise<void> {
  const cwd: string = path.join(state.config.flashpointPath, proc.path);
  log({
    source: servicesSource,
    content: `Executing "${proc.filename}" ${stringifyArray(proc.arguments)} in "${proc.path}"`
  });
  try {
    if (sync) { child_process.execFileSync(  proc.filename, proc.arguments, { cwd: cwd }); }
    else      { await child_process.execFile(proc.filename, proc.arguments, { cwd: cwd }); }
  } catch (error) {
    log({
      source: servicesSource,
      content: `An unexpected error occurred while executing a command:\n  "${error}"`
    });
  }
}

function procToService(proc: ManagedChildProcess): IService {
  return {
    id: proc.id,
    name: proc.name,
    state: proc.getState(),
    pid: proc.getPid(),
    startTime: proc.getStartTime(),
    info: proc.info,
  };
}

function readLangFile(filepath: string): Promise<RecursivePartial<LangFileContent>> {
  return new Promise(function(resolve, reject) {
    fs.readFile(filepath, 'utf8', function(error, data) {
      if (error) {
        reject(error);
      } else {
        // @TODO Verify that the file is properly formatted (type-wise)
        try { resolve(JSON.parse(data)); }
        catch (error) { reject(error); }
      }
    });
  });
}

const defaultLang = getDefaultLocalization();
function createContainer(currentCode: string, autoLangCode: string, fallbackCode: string): LangContainer {
  // Get current language
  let current: LangFile | undefined;
  if (currentCode !== autoCode) { // (Specific language)
    current = state.languages.find(item => item.code === currentCode);
  }
  if (!current) { // (Auto language)
    current = state.languages.find(item => item.code === autoLangCode);
  }
  // Get fallback language
  const fallback = state.languages.find(item => item.code === fallbackCode);
  // Combine all language container objects (by overwriting the default with the fallback and the current)
  const data = recursiveReplace(recursiveReplace(deepCopy(defaultLang), fallback && fallback.data), current && current.data);
  data.libraries = { // Allow libraries to add new properties (and not just overwrite the default)
    ...data.libraries,
    ...(fallback && fallback.data && fallback.data.libraries),
    ...(current && current.data && current.data.libraries)
  };
  return data;
}

/** Get the file extension of a file path (efterything after the last dot, or an empty string if the filename has no dots). */
function getFileExtension(filename: string): string {
  for (let i = filename.length - 1; i >= 0; i--) {
    switch (filename[i]) {
      case '/':
      case '\\': return '';
      case '.': return filename.substr(i + 1);
    }
  }
  return '';
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

function pathExists(filePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (error, stats) => {
      if (error) {
        if (error.code === 'ENOENT') { resolve(false); }
        else { reject(error); }
      } else { resolve(true); }
    });
  });
}
