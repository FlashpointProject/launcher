import { BackIn, BackOut, OpenDialogData, OpenExternalData, WrappedRequest, WrappedResponse } from '@shared/back/types';
import { Coerce } from '@shared/utils/Coerce';
import { EventEmitter } from 'events';
import * as http from 'http';
import * as WebSocket from 'ws';
import { EmitterPart, OpenDialogFunc, OpenExternalFunc } from './types';
import { uuid } from './util/uuid';

type SocketEmitter = (
  EmitterPart<string, RequestCallback<any>>
) // & EventEmitter

type RequestCallback<T> = (event: WebSocket.MessageEvent, req: WrappedRequest<T>) => Promise<void> | void;

type QueuedMessage<T> = {
  event: WebSocket.MessageEvent;
  req: WrappedRequest<T>;
}

export class SocketServer {
  /** Underlying WebSocket server. */
  public server?: WebSocket.Server;
  /** Port the server is listening on (-1 if not listening). */
  public port: number = -1;
  /** Secret value used for authentication. */
  public secret: any;

  private registered: Record<BackIn, RequestCallback<any> | undefined> = {} as any;
  private emitter: SocketEmitter = new EventEmitter();
  private queue: QueuedMessage<any>[] = [];
  private isHandling: boolean = false;


  /**
   * Try to listen on one of the ports in the given range (starting from the lowest).
   * If it succeedes it will set the "server" and "port" properties of this object.
   * If it fails it will reject with the error.
   * @param minPort Minimum port number (tried first).
   * @param maxPort Maximum port number (tried last).
   * @param host Server host (determines what clients can connect).
   */
  public listen(minPort: number, maxPort: number, host: string | undefined): Promise<void> {
    return startServer(minPort, maxPort, host)
    .then(result => {
      result.server.on('connection', this.onConnect);
      this.server = result.server;
      this.port = result.port;
    });
  }

  /** Close the server. */
  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close(error => {
          if (error) { reject(error); }
          else       { resolve();     }
        });
      } else {
        reject(new Error('Failed to close server. No server is open.'));
      }
    });
  }

  public register<T = undefined>(type: BackIn, cb: RequestCallback<T>): void {
    if (this.registered[type]) {
      console.warn(`SocketServer - Registering a callback over an existing one (Type: ${type} / "${BackIn[type]}").`);
    }
    this.registered[type] = cb;
  }

  /**
   * Broadcast a message to all connected and authenticated clients.
   * @param response Message to send.
   */
  public broadcast<T>(response: WrappedResponse<T>): void {
    if (this.server) {
      const message = JSON.stringify(response);
      this.server.clients.forEach(socket => {
        if (socket.onmessage === this.onMessageWrap) { // (Check if authorized)
          socket.send(message);
        }
      });
    }
  }

  /**
   * Return a function that opens a dialog window at a specific client.
   * @param target Client to open a dialog window at.
   */
  public openDialog(target: WebSocket): OpenDialogFunc {
    return (options) => {
      return new Promise<number>((resolve, reject) => {
        const id = uuid();

        this.emitter.once(id, msg => {
          const [req, error] = parseWrappedRequest(msg.data);
          if (error || !req) {
            console.error('Failed to parse incoming WebSocket request:\n', error);
            reject(new Error('Failed to parse incoming WebSocket request.'));
          } else {
            resolve(req.data);
          }
        });

        respond<OpenDialogData>(target, {
          id,
          data: options,
          type: BackOut.OPEN_DIALOG,
        });
      });
    };
  }

  /**
   * Return a function that opens an external path at a specific client.
   * @param target Client to open an external path at.
   */
  public openExternal(target: WebSocket): OpenExternalFunc {
    return (url, options) => {
      return new Promise<void>((resolve, reject) => {
        const id = uuid();

        this.emitter.once(id, msg => {
          const [req, error] = parseWrappedRequest(msg.data);
          if (error || !req) {
            console.error('Failed to parse incoming WebSocket request:\n', error);
            reject(new Error('Failed to parse incoming WebSocket request.'));
          } else {
            if (req.data && req.data.error) {
              const error = new Error();
              error.name = req.data.error.name;
              error.message = req.data.error.message;
              error.stack = req.data.error.stack;
              reject(error);
            } else {
              resolve();
            }
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

  private onConnect = (socket: WebSocket, request: http.IncomingMessage): void => {
    socket.onmessage = (event) => {
      if (event.data === this.secret) {
        socket.onmessage = this.onMessageWrap;
        socket.send('auth successful'); // (reply with some garbage data)
      } else {
        socket.close();
      }
    };
  }

  private onMessageWrap = async (event: WebSocket.MessageEvent): Promise<void> => {
    const [req, error] = parseWrappedRequest(event.data);
    if (error || !req) {
      console.error('Failed to parse incoming WebSocket request:\n', error);
      return;
    }

    // Responses are handled instantly - requests and handled in queue
    // (The back could otherwise "soft lock" if it makes a request to the renderer while it is itself handling a request)
    if (req.type === BackIn.GENERIC_RESPONSE) {
      this.emitter.emit(req.id, event, req);
    } else {
      this.queue.push({ event, req });
      if (!this.isHandling) {
        this.isHandling = true;
        while (this.queue.length > 0) {
          const message = this.queue.shift();
          if (message) { await this.onMessage(message); }
        }
        this.isHandling = false;
      }
    }
  }

  private async onMessage(message: QueuedMessage<any>): Promise<void> {
    this.emitter.emit(message.req.id, message.event, message.req);

    const callback = this.registered[message.req.type];
    if (callback) {
      try {
        await callback(message.event, message.req);
      } catch (error) {
        console.warn(`Error thrown inside a request callback (Type: ${message.req.type} / "${BackIn[message.req.type]}")!`, error);
      }
    } else {
      console.warn(`Failed to handle incomming request. No callback is registered for the requests type (Type: ${message.req.type} / "${BackIn[message.req.type]}").`);
    }
  }
}

export function respond<T>(target: WebSocket, response: WrappedResponse<T>): void {
  // console.log('RESPOND', response);
  target.send(JSON.stringify(response));
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

type StartServerResult = {
  /** WebScoket server (undefined if it failed to listen). */
  server: WebSocket.Server;
  /** Port it is listening on (-1 if it failed to listen). */
  port: number;
}

/**
 * Try to start a WebSocket server on the first available port in a given range (from lowest to highest).
 * @param minPort Minimum port number (tried first).
 * @param maxPort Maximum port number (tried last).
 * @param host Server host (determines what clients can connect).
 */
function startServer(minPort: number, maxPort: number, host: string | undefined): Promise<StartServerResult> {
  return new Promise((resolve, reject) => {
    let port: number = minPort - 1;
    let server: WebSocket.Server | undefined;
    tryListen();

    // --- Functions ---
    function tryListen() {
      if (server) {
        server.off('error', onError);
        server.off('listening', onListening);
      }

      if (port++ < maxPort) {
        server = new WebSocket.Server({ host, port });
        server.on('error', onError);
        server.on('listening', onListening);
      } else {
        port = -1;
        reject(new Error(`Failed to open server. All attempted ports are already in use (Ports: ${minPort} - ${maxPort}).`));
      }
    }
    function onError(error: Error): void {
      if ((error as any).code === 'EADDRINUSE') {
        tryListen();
      } else {
        reject(error);
      }
    }
    function onListening() {
      if (server) {
        server.off('error', onError);
        server.off('listening', onListening);
        resolve({ server, port });
      } else {
        reject(new Error('Failed to open server. Server is undefined even though it was successfully started (bug).')); // (This should never happen)
      }
    }
  });
}
