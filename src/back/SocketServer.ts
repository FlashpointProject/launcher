import { BackState, OpenExternalFunc, ShowMessageBoxBroadcastFunc, ShowMessageBoxFunc, ShowOpenDialogFunc, ShowSaveDialogFunc } from '@back/types';
import { BackIn, BackInTemplate, BackOut, BackOutTemplate, BackRes, BackResTemplate } from '@shared/back/types';
import { parse_message_data, validate_socket_message } from '@shared/socket/shared';
import { api_handle_message, api_register, api_register_any, api_unregister, api_unregister_any, create_api, SocketAPIData } from '@shared/socket/SocketAPI';
import { create_server, server_add_client, server_broadcast, server_request, server_send, SocketServerData } from '@shared/socket/SocketServer';
import { SocketRequestData, SocketResponseData } from '@shared/socket/types';
import * as ws from 'ws';
import { genPipelineBackOut, MiddlewareRes, PipelineRes } from './SocketServerMiddleware';
import { createNewDialog } from './util/dialog';
import { VERBOSE } from '.';

type BackAPI = SocketAPIData<BackIn, BackInTemplate, MsgEvent>
type BackClients = SocketServerData<BackOut, BackOutTemplate, ws>
export type BackClient = BackClients['clients'][number]

export type MsgEvent = {
  wsEvent: ws.MessageEvent;
  client: BackClient;
}

type RequestQueue = {
  /** Messages that are currently in the queue. */
  items: RequestQueueItem[];
  /** Types of the requests that should be put into this queue. */
  types: BackIn[];
  isExecuting: boolean;
}

type RequestQueueItem = {
  event: ws.MessageEvent;
  req: SocketRequestData;
}

/** Callback that is registered to a specific type. */
type Callback<T, U extends (...args: any[]) => any> = (event: T, ...args: Parameters<U>) => (ReturnType<U> | Promise<ReturnType<U>>)

/** Callback that is registered to all messages. */
type AnyCallback<T, U extends number> = (event: T, type: U, args: any[]) => void

const MAX_RETRIES = 5;

export class SocketServer {
  api: BackAPI = create_api();
  clients: BackClients = create_server();

  retryCounter = 0;

  /** Underlying WebSocket server. */
  server?: ws.Server;
  /** Chosen host */
  host: string | undefined = undefined;
  /** Port the server is listening on (-1 if not listening). */
  port = -1;
  /** Secret value used for authentication. */
  secret: any;

  /** Middleware for BackOut responses */
  middlewareRes: PipelineRes = genPipelineBackOut();

  /** Queues for incoming requests. */
  queues: RequestQueue[] = [];

  lastClient?: BackClient;

  /**
   * Try to listen on one of the ports in the given range (starting from the lowest).
   * If it succeeds it will set the "server" and "port" properties of this object.
   * If it fails it will reject with the error.
   *
   * @param minPort Minimum port number (tried first).
   * @param maxPort Maximum port number (tried last).
   * @param host Server host (determines what clients can connect).
   */
  public async listen(minPort: number, maxPort: number, host: string | undefined): Promise<void> {
    this.host = host;
    const result = await startServer(this.port !== -1 ? this.port : minPort, this.port !== -1 ? this.port : maxPort, host);
    result.server.on('connection', this.onConnect.bind(this));
    this.server = result.server;
    this.port = result.port;
    this.retryCounter = 0; // Reset retries on a good connection
    this.server.on('error', this.onError);
  }

  onError(err: Error) {
    if (this.retryCounter < MAX_RETRIES) {
      if (this.server) { // Try and close / remove server first
        try {
          this.server.close();
        } catch {/** Ignore closure errors */} finally {
          this.server = undefined;
        }
      }
      this.retryCounter++;
      setTimeout(() => { // Sleep then try and connect again
        this.listen(0,0, this.host)
        .catch(this.onError); // If failed to open, keep trying until we get there!
      }, 1500);
    }
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

  // ...

  /**
   * Return a function that opens a message box on a specific client.
   *
   * @param state Back State
   * @param client Client to open a message box on.
   */
  public showMessageBoxBack(state: BackState, client: BackClient): ShowMessageBoxFunc {
    return (options) => {
      return createNewDialog(state, options, client);
    };
  }

  /**
   * Return a function that opens a message box on any connected clients, unawaitable
   *
   * @param state Back State
   */
  public showMessageBoxBackBroadcast(state: BackState): ShowMessageBoxBroadcastFunc {
    return (options) => {
      createNewDialog(state, options);
    };
  }

  /**
   * Return a function that opens a save box on a specific client.
   *
   * @param client Client to open a save box on.
   */
  public showSaveDialogBack(client: BackClient): ShowSaveDialogFunc {
    return (options) => {
      return this.request(client, BackOut.OPEN_SAVE_DIALOG, options);
    };
  }

  /**
   * Return a function that opens a load file box on a specific client.
   *
   * @param client Client to open a load file box on.
   */
  public showOpenDialogFunc(client: BackClient): ShowOpenDialogFunc {
    return (options) => {
      return this.request(client, BackOut.OPEN_OPEN_DIALOG, options);
    };
  }

  /**
   * Return a function that opens an external path at a specific client.
   *
   * @param client Client to open an external path at.
   */
  public openExternal(client: BackClient): OpenExternalFunc {
    return (url, options) => {
      return this.request(client, BackOut.OPEN_EXTERNAL, url, options);
    };
  }

  // Queue

  /**
   * Create and add a new queue.
   *
   * @param types Types of requests that should be put into this queue.
   */
  public addQueue(types: BackIn[]): void {
    for (const queue of this.queues) {
      for (const type of queue.types) {
        if (types.indexOf(type) >= 0) {
          console.error(`A message type MUST NOT appear in more than one queue! (type: "${BackIn[type]}")`);
        }
      }
    }

    this.queues.push({
      items: [],
      types: [ ...types ],
      isExecuting: false,
    });
  }

  // API

  public registerMiddlewareBackRes(middleware: MiddlewareRes): void {
    this.middlewareRes.push(middleware);
  }

  public register<TYPE extends BackIn>(type: TYPE, callback: Callback<MsgEvent, BackInTemplate[TYPE]>): void {
    api_register(this.api, type, callback);
  }

  public unregister(type: BackIn): void {
    api_unregister(this.api, type);
  }

  public registerAny(callback: AnyCallback<MsgEvent, BackIn>): void {
    api_register_any(this.api, callback);
  }

  public unregisterAny(callback: AnyCallback<MsgEvent, BackIn>): void {
    api_unregister_any(this.api, callback);
  }

  // Send

  public async request<TYPE extends BackOut>(client: BackClients['clients'][number], type: TYPE, ...args: Parameters<BackOutTemplate[TYPE]>) {
    // Wrap in context object so it can be mutated by middleware
    const res = {
      type,
      args
    };
    try {
      // Call middleware
      await this.middlewareRes.execute(res);
    } catch (err) {
      if (res.type !== BackOut.LOG_ENTRY_ADDED) {
        log.info('Launcher', 'Error in middleware - Type: ' + BackOut[type]);
      }
    }
    return server_request(client, type, ...args);
  }

  public async send<TYPE extends BackOut>(client: BackClients['clients'][number], type: TYPE, ...args: Parameters<BackOutTemplate[TYPE]>): Promise<void> {
    // Wrap in context object so it can be mutated by middleware
    const res = {
      type,
      args
    };
    try {
      // Call middleware
      await this.middlewareRes.execute(res);
    } catch (err) {
      if (res.type !== BackOut.LOG_ENTRY_ADDED) {
        log.info('Launcher', 'Error in middleware - Type: ' + BackOut[type]);
      }
    }
    return server_send(client, type, ...args);
  }

  public async broadcast<TYPE extends BackOut>(type: TYPE, ...args: Parameters<BackOutTemplate[TYPE]>) {
    // Wrap in context object so it can be mutated by middleware
    const res = {
      type,
      args
    };
    try {
      // Call middleware
      await this.middlewareRes.execute(res);
    } catch (err) {
      if (res.type !== BackOut.LOG_ENTRY_ADDED) {
        log.info('Launcher', 'Error in middleware - Type: ' + BackOut[type]);
      }
    }
    return server_broadcast(this.clients, res.type, ...res.args);
  }

  // Event Handlers

  protected onConnect(socket: ws): void {
    // Read the first message as a "secret key"
    socket.onmessage = (event) => {
      if (event.data === this.secret) {
        const client = server_add_client(this.clients);
        client.socket = socket;

        socket.onmessage = this.onMessage.bind(this); // this.onMessageWrap;

        socket.send('auth successful'); // (reply with some garbage data)
      } else {
        socket.close();
      }
    };
  }

  protected async onMessage(event: ws.MessageEvent): Promise<void> {
    const [parsed_data, parse_error] = parse_message_data(event.data);

    if (parse_error) {
      console.error('Failed to parse message data.', parse_error || '');
      return;
    }

    const [msg, msg_error] = validate_socket_message<any>(parsed_data);

    if (!msg || msg_error) {
      console.error('Failed to validate message data.', msg_error || '');
      return;
    }

    if ('type' in msg) { // Request
      const queue = this.queues.find(q => q.types.indexOf(msg.type) >= 0);

      if (queue) {
        queue.items.push({ event: event, req: msg });

        if (!queue.isExecuting) {
          queue.isExecuting = true;
          while (queue.items.length > 0) {
            const item = queue.items.shift();
            if (item) {
              await this.handleMessage(item.event, item.req);
            }
          }
          queue.isExecuting = false;
        }
      } else {
        this.handleMessage(event, msg);
      }
    } else { // Response
      this.handleMessage(event, msg);
    }
  }

  protected async handleMessage(event: ws.MessageEvent, data: SocketRequestData | SocketResponseData<any>): Promise<void> {
  // Prepare event

    const client = this.clients.clients.find(client => client.socket === event.target);

    if (!client) {
      console.error('Failed to handle message. No client was found for the socket.');
      return;
    }

    const msg_event: MsgEvent = {
      wsEvent: event,
      client: client,
    };

    this.lastClient = client; // Cheap hack for targeting what client to send misc. requests to

    // Handle

    const start = performance.now();
    const [inc, out] = await api_handle_message(this.api, data, msg_event);
    const end = performance.now();
    if (VERBOSE.enabled && 'type' in data && data.type !== BackIn.KEEP_ALIVE) {
      console.log(`${Math.floor(end - start)}ms - "${BackIn[data.type]}"`);
    }

    if (inc) {
      const sent = client.sent.find(s => s.id === data.id);
      if (sent) {
        sent.resolve(inc as SocketResponseData<any>);
      } else {
        console.error(`Received a response with an ID that does not match any sent request from that client! (response id: ${data.id}, client id: ${client.id})`);
      }
    }

    if (out) {
      if ('type' in data && 'result' in out) {
        const res = {
          type: data.type as BackRes,
          res: out.result as ReturnType<BackResTemplate[BackRes]>
        };
        try {
          // Call middleware
          await this.middlewareRes.execute(res);
          // Modify output
          out.result = res.res;
        } catch (err) {
          if (res.type !== BackOut.LOG_ENTRY_ADDED) {
            log.info('Launcher', 'Error in middleware - Type: ' + BackRes[res.type]);
          }
        }
      }
      event.target.send(JSON.stringify(out));
    }
  }
}

type StartServerResult = {
  /** WebSocket server (undefined if it failed to listen). */
  server: ws.Server;
  /** Port it is listening on (-1 if it failed to listen). */
  port: number;
}

/**
 * Try to start a WebSocket server on the first available port in a given range (from lowest to highest).
 *
 * @param minPort Minimum port number (tried first).
 * @param maxPort Maximum port number (tried last).
 * @param host Server host (determines what clients can connect).
 */
function startServer(minPort: number, maxPort: number, host: string | undefined): Promise<StartServerResult> {
  return new Promise((resolve, reject) => {
    let port: number = minPort - 1;
    let server: ws.Server | undefined;
    tryListen();

    // --- Functions ---
    function tryListen() {
      if (server) {
        server.off('error', onError);
        server.off('listening', onListening);
      }

      if (port++ < maxPort) {
        server = new ws.Server({ host, port });
        server.on('error', onError);
        server.on('listening', onListening);
      } else {
        port = -1;
        reject(new Error(`Failed to open server. All attempted ports are already in use (Ports: ${minPort} - ${maxPort}).`));
      }
    }
    function onError(error: Error): void {
      if ((error as any).code === 'EADDRINUSE' || (error as any).code === 'EACCES') {
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
