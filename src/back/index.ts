import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { GameData } from '@database/entity/GameData';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { Source } from '@database/entity/Source';
import { SourceData } from '@database/entity/SourceData';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { Initial1593172736527 } from '@database/migration/1593172736527-Initial';
import { AddExtremeToPlaylist1599706152407 } from '@database/migration/1599706152407-AddExtremeToPlaylist';
import { GameData1611753257950 } from '@database/migration/1611753257950-GameData';
import { SourceDataUrlPath1612434225789 } from '@database/migration/1612434225789-SourceData_UrlPath';
import { SourceFileURL1612435692266 } from '@database/migration/1612435692266-Source_FileURL';
import { SourceFileCount1612436426353 } from '@database/migration/1612436426353-SourceFileCount';
import { GameTagsStr1613571078561 } from '@database/migration/1613571078561-GameTagsStr';
import { GameDataParams1619885915109 } from '@database/migration/1619885915109-GameDataParams';
import { BackIn, BackInit, BackInitArgs, BackOut } from '@shared/back/types';
import { ILogoSet, LogoSet } from '@shared/extensions/interfaces';
import { IBackProcessInfo, RecursivePartial } from '@shared/interfaces';
import { getDefaultLocalization, LangFileContent } from '@shared/lang';
import { ILogEntry, LogLevel } from '@shared/Log/interface';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { Theme } from '@shared/ThemeFile';
import { createErrorProxy, removeFileExtension, stringifyArray } from '@shared/Util';
import * as child_process from 'child_process';
import { EventEmitter } from 'events';
import * as flashpoint from 'flashpoint-launcher';
import { http as httpFollow, https as httpsFollow } from 'follow-redirects';
import * as fs from 'fs-extra';
import * as http from 'http';
import * as mime from 'mime';
import * as path from 'path';
import 'reflect-metadata';
// Required for the DB Models to function
import 'sqlite3';
import { Tail } from 'tail';
import { ConnectionOptions, createConnection } from 'typeorm';
import { ConfigFile } from './ConfigFile';
import { CONFIG_FILENAME, EXT_CONFIG_FILENAME, PREFERENCES_FILENAME, SERVICES_SOURCE } from './constants';
import { loadExecMappingsFile } from './Execs';
import { ExtConfigFile } from './ExtConfigFile';
import { ApiEmitter } from './extensions/ApiEmitter';
import { ExtensionService } from './extensions/ExtensionService';
import { FPLNodeModuleFactory, INodeModuleFactory, installNodeInterceptor, registerInterceptor } from './extensions/NodeInterceptor';
import { Command } from './extensions/types';
import * as GameManager from './game/GameManager';
import { onWillImportCuration } from './importGame';
import { ManagedChildProcess, onServiceChange } from './ManagedChildProcess';
import { registerRequestCallbacks } from './responses';
import { ServicesFile } from './ServicesFile';
import { SocketServer } from './SocketServer';
import { newThemeWatcher } from './Themes';
import { BackState, ImageDownloadItem } from './types';
import { EventQueue } from './util/EventQueue';
import { FolderWatcher } from './util/FolderWatcher';
import { LogFile } from './util/LogFile';
import { logFactory } from './util/logging';
import { createContainer, exit, runService } from './util/misc';
import * as GameDataManager from '@back/game/GameDataManager';

const DEFAULT_LOGO_PATH = 'window/images/Logos/404.png';

// Make sure the process.send function is available
type Required<T> = T extends undefined ? never : T;
const send: Required<typeof process.send> = process.send
  ? process.send.bind(process)
  : (() => { throw new Error('process.send is undefined.'); });

const CONCURRENT_IMAGE_DOWNLOADS = 6;

const state: BackState = {
  isInit: false,
  isExit: false,
  isDev: false,
  verbose: false,
  logFile: createErrorProxy('logFile'),
  socketServer: new SocketServer(),
  fileServer: new http.Server(onFileServerRequest),
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
  customVersion: undefined,
  gameManager: {
    platformsPath: '',
    saveQueue: new EventQueue(),
  },
  messageQueue: [],
  isHandling: false,
  init: {
    0: false,
    1: false,
    2: false,
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
      onWillUninstallGameData: GameDataManager.onWillUninstallGameData,
      onDidLaunchGame: new ApiEmitter<flashpoint.Game>(),
      onDidLaunchAddApp: new ApiEmitter<flashpoint.AdditionalApp>(),
      onDidLaunchCurationGame: new ApiEmitter<flashpoint.Game>(),
      onDidLaunchCurationAddApp: new ApiEmitter<flashpoint.AdditionalApp>(),
      onDidUpdateGame: GameManager.onDidUpdateGame,
      onDidRemoveGame: GameManager.onDidRemoveGame,
      onDidUpdatePlaylist: GameManager.onDidUpdatePlaylist,
      onDidUpdatePlaylistGame: GameManager.onDidUpdatePlaylistGame,
      onDidRemovePlaylistGame: GameManager.onDidRemovePlaylistGame,
      onDidInstallGameData: GameDataManager.onDidInstallGameData,
      onDidUninstallGameData: GameDataManager.onDidUninstallGameData,
      onWillImportCuration: onWillImportCuration,
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
  },
  extensionsService: createErrorProxy('extensionsService'),
  connection: undefined,
  writeLocks: 0,
};

main();

async function main() {
  registerRequestCallbacks(state);

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
    BackIn.CLEANUP_TAG_ALIASES,
    BackIn.CLEANUP_TAGS,
    BackIn.FIX_TAG_PRIMARY_ALIASES,
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
    // ?
    BackIn.SYNC_GAME_METADATA,
    // Meta Edits
    BackIn.EXPORT_META_EDIT,
    BackIn.IMPORT_META_EDITS,
  ]);

  process.on('message', onProcessMessage);
  process.on('disconnect', () => { exit(state); }); // (Exit when the main process does)
}

async function onProcessMessage(message: any, sendHandle: any): Promise<void> {
  if (state.isInit) { return; }
  state.isInit = true;

  const content: BackInitArgs = JSON.parse(message);
  state.isDev = content.isDev;
  state.verbose = content.verbose;
  state.configFolder = content.configFolder;
  state.localeCode = content.localeCode;
  state.exePath = content.exePath;
  state.version = content.version;
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

  state.socketServer.secret = content.secret;

  const versionStr = `${content.version} ${content.isDev ? 'DEV' : ''}`;
  log.info('Launcher', `Starting Flashpoint Launcher ${versionStr}`);

  // Read configs & preferences
  state.config = await ConfigFile.readOrCreateFile(path.join(state.configFolder, CONFIG_FILENAME));

  // If we're on mac and the flashpoint path is relative, resolve it relative to the configFolder path.
  state.config.flashpointPath = process.platform == 'darwin' && state.config.flashpointPath[0] != '/'
    ? path.resolve(state.configFolder, state.config.flashpointPath)
    : state.config.flashpointPath;

  // @TODO Figure out why async loading isn't always working?
  try {
    state.preferences = await PreferencesFile.readOrCreateFile(path.join(state.config.flashpointPath, PREFERENCES_FILENAME));
  } catch (e) {
    console.log(e);
    exit(state);
    return;
  }
  const [extConf] = await (Promise.all([
    ExtConfigFile.readOrCreateFile(path.join(state.config.flashpointPath, EXT_CONFIG_FILENAME))
  ]));
  state.extConfig = extConf;

  // Create Game Data Directory and clean up temp files
  const fullDataPacksFolderPath = path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath);
  await fs.promises.mkdir(fullDataPacksFolderPath, { recursive: true });
  fs.promises.readdir(fullDataPacksFolderPath)
  .then((files) => {
    for (const f of files) {
      if (f.endsWith('.temp')) {
        fs.promises.unlink(path.join(fullDataPacksFolderPath, f));
      }
    }
  });

  // Check for custom version to report
  const versionFilePath = content.isDev ? path.join(process.cwd(), 'version.txt') : path.join(state.config.flashpointPath, 'version.txt');
  const customVersion = await fs.access(versionFilePath, fs.constants.F_OK)
  .then(async () => {
    return fs.readFile(versionFilePath, 'utf8');
  })
  .catch(() => { /** File doesn't exist */ });
  if (customVersion) {
    state.customVersion = customVersion;
    log.info('Launcher', `Data Version Detected: ${state.customVersion}`);
  }

  // Setup DB
  if (!state.connection) {
    const options: ConnectionOptions = {
      type: 'sqlite',
      database: path.join(state.config.flashpointPath, 'Data', 'flashpoint.sqlite'),
      entities: [Game, AdditionalApp, Playlist, PlaylistGame, Tag, TagAlias, TagCategory, GameData, Source, SourceData],
      migrations: [Initial1593172736527, AddExtremeToPlaylist1599706152407, GameData1611753257950, SourceDataUrlPath1612434225789, SourceFileURL1612435692266,
        SourceFileCount1612436426353, GameTagsStr1613571078561, GameDataParams1619885915109]
    };
    state.connection = await createConnection(options);
    // TypeORM forces on but breaks Playlist Game links to unimported games
    await state.connection.query('PRAGMA foreign_keys=off;');
    await state.connection.runMigrations();
    log.info('Launcher', 'Database connection established');
  }

  // Init extensions
  const addExtLogFactory = (extId: string) => (entry: ILogEntry) => {
    state.extensionsService.logExtension(extId, entry);
  };
  state.extensionsService = new ExtensionService(state.config, path.join(state.config.flashpointPath, state.preferences.extensionsPath));
  // Create module interceptor
  registerInterceptor(new FPLNodeModuleFactory(
    await state.extensionsService.getExtensionPathIndex(),
    addExtLogFactory,
    versionStr,
    state,
  ),
  state.moduleInterceptor);
  await installNodeInterceptor(state.moduleInterceptor);
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
    ExtConfigFile.saveFile(path.join(state.config.flashpointPath, EXT_CONFIG_FILENAME), state.extConfig);
    exts.forEach(ext => {
      state.extensionsService.loadExtension(ext.id);
    });
  });


  // Init services
  try {
    state.serviceInfo = await ServicesFile.readFile(
      path.join(state.config.flashpointPath, state.preferences.jsonFolderPath),
      state.config,
      error => { log.info(SERVICES_SOURCE, error.toString()); }
    );
  } catch (error) { /* @TODO Do something about this error */ }
  if (state.serviceInfo) {
    // Run start commands
    for (let i = 0; i < state.serviceInfo.start.length; i++) {
      await execProcess(state.serviceInfo.start[i]);
    }
    // Run processes
    if (state.serviceInfo.server.length > 0) {
      const chosenServer = state.serviceInfo.server.find(i => i.name === state.config.server);
      runService(state, 'server', 'Server', state.config.flashpointPath, {}, chosenServer || state.serviceInfo.server[0]);
    }
    // Start daemons
    for (let i = 0; i < state.serviceInfo.daemon.length; i++) {
      const service = state.serviceInfo.daemon[i];
      const id = 'daemon_' + i;
      runService(state, id, service.name || id, state.config.flashpointPath, {}, service);
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
  const langFolder = path.join(content.isDev ? process.cwd() : process.platform == 'darwin' ? path.resolve(path.dirname(content.exePath), '..') : path.dirname(content.exePath), 'lang');
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

  // Init themes
  const dataThemeFolder = path.join(state.config.flashpointPath, state.preferences.themeFolderPath);
  await fs.ensureDir(dataThemeFolder);
  try {
    await fs.promises.readdir(dataThemeFolder, { withFileTypes: true })
    .then(async (files) => {
      for (const file of files) {
        if (file.isDirectory()) {
          await newThemeWatcher(`${file.name}`, dataThemeFolder, path.join(dataThemeFolder, file.name), state.themeState, state.registry, state.socketServer);
        }
      }
    });
  } catch (error) {
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

  // Init Logo Sets
  const dataLogoSetsFolder = path.join(state.config.flashpointPath, state.preferences.logoSetsFolderPath);
  await fs.ensureDir(dataLogoSetsFolder);
  try {
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
  } catch (error) {
    log.error('Launcher', `Error loading default Themes folder\n${error.message}`);
  }
  const logoSetContributions = await state.extensionsService.getContributions('logoSets');
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

  // Load Exec Mappings
  loadExecMappingsFile(path.join(state.config.flashpointPath, state.preferences.jsonFolderPath), content => log.info('Launcher', content))
  .then(data => {
    state.execMappings = data;
  })
  .catch(error => {
    log.info('Launcher', `Failed to load exec mappings file. Ignore if on Windows. - ${error}`);
  })
  .finally(() => {
    state.init[BackInit.EXEC] = true;
    state.initEmitter.emit(BackInit.EXEC);
  });

  const hostname = content.acceptRemote ? undefined : 'localhost';

  // Find the first available port in the range
  await state.socketServer.listen(state.config.backPortMin, state.config.backPortMax, hostname);

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
        state.fileServer.listen(port, hostname);
      } else {
        done(new Error(`All attempted ports are already in use (Ports: ${minPort} - ${maxPort}).`));
      }
    }
    function done(error: Error | undefined) {
      state.fileServer.off('listening', onceListening);
      state.fileServer.off('error', onError);
      if (error) {
        log.info('Back', 'Failed to open HTTP server.\n' + error);
        resolve(-1);
      } else {
        resolve(port);
      }
    }
  });

  // Exit if it failed to open the server
  if (state.socketServer.port < 0) {
    setImmediate(exit);
  }

  // Respond
  send(state.socketServer.port, () => {
    state.apiEmitters.onDidInit.fire();
  });

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
        const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
        const fileSubPath = urlPath.substr(index + 1);
        const filePath = path.join(imageFolder, fileSubPath);
        if (filePath.startsWith(imageFolder)) {
          if (req.method === 'GET' || req.method === 'HEAD') {
            fs.stat(filePath, (error, stats) => {
              if (error && error.code !== 'ENOENT') {
                res.writeHead(404);
                res.end();
              } else if (stats && stats.isFile()) {
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
                    if (!res.finished) { res.end(); }
                  });
                  stream.pipe(res);
                } else {
                  res.end();
                }
              } else if (state.preferences.onDemandImages) {
                // Remove any older duplicate requests
                const index = state.fileServerDownloads.queue.findIndex(v => v.subPath === fileSubPath);
                if (index >= 0) {
                  const item = state.fileServerDownloads.queue[index];
                  item.res.writeHead(404);
                  item.res.end();
                  state.fileServerDownloads.queue.splice(index, 1);
                }

                // Add to download queue
                const item: ImageDownloadItem = {
                  subPath: fileSubPath,
                  req: req,
                  res: res,
                  cancelled: false,
                };
                state.fileServerDownloads.queue.push(item);
                req.once('close', () => { item.cancelled = true; });
                updateFileServerDownloadQueue();
              } else {
                res.writeHead(404);
                res.end();
              }
            });
          } else {
            res.writeHead(404);
            res.end();
          }
        }
      } break;

      // Theme folder
      case 'themes': {
        const index = urlPath.indexOf('/');
        // Split URL section into parts (/Themes/<themeId>/<relativePath>)
        const themeUrl = (index >= 0) ? urlPath.substr(index + 1) : urlPath;
        const nameIndex = themeUrl.indexOf('/');
        const themeId = (nameIndex >= 0) ? themeUrl.substr(0, nameIndex) : themeUrl;
        const relativePath = (nameIndex >= 0) ? themeUrl.substr(nameIndex + 1): themeUrl;
        // Find theme associated with the path
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
      } break;

      // Logos folder
      case 'logos': {
        const logoSet = state.registry.logoSets.get(state.preferences.currentLogoSet || '');
        const relativePath = urlPath.substr(index + 1);
        const logoFolder = logoSet && logoSet.files.includes(relativePath)
          ? logoSet.fullPath
          : path.join(state.config.flashpointPath, state.preferences.logoFolderPath);
        const filePath = path.join(logoFolder, relativePath);
        if (filePath.startsWith(logoFolder)) {
          fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
              // File doesn't exist, serve default image
              const basePath = state.isDev ? path.join(process.cwd(), 'build') : path.join(path.dirname(state.exePath), 'resources/app.asar/build');
              const replacementFilePath = path.join(basePath, 'window/images/Logos', relativePath);
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
        } else {
          log.warn('Launcher', `Illegal file request: "${filePath}"`);
        }
      } break;

      // Extension icons
      case 'exticons': {
        const relativePath = urlPath.substr(index + 1);
        // /extIcons/<extId>
        state.extensionsService.getExtension(relativePath)
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
        break;
      }

      case 'extdata': {
        const index = urlPath.indexOf('/');
        // Split URL section into parts (/extdata/<extId>/<relativePath>)
        const fullPath = (index >= 0) ? urlPath.substr(index + 1) : urlPath;
        const nameIndex = fullPath.indexOf('/');
        const extId = (nameIndex >= 0) ? fullPath.substr(0, nameIndex) : fullPath;
        const relativePath = (nameIndex >= 0) ? fullPath.substr(nameIndex + 1): fullPath;
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
        break;
      }

      // JSON file(s)
      case 'credits.json': {
        serveFile(req, res, path.join(state.config.flashpointPath, state.preferences.jsonFolderPath, 'credits.json'));
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

/**
 * Execute a back process (a)synchronously.
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
 * @param emitter Emitter to listen on.
 * @param events Events that causes the promise to resolve.
 */
function awaitEvents(emitter: EventEmitter, events: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
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

function updateFileServerDownloadQueue() {
  // @NOTE This will fail to stream the image to the client if it fails to save it to the disk.

  // Fill all available current slots
  while (state.fileServerDownloads.current.length < CONCURRENT_IMAGE_DOWNLOADS) {
    const item = state.fileServerDownloads.queue.pop();

    if (!item) { break; } // Queue is empty

    if (item.cancelled) { continue; }

    state.fileServerDownloads.current.push(item);

    // Start download
    const url = state.preferences.onDemandBaseUrl + (state.preferences.onDemandBaseUrl.endsWith('/') ? '' : '/') + item.subPath;
    const protocol = url.startsWith('https://') ? httpsFollow : httpFollow;
    try {
      const req = protocol.get(url, async (res) => {
        try {
          if (res.statusCode === 200) {
            const imageFolder = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
            const filePath = path.join(imageFolder, item.subPath);

            await fs.ensureDir(path.dirname(filePath));
            const fileStream = fs.createWriteStream(filePath);

            res.on('data', (chunk: Buffer) => {
              fileStream.write(chunk);
              item.res.write(chunk);
            });
            res.once('close', () => {
              fileStream.end();
              removeFileServerDownloadItem(item);
            });
            res.once('end', () => {
              fileStream.end();
              removeFileServerDownloadItem(item);
            });
            res.once('error', error => {
              console.error('An error occurred while downloading an image on demand.', error);
              fileStream.end();
              fs.unlink(filePath).catch(error => { console.error(`Failed to delete incomplete on demand image file (filepath: "${filePath}")`, error); });
              removeFileServerDownloadItem(item);
            });
          } else {
            // throw new Error(`The status code is not 200 (status code: ${res.statusCode})`);
            removeFileServerDownloadItem(item); // (This way it doesn't clog up the console when displaying games without an image)
          }
        } catch (error) {
          console.error('Failed to download an image on demand.', error);
          removeFileServerDownloadItem(item);
        }
      });
      req.on('error', error => {
        removeFileServerDownloadItem(item);
        if ((error as any)?.code !== 'ENOTFOUND') {
          console.error('Failed to download an image on demand.', error);
        }
      });
    } catch (error) {
      console.error('Failed to download an image on demand.', error);
      removeFileServerDownloadItem(item);
    }
  }
}

function removeFileServerDownloadItem(item: ImageDownloadItem): void {
  item.res.end();

  // Remove item from current
  const index = state.fileServerDownloads.current.indexOf(item);
  if (index >= 0) { state.fileServerDownloads.current.splice(index, 1); }

  updateFileServerDownloadQueue();
}
