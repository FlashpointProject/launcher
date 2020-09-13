import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { Initial1593172736527 } from '@database/migration/1593172736527-Initial';
import { BackInit, BackInitArgs, BackOut, LanguageChangeData, LanguageListChangeData } from '@shared/back/types';
import { LogoSet, ILogoSet } from '@shared/extensions/interfaces';
import { IBackProcessInfo, RecursivePartial } from '@shared/interfaces';
import { getDefaultLocalization, LangFileContent } from '@shared/lang';
import { ILogEntry, LogLevel } from '@shared/Log/interface';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { Theme } from '@shared/ThemeFile';
import { createErrorProxy, removeFileExtension, stringifyArray } from '@shared/Util';
import * as child_process from 'child_process';
import { EventEmitter } from 'events';
import * as flashpoint from 'flashpoint';
import * as fs from 'fs-extra';
import * as http from 'http';
import * as https from 'https';
import * as mime from 'mime';
import * as path from 'path';
import 'reflect-metadata';
// Required for the DB Models to function
import 'sqlite3';
import { Tail } from 'tail';
import { ConnectionOptions, createConnection } from 'typeorm';
import { ConfigFile } from './ConfigFile';
import { CONFIG_FILENAME, PREFERENCES_FILENAME, SERVICES_SOURCE } from './constants';
import { loadExecMappingsFile } from './Execs';
import { ApiEmitter } from './extensions/ApiEmitter';
import { ExtensionService } from './extensions/ExtensionService';
import { FPLNodeModuleFactory, INodeModuleFactory, installNodeInterceptor, registerInterceptor } from './extensions/NodeInterceptor';
import { Command } from './extensions/types';
import { GameManager } from './game/GameManager';
import { ManagedChildProcess } from './ManagedChildProcess';
import { registerRequestCallbacks } from './responses';
import { ServicesFile } from './ServicesFile';
import { SocketServer } from './SocketServer';
import { newThemeWatcher } from './Themes';
import { BackState, ImageDownloadItem } from './types';
import { EventQueue } from './util/EventQueue';
import { FolderWatcher } from './util/FolderWatcher';
import { logFactory } from './util/logging';
import { createContainer, exit, runService } from './util/misc';
// Required for the DB Models to function
// Required for the DB Models to function
// Required for the DB Models to function
// Required for the DB Models to function

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
  socketServer: new SocketServer(),
  fileServer: new http.Server(onFileServerRequest),
  fileServerPort: -1,
  fileServerDownloads: {
    queue: [],
    current: [],
  },
  preferences: createErrorProxy('preferences'),
  config: createErrorProxy('config'),
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
    games: {
      onWillLaunchGame: new ApiEmitter<flashpoint.GameLaunchInfo>(),
      onWillLaunchAddApp: new ApiEmitter<flashpoint.AdditionalApp>(),
      onWillLaunchCurationGame: new ApiEmitter<flashpoint.GameLaunchInfo>(),
      onWillLaunchCurationAddApp: new ApiEmitter<flashpoint.AdditionalApp>(),
      onDidLaunchGame: new ApiEmitter<flashpoint.Game>(),
      onDidLaunchAddApp: new ApiEmitter<flashpoint.AdditionalApp>(),
      onDidLaunchCurationGame: new ApiEmitter<flashpoint.Game>(),
      onDidLaunchCurationAddApp: new ApiEmitter<flashpoint.AdditionalApp>(),
      onDidUpdateGame: GameManager.onDidUpdateGame,
      onDidRemoveGame: GameManager.onDidRemoveGame,
      onDidUpdatePlaylist: GameManager.onDidUpdatePlaylist,
      onDidUpdatePlaylistGame: GameManager.onDidUpdatePlaylistGame,
      onDidRemovePlaylistGame: GameManager.onDidRemovePlaylistGame,
    },
    services: {
      onServiceNew: new ApiEmitter<flashpoint.ManagedChildProcess>(),
      onServiceRemoved: new ApiEmitter<flashpoint.ManagedChildProcess>(),
    }
  },
  status: {
    devConsoleText: ''
  },
  registry: {
    commands: new Map<string, Command>(),
    logoSets: new Map<string, LogoSet>(),
    themes: new Map<string, Theme>(),
  },
  extensionsService: createErrorProxy('extensionsService'),
  connection: undefined,
};
registerRequestCallbacks(state);

process.on('message', onProcessMessage);
process.on('disconnect', () => { exit(state); }); // (Exit when the main process does)

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

  const addLog = (entry: ILogEntry): number => { return state.log.push(entry) - 1; };
  global.log = {
    trace: logFactory(LogLevel.TRACE, state.socketServer, addLog, state.verbose),
    debug: logFactory(LogLevel.DEBUG, state.socketServer, addLog, state.verbose),
    info:  logFactory(LogLevel.INFO,  state.socketServer, addLog, state.verbose),
    warn:  logFactory(LogLevel.WARN,  state.socketServer, addLog, state.verbose),
    error: logFactory(LogLevel.ERROR, state.socketServer, addLog, state.verbose)
  };

  state.socketServer.secret = content.secret;

  const versionStr = `${content.version} ${content.isDev ? 'DEV' : ''}`;
  log.info('Launcher', `Starting Flashpoint Launcher ${versionStr}`);

  // Read configs & preferences
  const [pref, conf] = await (Promise.all([
    PreferencesFile.readOrCreateFile(path.join(state.configFolder, PREFERENCES_FILENAME)),
    ConfigFile.readOrCreateFile(path.join(state.configFolder, CONFIG_FILENAME))
  ]));
  state.preferences = pref;
  state.config = conf;

  // Check for custom version to report
  const versionFilePath = content.isDev ? path.join(process.cwd(), 'version.txt') : path.join(state.config.flashpointPath, 'version.txt');
  await fs.access(versionFilePath, fs.constants.F_OK)
  .then(async () => {
    const data = await fs.readFile(versionFilePath, 'utf8');
    state.customVersion = data;
    log.info('Launcher', `Data Version Detected: ${state.customVersion}`);
  })
  .catch(() => { /** File doesn't exist */ });

  // Setup DB
  if (!state.connection) {
    const options: ConnectionOptions = {
      type: 'sqlite',
      database: path.join(state.config.flashpointPath, 'Data', 'flashpoint.sqlite'),
      entities: [Game, AdditionalApp, Playlist, PlaylistGame, Tag, TagAlias, TagCategory],
      migrations: [Initial1593172736527]
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
  state.extensionsService = new ExtensionService(state.config);
  // Create module interceptor
  registerInterceptor(new FPLNodeModuleFactory(
    await state.extensionsService.getExtensionPathIndex(),
    addExtLogFactory,
    versionStr,
    state
  ),
  state.moduleInterceptor);
  await installNodeInterceptor(state.moduleInterceptor);
  // Load each extension
  await state.extensionsService.getExtensions()
  .then((exts) => {
    exts.forEach(ext => {
      state.extensionsService.loadExtension(ext.id);
    });
  });

  // Init services
  try {
    state.serviceInfo = await ServicesFile.readFile(
      path.join(state.config.flashpointPath, state.config.jsonFolderPath),
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

        state.socketServer.broadcast<LanguageListChangeData>({
          id: '',
          type: BackOut.LANGUAGE_LIST_CHANGE,
          data: state.languages,
        });

        if (lang.code === state.preferences.currentLanguage ||
            lang.code === state.localeCode ||
            lang.code === state.preferences.fallbackLanguage) {
          state.languageContainer = createContainer(
            state.languages,
            state.preferences.currentLanguage,
            state.localeCode,
            state.preferences.fallbackLanguage
          );
          state.socketServer.broadcast<LanguageChangeData>({
            id: '',
            type: BackOut.LANGUAGE_CHANGE,
            data: state.languageContainer,
          });
        }
      });
    }
  });
  state.languageWatcher.on('error', console.error);
  const langFolder = path.join(content.isDev ? process.cwd() : path.dirname(content.exePath), 'lang');
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
  const dataThemeFolder = path.join(state.config.flashpointPath, state.config.themeFolderPath);
  await fs.ensureDir(dataThemeFolder);
  try {
    await fs.promises.readdir(dataThemeFolder, { withFileTypes: true })
    .then(async (files) => {
      for (const file of files) {
        if (file.isDirectory()) {
          await newThemeWatcher(`SYSTEM.${file.name}`, dataThemeFolder, path.join(dataThemeFolder, file.name), state.themeState, state.registry, state.socketServer);
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
          log.error('Extensions', `Error loading theme from "${c.extId}"\n${error}`);
        }
      }
    }
  }

  // Init Logo Sets
  const dataLogoSetsFolder = path.join(state.config.flashpointPath, state.config.logoSetsFolderPath);
  await fs.ensureDir(dataLogoSetsFolder);
  try {
    await fs.promises.readdir(dataLogoSetsFolder, { withFileTypes: true })
    .then(async (files) => {
      for (const file of files) {
        if (file.isDirectory()) {
          const logoSet: ILogoSet = {
            id: `SYSTEM.${file.name.replace(' ', '-')}`,
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
            log.debug('Extensions', `Logo set "${logoSet.id}" registered by "SYSTEM"`);
          } catch (error) {
            log.error('Extensions', `Error loading logo set from "SYSTEM"\n${error}`);
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
          log.debug('Extensions', `Logo set "${logoSet.id}" registered by "${ext.manifest.displayName || ext.manifest.name}"`);
        } catch (error) {
          log.error('Extensions', `Error loading logo set from "${c.extId}"\n${error}`);
        }
      }
    }
  }

  // Load Exec Mappings
  loadExecMappingsFile(path.join(state.config.flashpointPath, state.config.jsonFolderPath), content => log.info('Launcher', content))
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
        const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
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
          : path.join(state.config.flashpointPath, state.config.logoFolderPath);
        const filePath = path.join(logoFolder, relativePath);
        if (filePath.startsWith(logoFolder)) {
          serveFile(req, res, filePath);
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
    const url = state.config.onDemandBaseUrl + (state.config.onDemandBaseUrl.endsWith('/') ? '' : '/') + item.subPath;
    const protocol = url.startsWith('https://') ? https : http;
    try {
      protocol.get(url, async (res) => {
        try {
          if (res.statusCode === 200) {
            const imageFolder = path.join(state.config.flashpointPath, state.config.imageFolderPath);
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
