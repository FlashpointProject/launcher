import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { TagCategory } from '@database/entity/TagCategory';
import { Initial1582714266901 } from '@database/migration/1582714266901-Initial';
import { BackInit, BackInitArgs, BackOut, LanguageChangeData, LanguageListChangeData, ThemeChangeData, ThemeListChangeData } from '@shared/back/types';
import { IBackProcessInfo, IService, RecursivePartial } from '@shared/interfaces';
import { getDefaultLocalization, LangFileContent } from '@shared/lang';
import { PreferencesFile } from '@shared/preferences/PreferencesFile';
import { parseThemeMetaData, themeEntryFilename, ThemeMeta } from '@shared/ThemeFile';
import { createErrorProxy, removeFileExtension, stringifyArray } from '@shared/Util';
import * as child_process from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as http from 'http';
import * as mime from 'mime';
import * as path from 'path';
import 'reflect-metadata';
// Required for the DB Models to function
import 'sqlite3';
import { Connection, ConnectionOptions, createConnection } from 'typeorm';
import * as util from 'util';
import { ConfigFile } from './ConfigFile';
import { CONFIG_FILENAME, PREFERENCES_FILENAME, SERVICES_SOURCE } from './constants';
import { loadExecMappingsFile } from './Execs';
import { ManagedChildProcess } from './ManagedChildProcess';
import { registerRequestCallbacks } from './responses';
import { ServicesFile } from './ServicesFile';
import { SocketServer } from './SocketServer';
import { BackState } from './types';
import { EventQueue } from './util/EventQueue';
import { FolderWatcher } from './util/FolderWatcher';
import { createContainer, exit, log, procToService } from './util/misc';

const readFile  = util.promisify(fs.readFile);

// Make sure the process.send function is available
type Required<T> = T extends undefined ? never : T;
const send: Required<typeof process.send> = process.send
  ? process.send.bind(process)
  : (() => { throw new Error('process.send is undefined.'); });

const state: BackState = {
  isInit: false,
  isExit: false,
  socketServer: new SocketServer(),
  fileServer: new http.Server(onFileServerRequest),
  fileServerPort: -1,
  preferences: createErrorProxy('preferences'),
  config: createErrorProxy('config'),
  configFolder: createErrorProxy('configFolder'),
  exePath: createErrorProxy('exePath'),
  localeCode: createErrorProxy('countryCode'),
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
};

const preferencesFilename = 'preferences.json';
const configFilename = 'config.json';
let connection: Connection | undefined;

const servicesSource = 'Background Services';
registerRequestCallbacks(state);

process.on('message', onProcessMessage);
process.on('disconnect', () => { exit(state); }); // (Exit when the main process does)

async function onProcessMessage(message: any, sendHandle: any): Promise<void> {
  if (state.isInit) { return; }
  state.isInit = true;

  const content: BackInitArgs = JSON.parse(message);
  state.configFolder = content.configFolder;
  state.localeCode = content.localeCode;
  state.exePath = content.exePath;

  state.socketServer.secret = content.secret;

  // Read configs & preferences
  const [pref, conf] = await (Promise.all([
    PreferencesFile.readOrCreateFile(path.join(state.configFolder, PREFERENCES_FILENAME)),
    ConfigFile.readOrCreateFile(path.join(state.configFolder, CONFIG_FILENAME))
  ]));
  state.preferences = pref;
  state.config = conf;

  // Setup DB
  if (!connection) {
    const options: ConnectionOptions = {
      type: 'sqlite',
      database: path.join(state.config.flashpointPath, 'Data', 'flashpoint.sqlite'),
      entities: [Game, AdditionalApp, Playlist, PlaylistGame, Tag, TagAlias, TagCategory],
      migrations: [Initial1582714266901]
    };
    connection = await createConnection(options);
    connection.synchronize();
  }

  // Init services
  try {
    state.serviceInfo = await ServicesFile.readFile(
      path.join(state.config.flashpointPath, state.config.jsonFolderPath),
      error => { log(state, { source: SERVICES_SOURCE, content: error.toString() }); }
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
  loadExecMappingsFile(state.config.flashpointPath, content => log(state, { source: 'Launcher', content }))
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

  function runService(id: string, name: string, info: IBackProcessInfo, detached: boolean): ManagedChildProcess {
    const proc = new ManagedChildProcess(
      id,
      name,
      path.join(state.config.flashpointPath, info.path),
      !!detached,
      info
    );
    proc.on('output', log.bind(undefined, state));
    proc.on('change', () => {
      state.socketServer.broadcast<IService>({
        id: '',
        type: BackOut.SERVICE_CHANGE,
        data: procToService(proc),
      });
    });
    try {
      proc.spawn();
    } catch (error) {
      log(state, {
        source: SERVICES_SOURCE,
        content: `An unexpected error occurred while trying to run the background process "${proc.name}".`+
                 `  ${error.toString()}`
      });
    }
    return proc;
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

async function execProcess(proc: IBackProcessInfo, sync?: boolean): Promise<void> {
  const cwd: string = path.join(state.config.flashpointPath, proc.path);
  log(state, {
    source: SERVICES_SOURCE,
    content: `Executing "${proc.filename}" ${stringifyArray(proc.arguments)} in "${proc.path}"`
  });
  try {
    if (sync) { child_process.execFileSync(  proc.filename, proc.arguments, { cwd: cwd }); }
    else      { await child_process.execFile(proc.filename, proc.arguments, { cwd: cwd }); }
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
