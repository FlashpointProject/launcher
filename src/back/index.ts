import * as http from 'http';
import * as WebSocket from 'ws';
import { Server } from 'ws';
import { BackIn, BackInitArgs, BackOut } from '../shared/back/types';
import { DeepPartial } from '../shared/interfaces';
import { IAppPreferencesData } from '../shared/preferences/interfaces';
import { PreferencesFile } from '../shared/preferences/PreferencesFile';
import { defaultPreferencesData, overwritePreferenceData } from '../shared/preferences/util';

// Make sure the process.send function is available
type Required<T> = T extends undefined ? never : T;
const send: Required<typeof process.send> = process.send
  ? process.send.bind(process)
  : (() => { throw new Error('process.send is undefined.'); });

let isInit: boolean = false;
let server: Server;
let secret: string;
let preferences: IAppPreferencesData;
let preferencesPath: string;
const messageQueue: WebSocket.MessageEvent[] = [];
let isHandling = false;

process.on('message', onProcessMessage);

function onProcessMessage(message: any, sendHandle: any): void {
  if (!isInit) {
    isInit = true;
    const content: BackInitArgs = JSON.parse(message);
    secret = content.secret;
    // Find the first available port in the range
    let serverPort: number = -1;
    for (let port = content.portMin; port <= content.portMax; port++) {
      try {
        server = new Server({ port });
        serverPort = port;
        break;
      } catch (error) { /* Do nothing. */ }
    }
    if (server) { server.on('connection', onConnect); }
    send(serverPort);
  }
}

function onConnect(this: WebSocket, socket: WebSocket, request: http.IncomingMessage): void {
  socket.onmessage = function onAuthMessage(event) {
    if (event.data === secret) {
      socket.onmessage = onMessageWrap;
      socket.send('auth successful'); // (reply with some garbage data)
    } else {
      socket.close();
    }
  };
}

async function onMessageWrap(event: WebSocket.MessageEvent) {
  messageQueue.push(event);

  if (!isHandling) {
    isHandling = true;
    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      if (message) { await onMessage(message); }
    }
    isHandling = false;
  }
}

async function onMessage(event: WebSocket.MessageEvent): Promise<void> {
  const msg = JSON.parse(event.data.toString());
  switch (msg[0]) {
    case BackIn.LOAD_PREFERENCES:
      preferencesPath = msg[1];
      preferences = await PreferencesFile.readOrCreateFile(preferencesPath);
      event.target.send(JSON.stringify([BackOut.LOAD_PREFERENCES_RESPONSE, preferences]));
      break;
    case BackIn.GET_PREFERENCES:
      event.target.send(JSON.stringify([BackOut.GET_PREFERENCES_RESPONSE, preferences]));
      break;
    case BackIn.UPDATE_PREFERENCES:
      const dif = difObjects(defaultPreferencesData, preferences, msg[1]);
      if (dif) {
        overwritePreferenceData(preferences, dif);
        await PreferencesFile.saveFile(preferencesPath, preferences);
      }
      event.target.send(JSON.stringify([BackOut.UPDATE_PREFERENCES_RESPONSE, preferences]));
      break;
  }
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
