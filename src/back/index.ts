import { ILogEntry, LogLevel } from '@shared/Log/interface';
import { Theme } from '@shared/ThemeFile';
import {
  createErrorProxy, deepCopy,
  removeFileExtension,
  stringifyArray
} from '@shared/Util';
import * as os from 'os';
import { BackIn, BackInit, BackInitArgs, BackOut, BackResParams, ComponentState, ComponentStatus, DownloadDetails } from '@shared/back/types';
import { LoadedCuration } from '@shared/curate/types';
import { getContentFolderByKey } from '@shared/curate/util';
import { ILogoSet, LogoSet } from '@shared/extensions/interfaces';
import { IBackProcessInfo, RecursivePartial } from '@shared/interfaces';
import { LangFileContent, getDefaultLocalization } from '@shared/lang';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { defaultPreferencesData } from '@shared/preferences/util';
import { validateSemiUUID } from '@shared/utils/uuid';
import { VERSION } from '@shared/version';
import * as child_process from 'child_process';
import { EventEmitter } from 'events';
import * as flashpoint from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import * as http from 'http';
import * as mime from 'mime';
import { Progress, extractFull } from 'node-7z';
import * as path from 'path';
import 'reflect-metadata';
import { genCurationWarnings, loadCurationFolder } from './curate/util';
// Required for the DB Models to function
import {
  CURATIONS_FOLDER_EXPORTED,
  CURATIONS_FOLDER_EXTRACTING,
  CURATIONS_FOLDER_TEMP,
  CURATIONS_FOLDER_WORKING, CURATION_META_FILENAMES
} from '@shared/constants';
import axios from 'axios';
import { FlashpointArchive, enableDebug, loggerSusbcribe } from '@fparchive/flashpoint-archive';
import { Tail } from 'tail';
import { ConfigFile } from './ConfigFile';
import { loadExecMappingsFile } from './Execs';
import { ExtConfigFile } from './ExtConfigFile';
import { InstancedAbortController } from './InstancedAbortController';
import { ManagedChildProcess } from './ManagedChildProcess';
import { PlaylistFile } from './PlaylistFile';
import { ServicesFile } from './ServicesFile';
import { SocketServer } from './SocketServer';
import { newThemeWatcher } from './Themes';
import { CONFIG_FILENAME, DISCORD_LINK, EXT_CONFIG_FILENAME, PREFERENCES_FILENAME, SERVICES_SOURCE, WIKI_AV_TROUBLESHOOTING } from './constants';
import { loadCurationIndexImage } from './curate/parse';
import { readCurationMeta } from './curate/read';
import { onFileServerRequestCurationFileFactory, onFileServerRequestPostCuration } from './curate/util';
import { downloadGameData } from './download';
import { ApiEmitter } from './extensions/ApiEmitter';
import { ExtensionService } from './extensions/ExtensionService';
import {
  FPLNodeModuleFactory,
  INodeModuleFactory,
  installNodeInterceptor,
  registerInterceptor
} from './extensions/NodeInterceptor';
import { Command, RegisteredMiddleware } from './extensions/types';
import { SystemEnvMiddleware } from './middleware';
import { registerRequestCallbacks } from './responses';
import { genContentTree } from './rust';
import { BackState, ImageDownloadItem } from './types';
import { EventQueue } from './util/EventQueue';
import { FileServer, serveFile } from './util/FileServer';
import { FolderWatcher } from './util/FolderWatcher';
import { LogFile } from './util/LogFile';
import { logFactory } from './util/logging';
import { createContainer, exit, getMacPATH, runService } from './util/misc';
import { uuid } from './util/uuid';
import { onDidInstallGameData, onDidRemoveGame, onDidRemovePlaylistGame, onDidUninstallGameData, onDidUpdateGame, onDidUpdatePlaylist, onDidUpdatePlaylistGame, onServiceChange, onWillImportCuration, onWillUninstallGameData } from './util/events';
import { dispose } from './util/lifecycle';
import { formatString } from '@shared/utils/StringFormatter';
import { awaitDialog } from './util/dialog';

export const VERBOSE = {
  enabled: false
};

export const fpDatabase = new FlashpointArchive();

const DEFAULT_LOGO_PATH = 'window/images/Logos/404.png';

// Make sure the process.send function is available
type Required<T> = T extends undefined ? never : T;
const send: Required<typeof process.send> = process.send
  ? process.send.bind(process)
  : (() => { throw new Error('process.send is undefined.'); });

const CONCURRENT_IMAGE_DOWNLOADS = 6;

const state: BackState = {
  readyForInit: false,
  ignoreQuit: false,
  runInit: false,
  isExit: false,
  isDev: false,
  verbose: false,
  logFile: createErrorProxy('logFile'),
  socketServer: new SocketServer(),
  fileServer: new FileServer(),
  fileServerPort: -1,
  fileServerDownloads: {
    queue: [],
    current: [],
  },
  preferences: createErrorProxy('preferences'),
  config: createErrorProxy('config'),
  extConfig: createErrorProxy('extConfig'),
  configFolder: createErrorProxy('configFolder'),
  exePath: createErrorProxy('exePath'),
  localeCode: createErrorProxy('countryCode'),
  version: createErrorProxy('version'),
  versionStr: createErrorProxy('versionStr'),
  suggestions: createErrorProxy('suggestions'),
  acceptRemote: createErrorProxy('acceptRemote'),
  customVersion: undefined,
  messageQueue: [],
  isHandling: false,
  init: {
    [BackInit.SERVICES]: false,
    [BackInit.DATABASE]: false,
    [BackInit.PLAYLISTS]: false,
    [BackInit.CURATE]: false,
    [BackInit.EXEC_MAPPINGS]: false,
    [BackInit.EXTENSIONS]: false
  },
  initEmitter: new EventEmitter() as any,
  queries: {},
  log: [],
  serviceInfo: undefined,
  services: new Map<string, ManagedChildProcess>(),
  languageWatcher: new FolderWatcher(),
  languageQueue: new EventQueue(),
  languages: [],
  languageContainer: getDefaultLocalization(), // Cache of the latest lang container - used by back when it needs lang strings
  themeState: {
    watchers: [],
    queue: new EventQueue()
  },
  playlists: [],
  execMappings: [],
  lastLinkedCurationKey: '',
  moduleInterceptor: {
    alternatives: [],
    factories: new Map<string, INodeModuleFactory>(),
  },
  apiEmitters: {
    onDidInit: new ApiEmitter<void>(),
    onDidConnect: new ApiEmitter<void>(),
    onLog: new ApiEmitter<flashpoint.ILogEntry>(),
    games: {
      onWillLaunchGame: new ApiEmitter<flashpoint.GameLaunchInfo>(),
      onWillLaunchAddApp: new ApiEmitter<flashpoint.AdditionalApp>(),
      onWillLaunchCurationGame: new ApiEmitter<flashpoint.GameLaunchInfo>(),
      onWillLaunchCurationAddApp: new ApiEmitter<flashpoint.AdditionalApp>(),
      onWillUninstallGameData: onWillUninstallGameData,
      onDidLaunchGame: new ApiEmitter<flashpoint.Game>(),
      onDidLaunchAddApp: new ApiEmitter<flashpoint.AdditionalApp>(),
      onDidLaunchCurationGame: new ApiEmitter<flashpoint.Game>(),
      onDidLaunchCurationAddApp: new ApiEmitter<flashpoint.AdditionalApp>(),
      onDidUpdateGame: onDidUpdateGame,
      onDidRemoveGame: onDidRemoveGame,
      onDidUpdatePlaylist: onDidUpdatePlaylist,
      onDidUpdatePlaylistGame: onDidUpdatePlaylistGame,
      onDidRemovePlaylistGame: onDidRemovePlaylistGame,
      onDidInstallGameData: onDidInstallGameData,
      onDidUninstallGameData: onDidUninstallGameData,
      onWillImportCuration: onWillImportCuration,
    },
    curations: {
      onDidCurationListChange: new ApiEmitter(),
      onDidCurationChange: new ApiEmitter(),
      onWillGenCurationWarnings: new ApiEmitter()
    },
    gameData: {
      onDidImportGameData: new ApiEmitter<flashpoint.GameData>(),
    },
    services: {
      onServiceNew: new ApiEmitter<flashpoint.ManagedChildProcess>(),
      onServiceRemove: new ApiEmitter<flashpoint.ManagedChildProcess>(),
      onServiceChange: onServiceChange,
    },
    ext: {
      onExtConfigChange: new ApiEmitter()
    }
  },
  status: {
    devConsole: ''
  },
  registry: {
    commands: new Map<string, Command>(),
    logoSets: new Map<string, LogoSet>(),
    themes: new Map<string, Theme>(),
    middlewares: new Map<string, RegisteredMiddleware>(),
  },
  extensionsService: createErrorProxy('extensionsService'),
  sevenZipPath: '',
  loadedCurations: [],
  platformAppPaths: {},
  writeLocks: 0,
  prefsQueue: new EventQueue(),
  componentStatuses: [],
  newDialogEvents: new EventEmitter(),
  resolveDialogEvents: new EventEmitter(),
  downloadController: new InstancedAbortController(),
  shortcuts: {},
};

main();

async function main() {
  registerRequestCallbacks(state, initialize);
  state.fileServer.registerRequestHandler('themes', onFileServerRequestThemes);
  state.fileServer.registerRequestHandler('images', onFileServerRequestImages);
  state.fileServer.registerRequestHandler('logos', onFileServerRequestLogos);
  state.fileServer.registerRequestHandler('exticons', onFileServerRequestExtIcons);
  state.fileServer.registerRequestHandler('extdata', onFileServerRequestExtData);
  state.fileServer.registerRequestHandler('credits.json', (p, u, req, res) => serveFile(req, res, path.join(state.config.flashpointPath, state.preferences.jsonFolderPath, 'credits.json')));
  state.fileServer.registerRequestHandler('curations', onFileServerRequestCurationFileFactory(getCurationFilePath, onUpdateCurationFile, onRemoveCurationFile));
  state.fileServer.registerRequestHandler('curation', (p, u, req, res) => onFileServerRequestPostCuration(p, u, req, res, path.join(state.config.flashpointPath, CURATIONS_FOLDER_TEMP), loadCurationArchive));

  // Database manipulation
  // Anything that reads from the database and then writes to it (or a file) should go in this queue!
  // (Since it can cause rare race conditions that corrupts data permanently)
  state.socketServer.addQueue([
    // Settings
    BackIn.UPDATE_CONFIG,
    BackIn.UPDATE_PREFERENCES,
    // Game
    BackIn.SAVE_GAME,
    BackIn.DELETE_GAME,
    BackIn.DUPLICATE_GAME,
    BackIn.EXPORT_GAME,
    // Playlist
    BackIn.DUPLICATE_PLAYLIST,
    BackIn.IMPORT_PLAYLIST,
    BackIn.EXPORT_PLAYLIST,
    BackIn.GET_PLAYLISTS,
    BackIn.GET_PLAYLIST,
    BackIn.SAVE_PLAYLIST,
    BackIn.DELETE_PLAYLIST,
    BackIn.DELETE_ALL_PLAYLISTS,
    BackIn.ADD_PLAYLIST_GAME,
    BackIn.SAVE_PLAYLIST_GAME,
    BackIn.DELETE_PLAYLIST_GAME,
    BackIn.SAVE_LEGACY_PLATFORM,
    // Tags
    BackIn.GET_OR_CREATE_TAG,
    BackIn.SAVE_TAG,
    BackIn.DELETE_TAG,
    BackIn.MERGE_TAGS,
    BackIn.EXPORT_TAGS,
    BackIn.IMPORT_TAGS,
    // Tag Categories
    BackIn.SAVE_TAG_CATEGORY,
    BackIn.GET_TAG_CATEGORY_BY_ID,
    BackIn.DELETE_TAG_CATEGORY,
    // Curation
    BackIn.IMPORT_CURATION,
    BackIn.LAUNCH_CURATION,
    BackIn.LAUNCH_CURATION_ADDAPP,
    BackIn.CURATE_SYNC_CURATIONS,
    // ?
    BackIn.SYNC_GAME_METADATA,
    BackIn.SYNC_TAGGED,
    // Meta Edits
    BackIn.EXPORT_META_EDIT,
    BackIn.IMPORT_META_EDITS,
  ]);

  process.once('message', prepForInit);
  process.on('disconnect', () => { exit(state); }); // (Exit when the main process does)
}

async function prepForInit(message: any): Promise<void> {
  console.log(`--- Build Version: ${VERSION} ---`);
  console.log('Back - Initializing...');

  const content: BackInitArgs = JSON.parse(message);
  state.isDev = content.isDev;
  state.verbose = content.verbose;
  state.configFolder = content.configFolder;
  state.localeCode = content.localeCode;
  state.exePath = content.exePath;
  state.version = content.version;
  state.versionStr = `${content.version} ${content.isDev ? 'DEV' : ''}`;
  state.acceptRemote = content.acceptRemote;
  state.logFile = new LogFile(
    state.isDev ?
      path.join(process.cwd(), 'launcher.log')
      : path.join(process.platform == 'darwin' ? state.configFolder : path.dirname(content.exePath), 'launcher.log'));

  const addLog = (entry: ILogEntry): number => { return state.log.push(entry) - 1; };
  global.log = {
    trace: logFactory(LogLevel.TRACE, state.socketServer, addLog, state.logFile, state.verbose, state.apiEmitters.onLog),
    debug: logFactory(LogLevel.DEBUG, state.socketServer, addLog, state.logFile, state.verbose, state.apiEmitters.onLog),
    info:  logFactory(LogLevel.INFO,  state.socketServer, addLog, state.logFile, state.verbose, state.apiEmitters.onLog),
    warn:  logFactory(LogLevel.WARN,  state.socketServer, addLog, state.logFile, state.verbose, state.apiEmitters.onLog),
    error: logFactory(LogLevel.ERROR, state.socketServer, addLog, state.logFile, state.verbose, state.apiEmitters.onLog)
  };

  log.info('Launcher', `Build Version: ${VERSION}`);

  state.socketServer.secret = content.secret;

  log.info('Launcher', `Starting Flashpoint Launcher ${state.versionStr}`);

  // Set SevenZip binary path
  {
    const basePath = state.isDev ? process.cwd() : path.dirname(state.exePath);
    switch (process.platform) {
      case 'darwin': state.sevenZipPath = path.join(basePath, 'extern/7zip-bin/mac', '7za'); break;
      case 'win32':  state.sevenZipPath = path.join(basePath, 'extern/7zip-bin/win', process.arch, '7za'); break;
      case 'linux':  state.sevenZipPath = path.join(basePath, 'extern/7zip-bin/linux', process.arch, '7za'); break;
      default:       state.sevenZipPath = '7za'; break;
    }
  }

  // Read configs & preferences
  // readOrCreateFile can throw errors, let's wrap it in try-catch each time.
  try {
    state.config = await ConfigFile.readOrCreateFile(path.join(state.configFolder, CONFIG_FILENAME));
  } catch (e) {
    console.log(e);
    // Fatal, quit.
    send({quit: true, errorMessage: 'Invalid config.json!'});
    return;
  }

  console.log('Back - Loaded Config');

  if (process.platform === 'darwin') {
    process.chdir(state.configFolder);
  }

  const loadPrefs = async (): Promise<void> => {
    // @TODO Figure out why async loading isn't always working?
    const prefsFilePath = path.join(state.config.flashpointPath, PREFERENCES_FILENAME);
    try {
      state.preferences = await PreferencesFile.readOrCreateFile(prefsFilePath, state, state.config.flashpointPath);
    } catch (e) {
      console.log('Failed to load preferences, prompting for defaults');
      const res = await new Promise<number>((resolve) => {
        process.once('message', (msg) => {
          resolve(Number(msg));
        });
        send({preferencesRefresh: true});
      });
      console.log('Response - ' + res);

      if (res === 1) {
        throw 'User cancelled.';
      }

      // Check for custom default file
      const overridePath = path.join(state.config.flashpointPath, '.preferences.defaults.json');
      console.log('Checking for prefs override at ' + overridePath);
      try {
        await fs.promises.copyFile(overridePath, prefsFilePath);
        console.log('Copied default preferences (override)');
        // File copied, try loading again
        return loadPrefs();
      } catch (err) {
        console.log(err);
        // Failed to copy overrides, use defaults
        const defaultPrefs = deepCopy(defaultPreferencesData);
        state.preferences = defaultPrefs;
        try {
          await PreferencesFile.saveFile(prefsFilePath, state.preferences, state);
          console.log('Copied default preferences');
          return loadPrefs();
        } catch (err) {
          send({quit: true, errorMessage: 'Failed to save default preferences file? Quitting...'});
          return;
        }
      }
    }
  };

  try {
    await loadPrefs();
  } catch (err: any) {
    send({quit: true, errorMessage: err.toString()});
    return;
  }

  VERBOSE.enabled = state.preferences.enableVerboseLogging;

  console.log('Back - Loaded Preferences');

  // Hook into stdout for logging
  const realWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((string: any, encodingOrCb: any, cb: any) => {
    if (typeof encodingOrCb === 'function') {
      realWrite(string, encodingOrCb, cb);
    } else {
      realWrite(string, cb);
    }

    if (typeof string !== 'string') {
      const enc = typeof encodingOrCb === 'function' ? encodingOrCb : undefined;
      const decodder = new TextDecoder(enc);
      string = decodder.decode(string);
    }

    log.debug('Main', string.trim());
  }) as any;

  // Ensure all directory structures exist
  try {
    await fs.ensureDir(path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath));
    await fs.ensureDir(path.join(state.config.flashpointPath, state.preferences.extensionsPath));
    await fs.ensureDir(path.join(state.config.flashpointPath, state.preferences.jsonFolderPath));
    await fs.ensureDir(path.join(state.config.flashpointPath, state.preferences.logoFolderPath));
    await fs.ensureDir(path.join(state.config.flashpointPath, state.preferences.imageFolderPath));
    await fs.ensureDir(path.join(state.config.flashpointPath, state.preferences.themeFolderPath));
    await fs.ensureDir(path.join(state.config.flashpointPath, state.preferences.logoSetsFolderPath));
    await fs.ensureDir(path.join(state.config.flashpointPath, state.preferences.metaEditsFolderPath));
    await fs.ensureDir(path.join(state.config.flashpointPath, state.preferences.playlistFolderPath));
    await fs.ensureDir(path.join(state.config.flashpointPath, CURATIONS_FOLDER_EXTRACTING));
    await fs.ensureDir(path.join(state.config.flashpointPath, CURATIONS_FOLDER_TEMP));
    await fs.ensureDir(path.join(state.config.flashpointPath, CURATIONS_FOLDER_WORKING));
    await fs.ensureDir(path.join(state.config.flashpointPath, CURATIONS_FOLDER_EXPORTED));
  } catch (err: any) {
    console.error('Failed to create a required directory - ' + err.toString());
  }

  // Check for custom version to report
  const versionFilePath = state.isDev ? path.join(process.cwd(), 'version.txt') : path.join(state.config.flashpointPath, 'version.txt');
  const customVersion = await fs.access(versionFilePath, fs.constants.F_OK)
  .then(async () => {
    return fs.readFile(versionFilePath, 'utf8');
  })
  .catch(() => { /** File doesn't exist */ });
  if (customVersion) {
    state.customVersion = customVersion;
    log.info('Launcher', `Data Version Detected: ${state.customVersion}`);
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
    for (const filename of state.languageWatcher.filenames) {
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

        state.socketServer.broadcast(BackOut.LANGUAGE_LIST_CHANGE, state.languages);

        if (lang.code === state.preferences.currentLanguage ||
            lang.code === state.localeCode ||
            lang.code === state.preferences.fallbackLanguage) {
          state.languageContainer = createContainer(
            state.languages,
            state.preferences.currentLanguage,
            state.localeCode,
            state.preferences.fallbackLanguage
          );
          state.socketServer.broadcast(BackOut.LANGUAGE_CHANGE, state.languageContainer);
        }
      });
    }
  });
  state.languageWatcher.on('error', console.error);
  // On mac, exePath is Flashpoint.app/Contents/MacOS/flashpoint, and lang is at Flashpoint.app/Contents/lang.
  const langFolder = path.join(state.isDev ? process.cwd() : process.platform == 'darwin' ? path.resolve(path.dirname(state.exePath), '..') : path.dirname(state.exePath), 'lang');
  fs.stat(langFolder, (error) => {
    if (!error) { state.languageWatcher.watch(langFolder); }
    else {
      log.info('Back', (typeof error.toString === 'function') ? error.toString() : (error + ''));
      if (error.code === 'ENOENT') {
        log.info('Back', `Failed to watch language folder. Folder does not exist (Path: "${langFolder}")`);
      } else {
        log.info('Back', (typeof error.toString === 'function') ? error.toString() : (error + ''));
      }
    }
  });

  console.log('Back - Initialized Languages');

  // Load Playlists

  const playlistDir = path.join(state.config.flashpointPath, state.preferences.playlistFolderPath);
  const playlistFiles = await fs.promises.readdir(playlistDir, { withFileTypes: true });
  for (const file of playlistFiles.filter(f => f.isFile() && f.name.endsWith('.json'))) {
    try {
      const playlist = await PlaylistFile.readFile(path.join(playlistDir, file.name));
      // Check for ID collision
      const collisionIdx = state.playlists.findIndex(p => p.id === playlist.id);
      if (collisionIdx > -1) {
        const oldId = playlist.id;
        playlist.id = uuid();
        log.warn('Launcher', `Playlist ID Collision - Renamed ID for ${playlist.title} (${oldId}) to ${playlist.id}`);
      }
      state.playlists.push(playlist);
    } catch (err) {
      log.error('Launcher', `Failed to load Playlist ${file.name}, ERROR:\n${err}`);
    }
  }
  console.log('Back - Parsed Playlists');

  // Load Extensions

  await fs.ensureDir(path.join(state.config.flashpointPath, state.preferences.extensionsPath));
  state.extensionsService = new ExtensionService(state.config, path.join(state.config.flashpointPath, state.preferences.extensionsPath), state.isDev);
  await state.extensionsService.installedExtensionsReady.wait();

  console.log('Back - Parsed Extensions');

  // Init themes
  const dataThemeFolder = path.join(state.config.flashpointPath, state.preferences.themeFolderPath);
  try {
    await fs.ensureDir(dataThemeFolder);
    await fs.promises.readdir(dataThemeFolder, { withFileTypes: true })
    .then(async (files) => {
      for (const file of files) {
        if (file.isDirectory()) {
          await newThemeWatcher(`${file.name}`, dataThemeFolder, path.join(dataThemeFolder, file.name), state.themeState, state.registry, state.socketServer);
        }
      }
    });
  } catch (error: any) {
    log.error('Launcher', `Error loading default Themes folder\n${error.message}`);
  }
  const themeContributions = await state.extensionsService.getContributions('themes');
  for (const c of themeContributions) {
    for (const theme of c.value) {
      const ext = await state.extensionsService.getExtension(c.extId);
      if (ext) {
        const realPath = path.join(ext.extensionPath, theme.path);
        try {
          await newThemeWatcher(theme.id, ext.extensionPath, realPath, state.themeState, state.registry, state.socketServer, ext.manifest.displayName || ext.manifest.name, theme.logoSet);
        } catch (error) {
          log.error('Extensions', `[${ext.manifest.displayName || ext.manifest.name}] Error loading theme "${theme.id}"\n${error}`);
        }
      }
    }
  }

  console.log('Back - Initialized Themes');

  const sysEnvMiddleware = new SystemEnvMiddleware();
  state.registry.middlewares.set(sysEnvMiddleware.id, sysEnvMiddleware);

  console.log('Back - Registered System Middleware');

  // Find the first available port in the range
  state.fileServerPort = await new Promise(resolve => {
    const minPort = state.config.imagesPortMin;
    const maxPort = state.config.imagesPortMax;

    let port = minPort - 1;
    state.fileServer.server.once('listening', onceListening);
    state.fileServer.server.on('error', onError);
    tryListen();

    function onceListening() {
      console.log('Back - Opened File Server');
      done(undefined);
    }
    function onError(error: Error) {
      if ((error as any).code === 'EADDRINUSE') {
        tryListen();
      } else {
        done(error);
      }
    }
    function tryListen() {
      if (port++ < maxPort) {
        const hostname = state.acceptRemote ? undefined : 'localhost';
        state.fileServer.server.listen(port, hostname);
      } else {
        done(new Error(`All attempted ports are already in use (Ports: ${minPort} - ${maxPort}).`));
      }
    }
    function done(error: Error | undefined) {
      state.fileServer.server.off('listening', onceListening);
      state.fileServer.server.off('error', onError);
      if (error) {
        log.info('Back', 'Failed to open HTTP server.\n' + error);
        resolve(-1);
      } else {
        resolve(port);
      }
    }
  });

  const hostname = state.acceptRemote ? undefined : 'localhost';

  // Find the first available port in the range
  await state.socketServer.listen(state.config.backPortMin, state.config.backPortMax, hostname);

  // Exit if it failed to open the server
  if (state.socketServer.port < 0) {
    console.log('Back - Failed to open Socket Server, Exiting...');
    setImmediate(exit);
    return;
  }

  console.log('Back - Opened Websocket');

  // Set up general Main message handler now
  process.on('message', onProcessMessage);
  state.readyForInit = true;

  // Respond
  send({port: state.socketServer.port, config: state.config, prefs: state.preferences}, () => {
    console.log('Back - Ready for Init');
    state.apiEmitters.onDidInit.fire();
  });
}

async function onProcessMessage(message: any): Promise<void> {
  console.warn('Back - Received Message from Main, not handled - ' + message);
}

async function whenReady(): Promise<void> {
  return new Promise<void>((resolve) => {
    const wait = () => {
      if (state.readyForInit) {
        resolve();
      } else {
        setTimeout(wait, 1000);
      }
    };
    wait();
  });
}

async function initialize() {
  await whenReady();

  if (process.platform === 'darwin') {
    state.pathVar = await getMacPATH();
    console.log('Back - Started Mac PATH-reading');
  }

  try {
    const [extConf] = await (Promise.all([
      ExtConfigFile.readOrCreateFile(path.join(state.config.flashpointPath, EXT_CONFIG_FILENAME))
    ]));
    state.extConfig = extConf;
  } catch (e) {
    console.log(e);
    // Non-fatal, don't quit.
  }

  console.log('Back - Loaded Extension Config');

  // Register middleware

  state.socketServer.registerMiddlewareBackRes((ctx, next) => {
    // Fire events for adding / removal of curations
    if (ctx.type === BackOut.CURATE_LIST_CHANGE) {
      const args = ctx.args as BackResParams<typeof ctx.type>;
      state.apiEmitters.curations.onDidCurationListChange.fire( {
        added: args[0],
        removed: args[1]
      });
    }
    return next();
  });

  // Create Game Data Directory and clean up temp files
  const fullDataPacksFolderPath = path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath);
  try {
    fs.promises.readdir(fullDataPacksFolderPath)
    .then((files) => {
      for (const f of files) {
        if (f.endsWith('.temp')) {
          fs.promises.unlink(path.join(fullDataPacksFolderPath, f));
        }
      }
    });
  } catch (error) {
    console.log('Failed to create default Data Packs folder!');
    // Non-fatal, don't quit.
  }

  if (state.preferences.enableVerboseLogging) {
    loggerSusbcribe((err, line) => {
      if (err) {
        log.error('Rust Library', 'Logging error - ' + err);
      } else {
        try {
          const output = line.toString().trim();
          if (output) {
            log.debug('Rust Library', line);
          }
        } catch {
          log.error('Rust Library', 'Failed to convert output to string');
        }
      }
    });
    enableDebug();
  }

  const databasePath = path.resolve(state.config.flashpointPath, 'Data', 'flashpoint.sqlite');
  try {
    fpDatabase.loadDatabase(databasePath);
  } catch (e) {
    state.socketServer.broadcast(BackOut.OPEN_ALERT, 'Failed to open database: ' + e);
  }

  // Populate unique values
  state.suggestions = {
    tags: [],
    playMode: await fpDatabase.findAllGamePlayModes(),
    platforms: (await fpDatabase.findAllPlatforms()).map(p => p.name),
    status: await fpDatabase.findAllGameStatuses(),
    applicationPath: await fpDatabase.findAllGameApplicationPaths(),
    library: await fpDatabase.findAllGameLibraries(),
  };

  // Check for Flashpoint Manager Updates

  const cwd = path.join(state.config.flashpointPath, 'Manager');
  const fpmPath = 'fpm.exe';
  if (fs.existsSync(path.join(cwd, fpmPath))) {
    // FPM exists, make sure path is correct, then check for updates
    state.componentStatuses = await new Promise<ComponentStatus[]>((resolve, reject) => {
      child_process.execFile(fpmPath, ['list', 'verbose'], { cwd }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          const statuses = [];
          for (const line of stdout.split('\n').filter(line => line !== '')) {
            try {
              let state: ComponentState;
              // ! comp-id (Comp Name)
              const nameIdx = line.indexOf('(');
              const id = line.substring(1, nameIdx - 1).trim();
              const name = line.substring(nameIdx + 1, line.length - 2);
              switch (line.charAt(0)) {
                case '*':
                  state = ComponentState.UP_TO_DATE;
                  break;
                case '!':
                  state = ComponentState.NEEDS_UPDATE;
                  break;
                default:
                  state = ComponentState.UNINSTALLED;
                  break;
              }
              // Ignore updates for core-database
              if (id === 'core-database' && state === ComponentState.NEEDS_UPDATE) {
                state = ComponentState.UP_TO_DATE;
              }
              const status: ComponentStatus = {
                id,
                name,
                state
              };
              statuses.push(status);
              log.debug('Launcher', `Parsed: ${JSON.stringify({...status, state: ComponentState[status.state]})}`);
            } catch (err) {
              log.error('Launcher', `Failed to parse component entry: ${line}\nERROR: ${err}`);
            }
          }
          resolve(statuses);
        }
      });
    })
    .then((statuses) => {
      const updatesReady = statuses.filter(s => s.state === ComponentState.NEEDS_UPDATE);
      if (updatesReady.length > 0) {
        log.info('Launcher', `Found ${updatesReady.length} component updates.\n${updatesReady.map(s => s.id).join('\n')}`);
      } else {
        log.info('Launcher', 'All components up to update');
      }
      return statuses;
    })
    .catch((error) => {
      log.error('Launcher', `Error checking for component updates: ${error}`);
      return [];
    });
  } else {
    log.info('Launcher', 'Flashpoint Manager not found, skipping component update check');
  }

  console.log('Back - Checked Component Updates');

  const loadServices = async () => {
    // Init services
    try {
      state.serviceInfo = await ServicesFile.readFile(
        path.join(state.config.flashpointPath, state.preferences.jsonFolderPath),
        state.config,
        error => { log.info(SERVICES_SOURCE, error.toString()); }
      );
    } catch (error) {
      console.log('Error loading services - ' + error);
    }
    if (state.serviceInfo) {
      // Run start commands
      for (let i = 0; i < state.serviceInfo.start.length; i++) {
        await execProcess(state.serviceInfo.start[i]);
      }
      // Run processes
      if (state.serviceInfo.server.length > 0) {
        let chosenServer = state.serviceInfo.server.find(i => i.name === state.preferences.server);
        if (!chosenServer) {
          chosenServer = state.serviceInfo.server[0];
        }
        runService(state, 'server', 'Server', state.config.flashpointPath, { detached: !chosenServer.kill, noshell: !!chosenServer.kill }, chosenServer);
      }
      // Start daemons
      for (let i = 0; i < state.serviceInfo.daemon.length; i++) {
        const service = state.serviceInfo.daemon[i];
        const id = 'daemon_' + i;
        runService(state, id, service.name || id, state.config.flashpointPath, { detached: !service.kill, noshell: !!service.kill }, service);
      }
      // Start file watchers
      for (let i = 0; i < state.serviceInfo.watch.length; i++) {
        const filePath = state.serviceInfo.watch[i];
        try {
          // Windows requires fs.watchFile to properly update
          const tail = new Tail(filePath, { follow: true, useWatchFile: true });
          tail.on('line', (data) => {
            log.info('Log Watcher', data);
          });
          tail.on('error', (error) => {
            log.info('Log Watcher', `Error while watching file "${filePath}" - ${error}`);
          });
          log.info('Log Watcher', `Watching file "${filePath}"`);
        } catch (error) {
          log.info('Log Watcher', `Failed to watch file "${filePath}" - ${error}`);
        }
      }
    }
    state.init[BackInit.SERVICES] = true;
    state.initEmitter.emit(BackInit.SERVICES);

    console.log('Back - Initialized Services');
  };

  // Check if we need to delay service startup because of antivirus
  let delayServices = false;
  if (!state.preferences.singleUsePrompt.badAntiVirus && os.platform() === 'win32') {
    try {
      const output = child_process.execSync('powershell.exe -Command "Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct | Format-Wide -Property displayName"').toString().trim();
      if (output.toLowerCase().includes('avast antivirus') || output.toLowerCase().includes('avg antivirus')) {
        console.log('Back - Delaying Services until Antivirus warning resolved');
        delayServices = true;
        // Add a listener so we can open the prompt when the user connects
        const disposable = state.apiEmitters.onDidConnect.event(async () => {
          // Frontend connected
          console.log('Back - Opening Antivirus warning on connected client');
          let stayOpen = true;
          while (stayOpen) {
            const msg = formatString(state.languageContainer.dialog.badAntiVirus, output.trim()) as string;
            const client = state.socketServer.clients.clients[state.socketServer.clients.clients.length - 1]; // Latest client
            const func = state.socketServer.showMessageBoxBack(state, client);
            const dialogId = await func({
              message: msg,
              largeMessage: true,
              buttons: [state.languageContainer.dialog.openWiki, state.languageContainer.dialog.openDiscord, state.languageContainer.dialog.doNotShowAgain],
            });
            const res = await awaitDialog(state, dialogId);
            switch (res.buttonIdx) {
              case 0:
                // wiki
                child_process.execSync(`start ${WIKI_AV_TROUBLESHOOTING}`);
                break;
              case 1:
                // discord
                child_process.execSync(`start ${DISCORD_LINK}`);
                break;
              case 2:
                console.log('Back - Antivirus warning has been resolved, continuing with services loading...');
                stayOpen = false;
                state.preferences.singleUsePrompt.badAntiVirus = true;
                PreferencesFile.saveFile(path.join(state.config.flashpointPath, PREFERENCES_FILENAME), state.preferences, state);
                state.socketServer.broadcast(BackOut.UPDATE_PREFERENCES_RESPONSE, state.preferences);
                loadServices();
                break;
              default:
                stayOpen = false;
                break;
            }
          }

          dispose(disposable);
        });
      }
    } catch {
      // Failed to determine AV, ignore
      delayServices = false;
    }
  }

  if (!delayServices) {
    await loadServices();
  } else {
    // Ugly hack to prevent splash screen getting stuck while services is delayed (dialog should prevent issues anyway)
    state.init[BackInit.SERVICES] = true;
    state.initEmitter.emit(BackInit.SERVICES);
  }

  // Load Exec Mappings
  loadExecMappingsFile(path.join(state.config.flashpointPath, state.preferences.jsonFolderPath), content => log.info('Launcher', content))
  .then(data => {
    state.execMappings = data;
  })
  .catch(error => {
    log.info('Launcher', `Failed to load exec mappings file. Ignore if on Windows. - ${error}`);
  })
  .finally(() => {
    state.init[BackInit.EXEC_MAPPINGS] = true;
    state.initEmitter.emit(BackInit.EXEC_MAPPINGS);
  });

  console.log('Back - Loaded Exec Mappings');

  state.init[BackInit.DATABASE] = true;
  state.initEmitter.emit(BackInit.DATABASE);

  console.log('Back - Initialized Database');

  // Load curations

  // Go through all curation folders
  const rootPath = path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_WORKING);
  fs.promises.readdir(rootPath)
  .then(async (folders) => {
    for (const folderName of folders) {
      await loadCurationFolder(rootPath, folderName, state);
    }
  })
  .then(() => {
    console.log('Back - Initialized Curations');
    state.init[BackInit.CURATE] = true;
    state.initEmitter.emit(BackInit.CURATE);
  })
  .catch((error: any) => {
    log.error('Launcher', `Failed to load curations\n${error.toString()}`);
    exit(state);
  });

  // Init extensions
  const addExtLogFactory = (extId: string) => (entry: ILogEntry) => {
    state.extensionsService.logExtension(extId, entry);
  };

  // Create module interceptor
  registerInterceptor(new FPLNodeModuleFactory(
    await state.extensionsService.getExtensionPathIndex(),
    addExtLogFactory,
    state.versionStr,
    state,
  ),
  state.moduleInterceptor);
  installNodeInterceptor(state.moduleInterceptor)
  .then(async () => {
    // Load each extension
    await state.extensionsService.getExtensions()
    .then(async (exts) => {
      // Set any ext config defaults
      for (const contrib of (await state.extensionsService.getContributions('configuration'))) {
        for (const extConfig of contrib.value) {
          for (const key in extConfig.properties) {
            // Value not set, use default
            if (!(key in state.extConfig)) {
              state.extConfig[key] = extConfig.properties[key].default;
            } else {
              const prop = extConfig.properties[key];
              // If type is different, reset it
              if (typeof state.extConfig[key] !== prop.type) {
                log.debug('Extensions', `Invalid value type for "${key}", resetting to default`);
                state.extConfig[key] = prop.default;
              }
              if (prop.enum.length > 0 && !(prop.enum.includes(state.extConfig[key]))) {
                log.debug('Extensions', `Invalid value for "${key}", not in enum, resetting to default`);
                state.extConfig[key] = prop.default;
              }
            }
          }
        }
      }

      // Init System Logo Sets
      const dataLogoSetsFolder = path.join(state.config.flashpointPath, state.preferences.logoSetsFolderPath);
      try {
        await fs.ensureDir(dataLogoSetsFolder);
        await fs.promises.readdir(dataLogoSetsFolder, { withFileTypes: true })
        .then(async (files) => {
          for (const file of files) {
            if (file.isDirectory()) {
              const logoSet: ILogoSet = {
                id: `${file.name.replace(' ', '-')}`,
                name: `${file.name}`,
                path: file.name
              };
              const realPath = path.join(dataLogoSetsFolder, logoSet.path);
              try {
                if (state.registry.logoSets.has(logoSet.id)) {
                  throw new Error(`Logo set "${logoSet.id}" already registered!`);
                }
                const files = (await fs.promises.readdir(realPath, { withFileTypes: true }))
                .filter(f => f.isFile())
                .map(f => f.name);
                state.registry.logoSets.set(logoSet.id, {
                  ...logoSet,
                  fullPath: realPath,
                  files: files
                });
                log.debug('Extensions', `[SYSTEM] Registered Logo Set "${logoSet.id}"`);
              } catch (error) {
                log.error('Extensions', `[SYSTEM] Error loading logo set "${logoSet.id}"\n${error}`);
              }
            }
          }
        });
      } catch (error: any) {
        log.error('Launcher', `Error loading default Logo Sets folder\n${error.message}`);
      }

      // Init Ext Logo Sets
      await state.extensionsService.getContributions('logoSets')
      .then(async (logoSetContributions) => {
        for (const c of logoSetContributions) {
          for (const logoSet of c.value) {
            const ext = await state.extensionsService.getExtension(c.extId);
            if (ext) {
              const realPath = path.join(ext.extensionPath, logoSet.path);
              try {
                if (state.registry.logoSets.has(logoSet.id)) {
                  throw new Error(`Logo set "${logoSet.id}" already registered!`);
                }
                const files = (await fs.promises.readdir(realPath, { withFileTypes: true }))
                .filter(f => f.isFile())
                .map(f => f.name);
                state.registry.logoSets.set(logoSet.id, {
                  ...logoSet,
                  fullPath: realPath,
                  files: files
                });
                log.debug('Extensions', `[${ext.manifest.displayName || ext.manifest.name}] Registered Logo Set "${logoSet.id}"`);
              } catch (error) {
                log.error('Extensions', `[${ext.manifest.displayName || ext.manifest.name}] Error loading logo set "${logoSet.id}"\n${error}`);
              }
            }
          }
        }
        console.log('Back - Initialized Logo Sets');
      });

      await ExtConfigFile.saveFile(path.join(state.config.flashpointPath, EXT_CONFIG_FILENAME), state.extConfig);
      exts.forEach(ext => {
        state.extensionsService.loadExtension(ext.id)
        .catch((error: any) => {
          log.error('Extensions', `[${ext.manifest.displayName || ext.manifest.name}] Error loading extension\n${error}`);
        });
      });
    });
  })
  .then(() => {
    console.log('Back - Initialized Extensions');
    state.init[BackInit.EXTENSIONS] = true;
    state.initEmitter.emit(BackInit.EXTENSIONS);
  })
  .catch((error: any) => {
    log.error('Launcher', `Failed to load extensions\n${error.toString()}`);
    exit(state);
  });
}

function getCurationFilePath(folder: string, relativePath: string) {
  return path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, folder, relativePath);
}

async function onUpdateCurationFile(folder: string, relativePath: string, data: Buffer) {
  const filePath = getCurationFilePath(folder, relativePath);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, data);
  // Send updates for image changes
  const curationIdx = state.loadedCurations.findIndex(c => c.folder === folder);
  if (curationIdx !== -1) {
    const curation = state.loadedCurations[curationIdx];
    if (relativePath === 'logo.png') {
      curation.thumbnail.exists = true;
      curation.thumbnail.version += 1;
      curation.thumbnail.fileName = 'logo.png';
      curation.thumbnail.filePath = filePath;
      state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
    } else if (relativePath === 'ss.png') {
      curation.screenshot.exists = true;
      curation.screenshot.version += 1;
      curation.screenshot.fileName = 'ss.png';
      curation.screenshot.filePath = filePath;
      state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
    }
  }
}

async function onRemoveCurationFile(folder: string, relativePath: string) {
  const filePath = getCurationFilePath(folder, relativePath);
  await fs.remove(filePath);
  // Send updates for image changes
  const curationIdx = state.loadedCurations.findIndex(c => c.folder === folder);
  if (curationIdx !== -1) {
    const curation = state.loadedCurations[curationIdx];
    if (relativePath === 'logo.png') {
      curation.thumbnail.exists = false;
      curation.thumbnail.version += 1;
      state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
    } else if (relativePath === 'ss.png') {
      curation.screenshot.exists = false;
      curation.screenshot.version += 1;
      state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
    }
  }
}

function onFileServerRequestExtData(pathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse): void {
  // Split URL section into parts (/extdata/<extId>/<relativePath>)
  const splitPath = pathname.split('/');
  const extId = splitPath.length > 0 ? splitPath[0] : '';
  const relativePath = splitPath.length > 1 ? splitPath.slice(1).join('/') : '';
  state.extensionsService.getExtension(extId)
  .then(ext => {
    if (ext) {
      // Only serve from <extPath>/static/
      const staticPath = path.join(ext.extensionPath, 'static');
      const filePath = path.join(staticPath, relativePath);
      if (filePath.startsWith(staticPath)) {
        serveFile(req, res, filePath);
      } else {
        log.warn('Launcher', `Illegal file request: "${filePath}"`);
      }
    }
  });
}

function onFileServerRequestExtIcons(pathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse): void {
  state.extensionsService.getExtension(pathname)
  .then((ext) => {
    if (ext && ext.manifest.icon) {
      const filePath = path.join(ext.extensionPath, ext.manifest.icon);
      if (filePath.startsWith(ext.extensionPath)) {
        serveFile(req, res, filePath);
      } else {
        log.warn('Launcher', `Illegal file request: "${filePath}"`);
      }
    }
  });
}

function onFileServerRequestThemes(pathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse): void {
  const splitPath = pathname.split('/');
  // Find theme associated with the path (/Theme/<themeId>/<relativePath>)
  const themeId = splitPath.length > 0 ? splitPath[0] : '';
  const relativePath = splitPath.length > 1 ? splitPath.slice(1).join('/') : '';
  const theme = state.registry.themes.get(themeId);
  if (theme) {
    const filePath = path.join(theme.basePath, theme.themePath, relativePath);
    // Don't allow files outside of theme path
    const relative = path.relative(theme.basePath, filePath);
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
      serveFile(req, res, filePath);
    } else {
      log.warn('Launcher', `Illegal file request: "${filePath}"`);
    }
  }
}

async function onFileServerRequestImages(pathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const splitPath = pathname.split('/');
  const folder = splitPath.length > 0 ? splitPath[0] : '';
  const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
  const filePath = path.join(imageFolder, pathname);
  if (filePath.startsWith(imageFolder)) {
    if (req.method === 'POST') {
      const fileName = path.basename(pathname);
      if (fileName.length >= 39 && fileName.endsWith('.png') && splitPath.length === 4) {
        const gameId = fileName.substring(0,36);
        if (validateSemiUUID(gameId) && splitPath[1] === gameId.substring(0,2) && splitPath[2] === gameId.substring(2,4)) {
          await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
          const chunks: any[] = [];
          req.on('data', (chunk) => {
            chunks.push(chunk);
          })
          .on('end', async () => {
            const data = Buffer.concat(chunks);
            await fs.promises.writeFile(filePath, data);
            state.socketServer.broadcast(BackOut.IMAGE_CHANGE, folder, gameId);
            res.writeHead(200);
            res.end();
          })
          .on('error', async (err) => {
            log.error('Launcher', `Error writing Game image - ${err}`);
            res.writeHead(500);
            res.end();
          });
          return;
        }
      }
      res.writeHead(400);
      res.end();
    }
    else if (req.method === 'GET' || req.method === 'HEAD') {
      req.on('error', (err) => {
        log.error('Launcher', `Error serving Game image - ${err}`);
        res.writeHead(500);
        res.end();
      });
      fs.stat(filePath)
      .then((stats) => {
        // Respond with file
        res.writeHead(200, {
          'Content-Type': mime.getType(path.extname(filePath)) || '',
          'Content-Length': stats.size,
        });
        if (req.method === 'GET') {
          const stream = fs.createReadStream(filePath);
          stream.on('error', error => {
            console.warn(`File server failed to stream file. ${error}`);
            stream.destroy(); // Calling "destroy" inside the "error" event seems like it could case an endless loop (although it hasn't thus far)
            if (!res.writableEnded) { res.end(); }
          });
          stream.pipe(res);
        } else {
          res.end();
        }
      })
      .catch(async (err) => {
        if (err.code !== 'ENOENT') {
          // Can't read file
          res.writeHead(404);
          res.end();
        } else {
          // File missing
          if (!state.preferences.onDemandImages) {
            // Not downloading new files
            res.writeHead(404);
            res.end();
          } else {
            // Remove any older duplicate requests
            const index = state.fileServerDownloads.queue.findIndex(v => v.subPath === pathname);
            if (index >= 0) {
              const item = state.fileServerDownloads.queue[index];
              item.res.writeHead(404);
              item.res.end();
              state.fileServerDownloads.queue.splice(index, 1);
            }

            // Add to download queue
            const item: ImageDownloadItem = {
              subPath: pathname,
              req: req,
              res: res,
              cancelled: false,
            };
            state.fileServerDownloads.queue.push(item);
            req.once('close', () => { item.cancelled = true; });
            updateFileServerDownloadQueue()
            .catch((err) => {
              log.error('Launcher', 'Somethign really broke in updateFileServerDownloadQueue: ' + err);
            });
          }
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  }
}

function onFileServerRequestLogos(pathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse): void {
  const logoSet = state.registry.logoSets.get(state.preferences.currentLogoSet || '');
  const logoFolder = logoSet && logoSet.files.includes(pathname)
    ? logoSet.fullPath
    : path.join(state.config.flashpointPath, state.preferences.logoFolderPath);
  const filePath = path.join(logoFolder, pathname);
  if (filePath.startsWith(logoFolder)) {
    fs.access(filePath, fs.constants.F_OK, async (err) => {
      if (err) {
        // Maybe we're on a case sensitive platform?
        try {
          const folder = path.dirname(filePath);
          const filename = path.basename(filePath);
          if (filePath.startsWith(logoFolder)) {
            const files = await fs.readdir(folder);
            for (const file of files) {
              if (file.toLowerCase() == filename.toLowerCase()) {
                serveFile(req, res, path.join(folder, file));
                return;
              }
            }
          }
        } catch { /** Let error drop to return default image instead */ }
        // File doesn't exist, serve default image
        const basePath = state.isDev ? path.join(process.cwd(), 'build') : path.join(path.dirname(state.exePath), 'resources/app.asar/build');
        const replacementFilePath = path.join(basePath, 'window/images/Logos', pathname);
        if (replacementFilePath.startsWith(basePath)) {
          fs.access(replacementFilePath, fs.constants.F_OK, (err) => {
            if (err) {
              serveFile(req, res, path.join(basePath, DEFAULT_LOGO_PATH));
            } else {
              serveFile(req, res, replacementFilePath);
            }
          });
        }
      } else {
        serveFile(req, res, filePath);
      }
    });
  }
}

/**
 * Execute a back process (a)synchronously.
 *
 * @param proc Back process to run.
 * @param sync If the process should run synchronously (block this thread until it exits).
 */
async function execProcess(proc: IBackProcessInfo, sync?: boolean): Promise<void> {
  const cwd: string = path.join(state.config.flashpointPath, proc.path);
  log.info(SERVICES_SOURCE, `Executing "${proc.filename}" ${stringifyArray(proc.arguments)} in "${proc.path}"`);
  try {
    if (sync) {
      child_process.execFileSync(proc.filename, proc.arguments, { cwd: cwd });
    } else {
      const childProc = child_process.execFile(proc.filename, proc.arguments, { cwd: cwd });
      await awaitEvents(childProc, ['exit', 'error']);
    }
  } catch (error) {
    log.info(SERVICES_SOURCE, `An unexpected error occurred while executing a command:\n  "${error}"`);
  }
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

/**
 * Create a promise that resolves when the emitter emits one of the given events.
 *
 * @param emitter Emitter to listen on.
 * @param events Events that causes the promise to resolve.
 */
function awaitEvents(emitter: EventEmitter, events: string[]): Promise<void> {
  return new Promise((resolve) => {
    // @TODO Maybe add a timeout that rejects it?
    const safeEvents = [ ...events ]; // This is a copy in case another function edits the events array after calling this

    let isResolved = false;
    const listener = () => {
      if (!isResolved) {
        isResolved = true;

        for (const event of safeEvents) {
          emitter.off(event, listener);
        }

        resolve();
      }
    };

    for (const event of safeEvents) {
      emitter.on(event, listener);
    }
  });
}


async function updateFileServerDownloadQueue() {
  // @NOTE This will fail to stream the image to the client if it fails to save it to the disk.

  // Fill all available current slots
  while (state.fileServerDownloads.current.length < CONCURRENT_IMAGE_DOWNLOADS) {
    const item = state.fileServerDownloads.queue.pop();

    if (!item) { break; } // Queue is empty

    if (item.cancelled) { continue; }

    state.fileServerDownloads.current.push(item);

    // Start download
    let url = state.preferences.onDemandBaseUrl + (state.preferences.onDemandBaseUrl.endsWith('/') ? '' : '/') + item.subPath;
    // Add compressed modifier if enabled
    if (state.preferences.onDemandImagesCompressed) {
      url += '?type=jpg';
    }
    // Use arraybuffer since it's small memory footprint anyway
    await axios.get(url, { responseType: 'arraybuffer' })
    .then(async (res) => {
      // Save response to image file
      const imageData = res.data;

      const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
      const filePath = path.join(imageFolder, item.subPath);

      await fs.ensureDir(path.dirname(filePath));
      await fs.promises.writeFile(filePath, imageData, 'binary');

      item.res.writeHead(200);
      item.res.write(imageData);
    })
    .catch((err) => {
      item.res.writeHead(404);
      log.error('Launcher', 'Failure downloading image on demand: ' + err);
    })
    .finally(async () => {
      removeFileServerDownloadItem(item);
    });
  }
}

async function removeFileServerDownloadItem(item: ImageDownloadItem): Promise<void> {
  item.res.end();

  // Remove item from current
  const index = state.fileServerDownloads.current.indexOf(item);
  if (index >= 0) { state.fileServerDownloads.current.splice(index, 1); }
}

export async function loadCurationArchive(filePath: string, onProgress?: (progress: Progress) => void): Promise<flashpoint.CurationState> {
  const key = uuid();
  const extractPath = path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_EXTRACTING, key);
  // Extract to temp folder
  await fs.ensureDir(extractPath);
  await new Promise<void>((resolve, reject) => {
    const e = extractFull(filePath, extractPath, { $bin: state.sevenZipPath, $progress: true })
    .once('end', () => resolve())
    .once('error', err => reject(err));
    if (onProgress) {
      e.on('progress', onProgress);
    }
  });

  // Find the "root" path of the curation
  // (Sometimes curations are not at the root of the archive, but instead nested one or more folders deep)
  const rootPath = await getRootPath(extractPath);
  if (!rootPath) { throw new Error('Meta.yaml/yml/txt not found in extracted archive'); }

  // Move all files from the root folder to the curation folder
  const curationPath = path.resolve(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, key);
  await fs.ensureDir(curationPath);
  for (const file of await fs.promises.readdir(rootPath)) {
    await fs.move(path.join(rootPath, file), path.join(curationPath, file));
  }

  // Delete extract folder
  await fs.remove(extractPath);

  // Load curation
  const parsedMeta = await readCurationMeta(curationPath, state.platformAppPaths);
  if (!parsedMeta) { throw new Error('Fail'); }

  const loadedCuration: LoadedCuration = {
    folder: key,
    uuid: parsedMeta.uuid || uuid(),
    group: parsedMeta.group,
    game: parsedMeta.game,
    addApps: parsedMeta.addApps,
    thumbnail: await loadCurationIndexImage(path.join(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, key, 'logo.png')),
    screenshot: await loadCurationIndexImage(path.join(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, key, 'ss.png')),
  };
  const alreadyImported = await fpDatabase.findGame(loadedCuration.uuid) !== null;
  const curation: flashpoint.CurationState = {
    ...loadedCuration,
    alreadyImported,
    warnings: await genCurationWarnings(loadedCuration, state.config.flashpointPath, state.suggestions, state.languageContainer.curate, state.apiEmitters.curations.onWillGenCurationWarnings)
  };

  genContentTree(getContentFolderByKey(key, state.config.flashpointPath))
  .then((contentTree) => {
    const curationIdx = state.loadedCurations.findIndex((c) => c.folder === key);
    if (curationIdx >= 0) {
      state.loadedCurations[curationIdx].contents = contentTree;
      state.socketServer.broadcast(BackOut.CURATE_CONTENTS_CHANGE, key, contentTree);
    }
  });

  state.loadedCurations.push({
    ...curation,
  });
  state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [ curation ]);
  return curation;
}

/**
 * Return the first path containing any valid meta name (undefined if none found)
 *
 * @param dir Path to search
 */
async function getRootPath(dir: string): Promise<string | undefined> {
  const files = await fs.readdir(dir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(dir, file);
    const stats = await fs.lstat(fullPath);
    // Found root, pass back
    if (stats.isFile() && endsWithList(file.toLowerCase(), CURATION_META_FILENAMES)) {
      return dir;
    } else if (stats.isDirectory()) {
      const foundRoot = await getRootPath(fullPath);
      if (foundRoot) {
        return foundRoot;
      }
    }
  }
}

function endsWithList(str: string, list: string[]): boolean {
  for (const s of list) {
    if (str.endsWith(s)) {
      return true;
    }
  }
  return false;
}

export function extractFullPromise(args: Parameters<typeof extractFull>) : Promise<void> {
  return new Promise<void>((resolve, reject) => {
    extractFull(...args)
    .once(('end'), () => {
      resolve();
    })
    .once(('error'), (error) => {
      reject(error);
    });
  });
}

export async function checkAndDownloadGameData(activeDataId: number) {
  const gameData = await fpDatabase.findGameDataById(activeDataId);
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
      await downloadGameData(gameData.id, path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath), state.preferences.gameDataSources, state.downloadController.signal(), onProgress, onDetails)
      .finally(() => {
        // Close PLACEHOLDER download dialog on client, cosmetic delay to look nice
        setTimeout(() => {
          state.socketServer.broadcast(BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG);
        }, 250);
      });
    } catch (error: any) {
      state.socketServer.broadcast(BackOut.OPEN_ALERT, error);
      log.info('Game Launcher', `Game Launch Aborted: ${error}`);
      return;
    }
  }
}
