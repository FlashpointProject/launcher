import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { Initial1583180635980 } from '@database/migration/1583180635980-Initial';
import { BackInit, BackInitArgs, BackOut, LanguageChangeData, LanguageListChangeData, ThemeChangeData, ThemeListChangeData } from '@shared/back/types';
import { IBackProcessInfo, RecursivePartial } from '@shared/interfaces';
import { getDefaultLocalization, LangFileContent } from '@shared/lang';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { parseThemeMetaData, themeEntryFilename, ThemeMeta } from '@shared/ThemeFile';
import { createErrorProxy, removeFileExtension, stringifyArray } from '@shared/Util';
import * as child_process from 'child_process';
import { EventEmitter } from 'events';
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
import { registerRequestCallbacks } from './responses';
import { ServicesFile } from './ServicesFile';
import { SocketServer } from './SocketServer';
import { BackState, ImageDownloadItem } from './types';
import { EventQueue } from './util/EventQueue';
import { FolderWatcher } from './util/FolderWatcher';
import { createContainer, exit, log, newLogEntry, runService } from './util/misc';

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
  gameManager: {
    platformsPath: '',
    saveQueue: new EventQueue(),
    log: (content) => log(state, { source: 'GameManager', content }),
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
  services: {},
  languageWatcher: new FolderWatcher(),
  languageQueue: new EventQueue(),
  languages: [],
  languageContainer: getDefaultLocalization(), // Cache of the latest lang container - used by back when it needs lang strings
  themeWatcher: new FolderWatcher(),
  themeQueue: new EventQueue(),
  themeFiles: [],
  playlists: [],
  execMappings: [],
  lastLinkedCurationKey: '',
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
  state.configFolder = content.configFolder;
  state.localeCode = content.localeCode;
  state.exePath = content.exePath;
  state.version = content.version;

  state.socketServer.secret = content.secret;

  // Read configs & preferences
  const [pref, conf] = await (Promise.all([
    PreferencesFile.readOrCreateFile(path.join(state.configFolder, PREFERENCES_FILENAME)),
    ConfigFile.readOrCreateFile(path.join(state.configFolder, CONFIG_FILENAME))
  ]));
  state.preferences = pref;
  state.config = conf;

  // Setup DB
  if (!state.connection) {
    const options: ConnectionOptions = {
      type: 'sqlite',
      database: path.join(state.config.flashpointPath, 'Data', 'flashpoint.sqlite'),
      entities: [Game, AdditionalApp, Playlist, PlaylistGame, Tag, TagAlias, TagCategory],
      migrations: [Initial1583180635980]
    };
    state.connection = await createConnection(options);
    state.connection.synchronize();
  }

  // Init services
  try {
    state.serviceInfo = await ServicesFile.readFile(
      path.join(state.config.flashpointPath, state.config.jsonFolderPath),
      state.config,
      error => { log(state, { source: SERVICES_SOURCE, content: error.toString() }); }
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
      state.services.server = runService(state, 'server', 'Server', chosenServer || state.serviceInfo.server[0]);
    }
    // Start file watchers
    for (let i = 0; i < state.serviceInfo.watch.length; i++) {
      const filePath = state.serviceInfo.watch[i];
      try {
        const tail = new Tail(filePath, { follow: true });
        tail.on('line', (data) => {
          log(state, newLogEntry('Log Watcher', data));
        });
        tail.on('error', (error) => {
          log(state, newLogEntry('Log Watcher', `Error while watching file "${filePath}" - ${error}`));
        });
        log(state, newLogEntry('Log Watcher', `Watching file "${filePath}"`));
      } catch (error) {
        log(state, newLogEntry('Log Watcher', `Failed to watch file "${filePath}" - ${error}`));
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
  const langFolder = path.join(content.isDev ? process.cwd() : content.exePath, 'lang');
  fs.stat(langFolder, (error) => {
    if (!error) { state.languageWatcher.watch(langFolder); }
    else {
      log(state, { source: 'Back', content: (typeof error.toString === 'function') ? error.toString() : (error + '') });
      if (error.code === 'ENOENT') {
        log(state, { source: 'Back', content: `Failed to watch language folder. Folder does not exist (Path: "${langFolder}")` });
      } else {
        log(state, { source: 'Back', content: (typeof error.toString === 'function') ? error.toString() : (error + '') });
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
          state.socketServer.broadcast<ThemeChangeData>({
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
            state.socketServer.broadcast<ThemeListChangeData>({
              id: '',
              type: BackOut.THEME_LIST_CHANGE,
              data: state.themeFiles,
            });
          } else { // (Non-entry file was removed)
            // A file in a theme has been removed
            state.socketServer.broadcast<ThemeChangeData>({
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
          state.socketServer.broadcast<ThemeChangeData>({
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
              const data = await fs.readFile(entryPath, 'utf8');
              meta = parseThemeMetaData(data) || {};
            } catch (error) { console.warn(`Failed to load theme entry file (File: "${entryPath}")`, error); }
            if (meta) {
              state.themeFiles.push({
                basename: folderName || filename,
                meta: meta,
                entryPath: path.relative(themeFolder, entryPath),
              });
              if (doBroadcast) {
                state.socketServer.broadcast<ThemeListChangeData>({
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
      log(state, { source: 'Back', content: (typeof error.toString === 'function') ? error.toString() : (error + '') });
      if (error.code === 'ENOENT') {
        log(state, { source: 'Back', content: `Failed to watch theme folder. Folder does not exist (Path: "${themeFolder}")` });
      } else {
        log(state, { source: 'Back', content: (typeof error.toString === 'function') ? error.toString() : (error + '') });
      }
    }
  });

  // Load Exec Mappings
  loadExecMappingsFile(path.join(state.config.flashpointPath, state.config.jsonFolderPath), content => log(state, { source: 'Launcher', content }))
  .then(data => {
    state.execMappings = data;
  })
  .catch(error => {
    log(state, {
      source: 'Launcher',
      content: `Failed to load exec mappings file. Ignore if on Windows. - ${error}`,
    });
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
        log(state, {
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
  if (state.socketServer.port < 0) {
    setImmediate(exit);
  }

  // Respond
  send(state.socketServer.port);
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

/**
 * Execute a back process (a)synchronously.
 * @param proc Back process to run.
 * @param sync If the process should run synchronously (block this thread until it exits).
 */
async function execProcess(proc: IBackProcessInfo, sync?: boolean): Promise<void> {
  const cwd: string = path.join(state.config.flashpointPath, proc.path);
  log(state, {
    source: SERVICES_SOURCE,
    content: `Executing "${proc.filename}" ${stringifyArray(proc.arguments)} in "${proc.path}"`
  });
  try {
    if (sync) {
      child_process.execFileSync(proc.filename, proc.arguments, { cwd: cwd });
    } else {
      const childProc = child_process.execFile(proc.filename, proc.arguments, { cwd: cwd });
      await awaitEvents(childProc, ['exit', 'error']);
    }
  } catch (error) {
    log(state, {
      source: SERVICES_SOURCE,
      content: `An unexpected error occurred while executing a command:\n  "${error}"`
    });
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

        for (let event of safeEvents) {
          emitter.off(event, listener);
        }

        resolve();
      }
    };

    for (let event of safeEvents) {
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
