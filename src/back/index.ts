import * as child_process from 'child_process';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as WebSocket from 'ws';
import { AddLogData, BackIn, BackInit, BackInitArgs, BackOut, BrowseChangeData, BrowseViewAllData, BrowseViewPageData, BrowseViewPageResponseData, DeleteGameData, GetAllGamesResponseData, GetGameData, GetGameResponseData, GetMainInitDataResponse, GetRendererInitDataResponse, LaunchAddAppData, LaunchGameData, SaveGameData, ServiceActionData, ViewGame, WrappedRequest, WrappedResponse } from '../shared/back/types';
import { ConfigFile } from '../shared/config/ConfigFile';
import { overwriteConfigData } from '../shared/config/util';
import { FilterGameOpts, filterGames, orderGames } from '../shared/game/GameFilter';
import { IAdditionalApplicationInfo, IGameInfo } from '../shared/game/interfaces';
import { DeepPartial, IBackProcessInfo, IService, ProcessAction } from '../shared/interfaces';
import { ILogEntry, ILogPreEntry } from '../shared/Log/interface';
import { GameOrderBy, GameOrderReverse } from '../shared/order/interfaces';
import { PreferencesFile } from '../shared/preferences/PreferencesFile';
import { defaultPreferencesData, overwritePreferenceData } from '../shared/preferences/util';
import { createErrorProxy, deepCopy, isErrorProxy, stringifyArray } from '../shared/Util';
import { GameManager } from './game/GameManager';
import { GameLauncher } from './GameLauncher';
import { ManagedChildProcess } from './ManagedChildProcess';
import { ServicesFile } from './ServicesFile';
import { BackQuery, BackState } from './types';

// Make sure the process.send function is available
type Required<T> = T extends undefined ? never : T;
const send: Required<typeof process.send> = process.send
  ? process.send.bind(process)
  : (() => { throw new Error('process.send is undefined.'); });

const state: BackState = {
  isInit: false,
  server: createErrorProxy('server'),
  imageServer: new http.Server(onImageServerRequest),
  imageServerPort: -1,
  secret: createErrorProxy('secret'),
  preferences: createErrorProxy('preferences'),
  config: createErrorProxy('config'),
  configFolder: createErrorProxy('configFolder'),
  gameManager: new GameManager(),
  messageQueue: [],
  isHandling: false,
  init: {
    0: false,
  },
  initEmitter: new EventEmitter() as any,
  queries: {},
  log: [],
  serviceInfo: undefined,
  services: {},
};

const preferencesFilename = 'preferences.json';
const configFilename = 'config.json';

const servicesSource = 'Background Services';

process.on('message', onProcessMessage);

async function onProcessMessage(message: any, sendHandle: any): Promise<void> {
  if (!state.isInit) {
    state.isInit = true;
    const content: BackInitArgs = JSON.parse(message);
    state.secret = content.secret;
    state.configFolder = content.configFolder;
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
        state.services.redirector = runService('redirector', 'Redirector', redirectorInfo, true);
      }
    }
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
      let port = state.config.imagesPortMin;
      state.imageServer.once('listening', onListening);
      state.imageServer.on('error', onError);
      tryListen();

      function tryListen() {
        if (port <= state.config.imagesPortMax) {
          state.imageServer.listen(port, 'localhost');
          port += 1;
        } else {
          state.imageServer.off('listening', onListening);
          state.imageServer.off('error', onError);
          resolve(-1);
        }
      }
      function onListening() { resolve(port - 1); }
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
      };

      const hash = createHash('sha256').update(JSON.stringify(query)).digest('base64');
      let cache = state.queries[hash];
      if (!cache) {
        // @TODO Start clearing the cache if it gets too full

        const results = searchGames({
          extreme: query.extreme,
          broken: query.broken,
          query: query.search,
          orderBy: query.orderBy,
          orderReverse: query.orderReverse,
          library: query.library,
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
      }
    } break;
  }
}

function onImageServerRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  try {
    const url = req.url || '';
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

  } catch (error) { console.log(error); }
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
  orderGames(foundGames, { orderBy: opts.orderBy, orderReverse: opts.orderReverse });

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
