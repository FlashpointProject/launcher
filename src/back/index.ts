import { Game } from '@database/entity/Game';
import { AddLogData, BackIn, BackInit, BackInitArgs, BackOut, BrowseChangeData, BrowseViewIndexData, BrowseViewIndexResponseData, BrowseViewPageData, BrowseViewPageResponseData, DeleteGameData, DeleteImageData, DeletePlaylistData, DuplicateGameData, ExportGameData, GetAllGamesResponseData, GetExecData, GetGameData, GetGameResponseData, GetGamesTotalResponseData, GetMainInitDataResponse, GetPlaylistResponse, GetRendererInitDataResponse, GetSuggestionsResponseData, ImageChangeData, ImportCurationData, ImportCurationResponseData, InitEventData, LanguageChangeData, LanguageListChangeData, LaunchAddAppData, LaunchCurationAddAppData, LaunchCurationData, LaunchGameData, LocaleUpdateData, OpenDialogData, OpenDialogResponseData, OpenExternalData, OpenExternalResponseData, PlaylistRemoveData, PlaylistUpdateData, QuickSearchData, QuickSearchResponseData, RandomGamesData, RandomGamesResponseData, SaveGameData, SaveImageData, SavePlaylistData, ServiceActionData, SetLocaleData, ThemeChangeData, ThemeListChangeData, UpdateConfigData, ViewGame, WrappedRequest, WrappedResponse } from '@shared/back/types';
import { overwriteConfigData } from '@shared/config/util';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import { findMostUsedApplicationPaths } from '@shared/curate/defaultValues';
import { stringifyCurationFormat } from '@shared/curate/format/stringifier';
import { convertToCurationMeta } from '@shared/curate/metaToMeta';
import { FilterGameOpts } from '@shared/game/GameFilter';
import { DeepPartial, GamePlaylist, IBackProcessInfo, IService, ProcessAction, RecursivePartial } from '@shared/interfaces';
import { autoCode, getDefaultLocalization, LangContainer, LangFile, LangFileContent } from '@shared/lang';
import { ILogEntry, ILogPreEntry } from '@shared/Log/interface';
import { stringifyLogEntriesRaw } from '@shared/Log/LogCommon';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { defaultPreferencesData, overwritePreferenceData } from '@shared/preferences/util';
import { parseThemeMetaData, themeEntryFilename, ThemeMeta } from '@shared/ThemeFile';
import { createErrorProxy, deepCopy, isErrorProxy, recursiveReplace, removeFileExtension, stringifyArray } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import * as child_process from 'child_process';
import { createHash } from 'crypto';
import { MessageBoxOptions, OpenExternalOptions } from 'electron';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as http from 'http';
import * as mime from 'mime';
import * as path from 'path';
import 'reflect-metadata';
// Required for the DB Models to function
import 'sqlite3';
import { Connection, createConnection, getConnectionOptions } from 'typeorm';
import * as util from 'util';
import * as WebSocket from 'ws';
import { ConfigFile } from './ConfigFile';
import { loadExecMappingsFile } from './Execs';
import { GameManager } from './game/GameManager';
import { GameLauncher } from './GameLauncher';
import { importCuration, launchAddAppCuration, launchCuration } from './importGame';
import { ManagedChildProcess } from './ManagedChildProcess';
import { PlaylistFile } from './PlaylistFile';
import { ServicesFile } from './ServicesFile';
import { getSuggestions } from './suggestions';
import { BackQuery, BackQueryChache, BackState } from './types';
import { EventQueue } from './util/EventQueue';
import { FolderWatcher } from './util/FolderWatcher';
import { copyError, pathExists } from './util/misc';
import { sanitizeFilename } from './util/sanitizeFilename';
import { uuid } from './util/uuid';
import { ModelUtils } from '@shared/game/util';


const copyFile  = util.promisify(fs.copyFile);
const readFile  = util.promisify(fs.readFile);
const stat      = util.promisify(fs.stat);
const unlink    = util.promisify(fs.unlink);
const writeFile = util.promisify(fs.writeFile);

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
  fileServerPort: -1,
  secret: createErrorProxy('secret'),
  preferences: createErrorProxy('preferences'),
  config: createErrorProxy('config'),
  configFolder: createErrorProxy('configFolder'),
  exePath: createErrorProxy('exePath'),
  localeCode: createErrorProxy('countryCode'),
  gameManager: {
    platformsPath: '',
    saveQueue: new EventQueue(),
    log: (content) => log({ source: 'GameManager', content }),
  },
  messageQueue: [],
  isHandling: false,
  messageEmitter: new EventEmitter() as any,
  init: {
    0: false,
    1: false,
    2: false,
  },
  initEmitter: new EventEmitter() as any,
  queries: {},
  log: [],
  serviceInfo: undefined,
  services: {},
  languageWatcher: new FolderWatcher(),
  languageQueue: new EventQueue(),
  languages: [],
  languageContainer: getDefaultLocalization(), // Cache of the latest lang container - used by back when it needs lang strings
  themeWatcher: new FolderWatcher(),
  themeQueue: new EventQueue(),
  themeFiles: [],
  playlistWatcher: new FolderWatcher(),
  playlistQueue: new EventQueue(),
  playlists: [],
  execMappings: [],
};

const preferencesFilename = 'preferences.json';
const configFilename = 'config.json';
let connection: Connection | undefined;

const servicesSource = 'Background Services';

process.on('message', onProcessMessage);
process.on('disconnect', () => { exit(); }); // (Exit when the main process does)

async function onProcessMessage(message: any, sendHandle: any): Promise<void> {
  if (state.isInit) { return; }
  state.isInit = true;

  const content: BackInitArgs = JSON.parse(message);
  state.secret = content.secret;
  state.configFolder = content.configFolder;
  state.localeCode = content.localeCode;
  state.exePath = content.exePath;

  // Read configs & preferences
  const [pref, conf] = await (Promise.all([
    PreferencesFile.readOrCreateFile(path.join(state.configFolder, preferencesFilename)),
    ConfigFile.readOrCreateFile(path.join(state.configFolder, configFilename))
  ]));
  state.preferences = pref;
  state.config = conf;

  // Setup DB
  if (!connection) {
    // Override the Database path to place it in Flashpoint data
    const connectionOptions = await getConnectionOptions();
    const newOptions = Object.assign(connectionOptions, { database: path.join(state.config.flashpointPath, 'Data', 'flashpoint.sqlite') });
    connection = await createConnection(newOptions);
  }

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
            lang.code === state.localeCode ||
            lang.code === state.preferences.fallbackLanguage) {
          state.languageContainer = createContainer(
            state.preferences.currentLanguage,
            state.localeCode,
            state.preferences.fallbackLanguage
          );
          broadcast<LanguageChangeData>({
            id: '',
            type: BackOut.LANGUAGE_CHANGE,
            data: state.languageContainer,
          });
        }
      });
    }
  });
  state.languageWatcher.on('error', console.error);
  const langFolder = path.join(content.isDev ? process.cwd() : content.exePath, 'lang');
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
          // A file in a theme has been changed
          broadcast<ThemeChangeData>({
            id: '',
            type: BackOut.THEME_CHANGE,
            data: item.entryPath,
          });
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
            // A theme has been removed
            broadcast<ThemeListChangeData>({
              id: '',
              type: BackOut.THEME_LIST_CHANGE,
              data: state.themeFiles,
            });
          } else { // (Non-entry file was removed)
            // A file in a theme has been removed
            broadcast<ThemeChangeData>({
              id: '',
              type: BackOut.THEME_CHANGE,
              data: item.entryPath,
            });
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
          // A file has been added to this theme
          broadcast<ThemeChangeData>({
            id: '',
            type: BackOut.THEME_CHANGE,
            data: item.entryPath,
          });
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
      if (offsetPath) { // (Sub-folder)
        const index = offsetPath.indexOf(path.sep);
        const folderName = (index >= 0) ? offsetPath.substr(0, index) : offsetPath;
        return state.themeFiles.find(item => item.basename === folderName);
      } else { // (Theme folder)
        return state.themeFiles.find(item => item.entryPath === filename || item.basename === filename);
      }
    }
  });
  state.themeWatcher.on('error', console.error);
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
      if (error.code === 'ENOENT') {
        log({ source: 'Back', content: `Failed to watch playlist folder. Folder does not exist (Path: "${playlistFolder}")` });
      } else {
        log({ source: 'Back', content: (typeof error.toString === 'function') ? error.toString() : (error + '') });
      }

      state.init[BackInit.PLAYLISTS] = true;
      state.initEmitter.emit(BackInit.PLAYLISTS);
    }
  });

  // Load Exec Mappings
  loadExecMappingsFile(state.config.flashpointPath, content => log({ source: 'Launcher', content }))
  .then(data => {
    state.execMappings = data;
  })
  .catch(error => {
    log({
      source: 'Launcher',
      content: `Failed to load exec mappings file. Ignore if on Windows. - ${error}`,
    });
  })
  .finally(() => {
    state.init[BackInit.EXEC] = true;
    state.initEmitter.emit(BackInit.EXEC);
  });

  // Find the first available port in the range
  const serverPort = await new Promise<number>(resolve => {
    const minPort = state.config.backPortMin;
    const maxPort = state.config.backPortMax;

    let port: number = minPort - 1;
    let server: WebSocket.Server | undefined;
    tryListen();

    function tryListen() {
      if (server) {
        server.off('error', onError);
        server.off('listening', onceListening);
      }

      if (port++ < maxPort) {
        server = new WebSocket.Server({
          host: content.acceptRemote ? undefined : 'localhost',
          port: port,
        });
        server.on('error', onError);
        server.on('listening', onceListening);
      } else {
        done(new Error(`Failed to open server. All attempted ports are already in use (Ports: ${minPort} - ${maxPort}).`));
      }
    }

    function onError(error: Error): void {
      if ((error as any).code === 'EADDRINUSE') {
        tryListen();
      } else {
        done(error);
      }
    }
    function onceListening() {
      done(undefined);
    }
    function done(error: Error | undefined) {
      if (server) {
        server.off('error', onError);
        server.off('listening', onceListening);
        state.server = server;
        state.server.on('connection', onConnect);
      }
      if (error) {
        log({
          source: 'Back',
          content: 'Failed to open WebSocket server.\n'+error,
        });
        resolve(-1);
      } else {
        resolve(port);
      }
    }
  });

  // Find the first available port in the range
  state.fileServerPort = await new Promise(resolve => {
    const minPort = state.config.imagesPortMin;
    const maxPort = state.config.imagesPortMax;

    let port = minPort - 1;
    state.fileServer.once('listening', onceListening);
    state.fileServer.on('error', onError);
    tryListen();

    function onceListening() { done(undefined); }
    function onError(error: Error) {
      if ((error as any).code === 'EADDRINUSE') {
        tryListen();
      } else {
        done(error);
      }
    }
    function tryListen() {
      if (port++ < maxPort) {
        state.fileServer.listen(port, content.acceptRemote ? undefined : 'localhost');
      } else {
        done(new Error(`All attempted ports are already in use (Ports: ${minPort} - ${maxPort}).`));
      }
    }
    function done(error: Error | undefined) {
      state.fileServer.off('listening', onceListening);
      state.fileServer.off('error', onError);
      if (error) {
        log({
          source: 'Back',
          content: 'Failed to open HTTP server.\n'+error,
        });
        resolve(-1);
      } else {
        resolve(port);
      }
    }
  });

  // Exit if it failed to open the server
  if (serverPort < 0) {
    setImmediate(exit);
  }

  // Respond
  send(serverPort);

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
  const [req, error] = parseWrappedRequest(event.data);
  if (error || !req) {
    console.error('Failed to parse incoming WebSocket request (see error below):\n', error);
    return;
  }

  // Responses are handled instantly - requests and handled in queue
  // (The back could otherwise "soft lock" if it makes a request to the renderer while it is itself handling a request)
  if (req.type === BackIn.GENERIC_RESPONSE) {
    state.messageEmitter.emit(req.id, req);
  } else {
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
}

async function onMessage(event: WebSocket.MessageEvent): Promise<void> {
  const [req, error] = parseWrappedRequest(event.data);
  if (error || !req) {
    console.error('Failed to parse incoming WebSocket request (see error below):\n', error);
    return;
  }

  // console.log('Back Request - ', req); // @DEBUG

  state.messageEmitter.emit(req.id, req);

  switch (req.type) {
    case BackIn.ADD_LOG: {
      const reqData: AddLogData = req.data;
      log(reqData, req.id);
    } break;

    case BackIn.GET_MAIN_INIT_DATA: {
      respond<GetMainInitDataResponse>(event.target, {
        id: req.id,
        type: BackOut.GET_MAIN_INIT_DATA,
        data: {
          preferences: state.preferences,
          config: state.config,
        },
      });
    } break;

    case BackIn.GET_RENDERER_INIT_DATA: {
      const services: IService[] = [];
      if (state.services.server) { services.push(procToService(state.services.server)); }
      if (state.services.redirector) { services.push(procToService(state.services.redirector)); }

      state.languageContainer = createContainer(
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
          libraries: libraries,
          platforms: platforms,
          playlists: state.init[BackInit.PLAYLISTS] ? state.playlists : undefined,
          localeCode: state.localeCode,
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
    } break;

    case BackIn.GET_SUGGESTIONS: {
      const games = await allGames();
      respond<GetSuggestionsResponseData>(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: {
          suggestions: getSuggestions(games, await GameManager.findLibraries()),
          appPaths: findMostUsedApplicationPaths(games),
        },
      });
    } break;

    case BackIn.GET_GAMES_TOTAL: {
      respond<GetGamesTotalResponseData>(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: await GameManager.countGames(),
      });
    } break;

    case BackIn.SET_LOCALE: {
      const reqData: SetLocaleData = req.data;

      state.localeCode = reqData;

      // @TODO Update the language container if the locale changes

      respond<LocaleUpdateData>(event.target, {
        id: req.id,
        type: BackOut.LOCALE_UPDATE,
        data: reqData,
      });
    } break;

    case BackIn.GET_EXEC: {
      respond<GetExecData>(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: state.execMappings,
      });
    } break;

    case BackIn.LAUNCH_ADDAPP: {
      const reqData: LaunchAddAppData = req.data;
      const addApp = await GameManager.findAddApp(reqData.id);
      if (addApp) {
        GameLauncher.launchAdditionalApplication({
          addApp,
          fpPath: path.resolve(state.config.flashpointPath),
          native: addApp.parentGame && state.config.nativePlatforms.some(p => p === addApp.parentGame.platform) || false,
          execMappings: state.execMappings,
          lang: state.languageContainer,
          log: log,
          openDialog: openDialog(event.target),
          openExternal: openExternal(event.target),
        });
        break;
      }

      respond(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: undefined
      });
    } break;

    case BackIn.LAUNCH_GAME: {
      const reqData: LaunchGameData = req.data;

      const game = await GameManager.findGame(reqData.id);

      if (game) {
        GameLauncher.launchGame({
          game,
          fpPath: path.resolve(state.config.flashpointPath),
          native: state.config.nativePlatforms.some(p => p === game.platform),
          execMappings: state.execMappings,
          lang: state.languageContainer,
          log,
          openDialog: openDialog(event.target),
          openExternal: openExternal(event.target),
        });
      }

      respond(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: undefined
      });
    } break;

    case BackIn.SAVE_GAME: {
      const reqData: SaveGameData = req.data;

      const result = GameManager.updateGame(reqData.game);

      state.queries = {}; // Clear entire cache

      respond<BrowseChangeData>(event.target, {
        id: req.id,
        type: BackOut.BROWSE_CHANGE,
        data: {
          library: reqData.library,
          gamesTotal: await GameManager.countGames(),
        }
      });
    } break;

    case BackIn.DELETE_GAME: {
      const reqData: DeleteGameData = req.data;

      GameManager.removeGameAndAddApps(reqData.id);

      state.queries = {}; // Clear entire cache

      respond<BrowseChangeData>(event.target, {
        id: req.id,
        type: BackOut.BROWSE_CHANGE,
        data: {
          library: undefined,
          gamesTotal: await GameManager.countGames(),
        }
      });
    } break;

    case BackIn.DUPLICATE_GAME: {
      const reqData: DuplicateGameData = req.data;

      const game = await GameManager.findGame(reqData.id);
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
        if (reqData.dupeImages) {
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
          gamesTotal: await GameManager.countGames(),
        }
      });
    } break;

    case BackIn.EXPORT_GAME: {
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
    } break;

    case BackIn.GET_GAME: {
      const reqData: GetGameData = req.data;

      respond<GetGameResponseData>(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: {
          game: await GameManager.findGame(reqData.id)
        }
      });
    } break;

    case BackIn.GET_ALL_GAMES: {
      const games: Game[] = await GameManager.findGames();

      respond<GetAllGamesResponseData>(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: { games }
      });
    } break;

    case BackIn.RANDOM_GAMES: {
      const reqData: RandomGamesData = req.data;
      let allGames: Game[] = await GameManager.findGames();

      const pickedGames: Game[] = [];
      for (let i = 0; i < reqData.count; i++) {
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
    } break;

    case BackIn.BROWSE_VIEW_PAGE: {
      const reqData: BrowseViewPageData = req.data;

      const query: BackQuery = {
        extreme: reqData.query.extreme,
        broken: reqData.query.broken,
        library: reqData.query.library,
        search: reqData.query.search,
        orderBy: reqData.query.orderBy as GameOrderBy,
        orderReverse: reqData.query.orderReverse as GameOrderReverse,
        playlistId: reqData.query.playlistId,
      };

      const hash = createHash('sha256').update(JSON.stringify(query)).digest('base64');
      let cache = state.queries[hash];
      if (!cache) { state.queries[hash] = cache = await queryGames(query); } // @TODO Start clearing the cache if it gets too full

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

    case BackIn.BROWSE_VIEW_INDEX: {
      const reqData: BrowseViewIndexData = req.data;

      const query: BackQuery = {
        extreme: reqData.query.extreme,
        broken: reqData.query.broken,
        library: reqData.query.library,
        search: reqData.query.search,
        orderBy: reqData.query.orderBy as GameOrderBy,
        orderReverse: reqData.query.orderReverse as GameOrderReverse,
        playlistId: reqData.query.playlistId,
      };

      const hash = createHash('sha256').update(JSON.stringify(query)).digest('base64');
      let cache = state.queries[hash];
      if (!cache) { state.queries[hash] = cache = await queryGames(query); } // @TODO Start clearing the cache if it gets too full

      let index = -1;
      for (let i = 0; i < cache.viewGames.length; i++) {
        if (cache.viewGames[i].id === reqData.gameId) {
          index = i;
          break;
        }
      }

      respond<BrowseViewIndexResponseData>(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: { index },
      });
    } break;

    case BackIn.SAVE_IMAGE: {
      const reqData: SaveImageData = req.data;

      const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
      const folder = sanitizeFilename(reqData.folder);
      const id = sanitizeFilename(reqData.id);
      const fullPath = path.join(imageFolder, folder, id.substr(0, 2), id.substr(2, 2), id + '.png');

      if (fullPath.startsWith(imageFolder)) { // (Ensure that it does not climb out of the image folder)
        try {
          await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
          await writeFile(fullPath, Buffer.from(reqData.content, 'base64'));
        } catch (e) {
          log({
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
    } break;

    case BackIn.DELETE_IMAGE: {
      const reqData: DeleteImageData = req.data;

      const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
      const folder = sanitizeFilename(reqData.folder);
      const id = sanitizeFilename(reqData.id);
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
    } break;

    case BackIn.QUICK_SEARCH: {
      const reqData: QuickSearchData = req.data;

      const query: BackQuery = {
        extreme: reqData.query.extreme,
        broken: reqData.query.broken,
        library: reqData.query.library,
        search: reqData.query.search,
        orderBy: reqData.query.orderBy as GameOrderBy,
        orderReverse: reqData.query.orderReverse as GameOrderReverse,
        playlistId: reqData.query.playlistId,
      };

      const hash = createHash('sha256').update(JSON.stringify(query)).digest('base64');
      let cache = state.queries[hash];
      if (!cache) { state.queries[hash] = cache = await queryGames(query); }

      let result: string | undefined;
      let index: number | undefined;
      for (let i = 0; i < cache.games.length; i++) {
        if (cache.games[i].title.toLowerCase().startsWith(reqData.search)) {
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
    } break;

    case BackIn.UPDATE_CONFIG: {
      const reqData: UpdateConfigData = req.data;

      const newConfig = deepCopy(state.config);
      overwriteConfigData(newConfig, reqData);

      try { await ConfigFile.saveFile(path.join(state.configFolder, configFilename), newConfig); }
      catch (error) { log({ source: 'Launcher', content: error }); }

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
          state.languageContainer = createContainer(
            (typeof dif.currentLanguage !== 'undefined') ? dif.currentLanguage : state.preferences.currentLanguage,
            state.localeCode,
            (typeof dif.fallbackLanguage !== 'undefined') ? dif.fallbackLanguage : state.preferences.fallbackLanguage
          );
          broadcast<LanguageChangeData>({
            id: '',
            type: BackOut.LANGUAGE_CHANGE,
            data: state.languageContainer,
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

    case BackIn.IMPORT_CURATION: {
      const reqData: ImportCurationData = req.data;

      let error: any | undefined;
      try {
        await importCuration({
          curation: reqData.curation,
          gameManager: state.gameManager,
          log: reqData.log ? log : undefined,
          date: (reqData.date !== undefined) ? new Date(reqData.date) : undefined,
          saveCuration: reqData.saveCuration,
          fpPath: state.config.flashpointPath,
          imageFolderPath: state.config.imageFolderPath,
          openDialog: openDialog(event.target),
          openExternal: openExternal(event.target),
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
    } break;

    case BackIn.LAUNCH_CURATION: {
      const reqData: LaunchCurationData = req.data;

      try {
        await launchCuration(reqData.key, reqData.meta, reqData.addApps, {
          fpPath: path.resolve(state.config.flashpointPath),
          native: state.config.nativePlatforms.some(p => p === reqData.meta.platform),
          execMappings: state.execMappings,
          lang: state.languageContainer,
          log,
          openDialog: openDialog(event.target),
          openExternal: openExternal(event.target),
        });
      } catch (e) {
        log({
          source: 'Launcher',
          content: e + '',
        });
      }

      respond(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: undefined,
      });
    } break;

    case BackIn.LAUNCH_CURATION_ADDAPP: {
      const reqData: LaunchCurationAddAppData = req.data;

      try {
        await launchAddAppCuration(reqData.curationKey, reqData.curation, {
          fpPath: path.resolve(state.config.flashpointPath),
          native: state.config.nativePlatforms.some(p => p === reqData.platform) || false,
          execMappings: state.execMappings,
          lang: state.languageContainer,
          log,
          openDialog: openDialog(event.target),
          openExternal: openExternal(event.target),
        });
      } catch (e) {
        log({
          source: 'Launcher',
          content: e + '',
        });
      }

      respond(event.target, {
        id: req.id,
        type: BackOut.GENERIC_RESPONSE,
        data: undefined,
      });
    } break;

    case BackIn.QUIT: {
      respond(event.target, {
        id: req.id,
        type: BackOut.QUIT,
      });
      exit();
    } break;
  }
}

function onFileServerRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  try {
    let urlPath = decodeURIComponent(req.url || '');

    // Remove the get parameters
    const qIndex = urlPath.indexOf('?');
    if (qIndex >= 0) { urlPath = urlPath.substr(0, qIndex); }

    // Remove all leading slashes
    for (let i = 0; i < urlPath.length; i++) {
      if (urlPath[i] !== '/') {
        urlPath = urlPath.substr(i);
        break;
      }
    }

    const index = urlPath.indexOf('/');
    const firstItem = (index >= 0 ? urlPath.substr(0, index) : urlPath).toLowerCase(); // First filename in the path string ("A/B/C" => "A" | "D" => "D")
    switch (firstItem) {
      // Image folder
      case 'images': {
        const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
        const filePath = path.join(imageFolder, urlPath.substr(index + 1));
        if (filePath.startsWith(imageFolder)) {
          serveFile(req, res, filePath);
        }
      } break;

      // Theme folder
      case 'themes': {
        const themeFolder = path.join(state.config.flashpointPath, state.config.themeFolderPath);
        const index = urlPath.indexOf('/');
        const relativeUrl = (index >= 0) ? urlPath.substr(index + 1) : urlPath;
        const filePath = path.join(themeFolder, relativeUrl);
        if (filePath.startsWith(themeFolder)) {
          serveFile(req, res, filePath);
        }
      } break;

      // Logos folder
      case 'logos': {
        const logoFolder = path.join(state.config.flashpointPath, state.config.logoFolderPath);
        const filePath = path.join(logoFolder, urlPath.substr(index + 1));
        if (filePath.startsWith(logoFolder)) {
          serveFile(req, res, filePath);
        }
      } break;

      // JSON file(s)
      case 'credits.json': {
        serveFile(req, res, path.join(state.config.flashpointPath, state.config.jsonFolderPath, 'credits.json'));
      } break;

      // Nothing
      default: {
        res.writeHead(404);
        res.end();
      } break;
    }
  } catch (error) { console.warn(error); }
}

function serveFile(req: http.IncomingMessage, res: http.ServerResponse, filePath: string): void {
  if (req.method === 'GET' || req.method === 'HEAD') {
    fs.stat(filePath, (error, stats) => {
      if (error || stats && !stats.isFile()) {
        res.writeHead(404);
        res.end();
      } else {
        res.writeHead(200, {
          'Content-Type': mime.getType(path.extname(filePath)) || '',
          'Content-Length': stats.size,
        });
        if (req.method === 'GET') {
          const stream = fs.createReadStream(filePath);
          stream.on('error', error => {
            console.warn(`File server failed to stream file. ${error}`);
            stream.destroy(); // Calling "destroy" inside the "error" event seems like it could case an endless loop (although it hasn't thus far)
            if (!res.finished) { res.end(); }
          });
          stream.pipe(res);
        } else {
          res.end();
        }
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
}

/** Exit the process cleanly. */
function exit() {
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
        execProcess(state.serviceInfo.stop[i], true);
      }
    }

    state.languageWatcher.abort();
    state.themeWatcher.abort();


    Promise.all([
      // Close WebSocket server
      isErrorProxy(state.server) ? undefined : new Promise(resolve => state.server.close(error => {
        if (error) { console.warn('An error occurred whie closing the WebSocket server.', error); }
        resolve();
      })),
      // Close file server
      new Promise(resolve => state.fileServer.close(error => {
        if (error) { console.warn('An error occurred whie closing the file server.', error); }
        resolve();
      })),
      // Close DB connection
      connection ? connection.close : () => {}
    ]).then(() => { process.exit(); });
  }
}

function respond<T>(target: WebSocket, response: WrappedResponse<T>): void {
  // console.log('RESPOND', response);
  target.send(JSON.stringify(response));
}

function broadcast<T>(response: WrappedResponse<T>): number {
  // console.log('BROADCAST', response);
  let count = 0;
  if (!isErrorProxy(state.server)) {
    const message = JSON.stringify(response);
    state.server.clients.forEach(socket => {
      if (socket.onmessage === onMessageWrap) { // (Check if authorized)
        socket.send(message);
        count += 1;
      }
    });
  }
  return count;
}

function log(preEntry: ILogPreEntry, id?: string): void {
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

  fs.appendFile('./launcher.log', stringifyLogEntriesRaw([entry]), (err) => {
    if (err) {
      console.error(`Failed to write to log file - ${err}`);
    }
  });
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

async function searchGames(opts: SearchGamesOpts): Promise<Game[]> {
  // Build opts from preferences and query
  const filterOpts: FilterGameOpts = {
    search: opts.query,
    extreme: opts.extreme,
    broken: opts.broken,
    playlist: opts.playlist,
  };

  return GameManager.findGames(filterOpts);
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
    if (!current) { current = state.languages.find(item => item.code.startsWith(autoLangCode.substr(0, 2))); }
  }
  // Get fallback language
  const fallback = (
    state.languages.find(item => item.code === fallbackCode) || // (Exact match)
    state.languages.find(item => item.code.startsWith(fallbackCode.substr(0, 2))) // (Same language)
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

async function queryGames(query: BackQuery): Promise<BackQueryChache> {
  const playlist = state.playlists.find(p => p.filename === query.playlistId);

  const results = await searchGames({
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

function openDialog(target: WebSocket) {
  return (options: MessageBoxOptions) => {
    return new Promise<number>((resolve, reject) => {
      const id = uuid();

      state.messageEmitter.once(id, (req: WrappedRequest) => {
        const reqData: OpenDialogResponseData = req.data;
        resolve(reqData);
      });

      respond<OpenDialogData>(target, {
        id,
        data: options,
        type: BackOut.OPEN_DIALOG,
      });
    });
  };
}

function openExternal(target: WebSocket) {
  return (url: string, options?: OpenExternalOptions) => {
    return new Promise<void>((resolve, reject) => {
      const id = uuid();

      state.messageEmitter.once(id, (req: WrappedRequest<OpenExternalResponseData>) => {
        if (req.data && req.data.error) {
          const error = new Error();
          error.name = req.data.error.name;
          error.message = req.data.error.message;
          error.stack = req.data.error.stack;

          reject(error);
        } else {
          resolve();
        }
      });

      respond<OpenExternalData>(target, {
        id,
        data: { url, options },
        type: BackOut.OPEN_EXTERNAL,
      });
    });
  };
}

/** Create an array with all games in the game manager. */
async function allGames(): Promise<Game[]> {
  return await GameManager.findGames();
}

function parseWrappedRequest(data: string | Buffer | ArrayBuffer | Buffer[]): [WrappedRequest<any>, undefined] | [undefined, Error] {
  // Parse data into string
  let str: string | undefined;
  if (typeof data === 'string') { // String
    str = data;
  } else if (typeof data === 'object') {
    if (Buffer.isBuffer(data)) { // Buffer
      str = data.toString();
    } else if (Array.isArray(data)) { // Buffer[]
      str = Buffer.concat(data).toString();
    } else { // ArrayBuffer
      str = Buffer.from(data).toString();
    }
  }

  if (typeof str !== 'string') {
    return [undefined, new Error('Failed to parse WrappedRequest. Failed to convert "data" into a string.')];
  }

  // Parse data string into object
  let json: Record<string, any>;
  try {
    json = JSON.parse(str);
  } catch (error) {
    if (typeof error === 'object' && 'message' in error) {
      error.message = 'Failed to parse WrappedRequest. Failed to convert "data" into an object.\n' + Coerce.str(error.message);
    }
    return [undefined, error];
  }

  // Create result (and ensure the types except for data)
  const result: WrappedRequest<any> = {
    id: Coerce.str(json.id),
    type: Coerce.num(json.type),
    data: json.data, // @TODO The types of the data should also be enforced somehow (probably really annoying to get right)
  };

  return [result, undefined];
}
