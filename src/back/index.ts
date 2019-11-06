import * as http from 'http';
import * as path from 'path';
import * as WebSocket from 'ws';
import { Server } from 'ws';
import { BackIn, BackInitArgs, BackOut, GetBoringStuffData, GetConfigAndPrefsResponse, WrappedRequest, WrappedResponse } from '../shared/back/types';
import { ConfigFile } from '../shared/config/ConfigFile';
import { overwriteConfigData } from '../shared/config/util';
import { DeepPartial } from '../shared/interfaces';
import { PreferencesFile } from '../shared/preferences/PreferencesFile';
import { defaultPreferencesData, overwritePreferenceData } from '../shared/preferences/util';
import { createErrorProxy, deepCopy } from '../shared/Util';
import { GameManager } from './game/GameManager';
import { BackState } from './types';

// Make sure the process.send function is available
type Required<T> = T extends undefined ? never : T;
const send: Required<typeof process.send> = process.send
  ? process.send.bind(process)
  : (() => { throw new Error('process.send is undefined.'); });

const state: BackState = {
  isInit: false,
  server: createErrorProxy('server'),
  secret: createErrorProxy('secret'),
  preferences: createErrorProxy('preferences'),
  config: createErrorProxy('config'),
  configFolder: createErrorProxy('configFolder'),
  gameManager: new GameManager(),
  messageQueue: [],
  isHandling: false,
};

const preferencesFilename = 'preferences.json';
const configFilename = 'config.json';

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
    // Init Game manager
    state.gameManager.loadPlatforms(path.join(state.config.flashpointPath, state.config.platformFolderPath));
    // Find the first available port in the range
    let serverPort: number = -1;
    for (let port = state.config.backPortMin; port <= state.config.backPortMax; port++) {
      try {
        state.server = new Server({ port });
        serverPort = port;
        break;
      } catch (error) { /* Do nothing. */ }
    }
    if (state.server) { state.server.on('connection', onConnect); }
    send(serverPort);
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
    case BackIn.GET_CONFIG_AND_PREFERENCES:
      const data: GetConfigAndPrefsResponse = {
        preferences: state.preferences,
        config: state.config,
      };
      respond(event.target, {
        id: req.id,
        type: BackOut.GET_CONFIG_AND_PREFERENCES_RESPONSE,
        data,
      });
      break;

    case BackIn.GET_BORING_STUFF:
      const boring: GetBoringStuffData = {
        totalGames: state.gameManager.platforms.reduce((r, p) => r + p.collection.games.length, 0),
      };
      respond(event.target, {
        id: req.id,
        type: BackOut.GET_BORING_STUFF_RESPONSE,
        data: boring,
      });
      break;

    case BackIn.UPDATE_CONFIG:
      const newConfig = deepCopy(state.config);
      overwriteConfigData(newConfig, req.data);
      await ConfigFile.saveFile(path.join(state.configFolder, configFilename), newConfig);
      respond(event.target, {
        id: req.id,
        type: BackOut.UPDATE_CONFIG_RESPONSE,
      });
      break;

    case BackIn.UPDATE_PREFERENCES:
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
      break;
  }
}

function respond(target: WebSocket, response: WrappedResponse): void {
  target.send(JSON.stringify(response));
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
