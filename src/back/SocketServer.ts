import { BackIn, BackInTemplate, BackOut, BackOutTemplate } from '@shared/back/types';
import { parse_message_data, validate_socket_message } from '@shared/socket/shared';
import { api_handle_message, api_register, api_register_any, api_unregister, api_unregister_any, create_api, SocketAPIData } from '@shared/socket/SocketAPI';
import { create_server, server_add_client, server_broadcast, server_request, server_send, SocketServerData } from '@shared/socket/SocketServer';
import { SocketRequestData } from '@shared/socket/types';
import * as http from 'http';
import * as ws from 'ws';
import { OpenExternalFunc, ShowMessageBoxFunc, ShowOpenDialogFunc, ShowSaveDialogFunc } from './types';

type BackAPI = SocketAPIData<BackIn, BackInTemplate, EVENT>
type BackClients = SocketServerData<BackOut, BackOutTemplate, ws>
type BackClient = BackClients['clients'][number]

type QueuedMessage = {
  event: ws.MessageEvent;
  req: SocketRequestData;
}

type EVENT = {
  wsEvent: ws.MessageEvent;
  client: BackClient;
}

type T  = BackIn
type A  = BackInTemplate
type T2 = BackOut
type A2 = BackOutTemplate

/** Callback that is registered to a specific type. */
type Callback<T, U extends (...args: any[]) => any> = (event: T, ...args: Parameters<U>) => (ReturnType<U> | Promise<ReturnType<U>>)

/** Callback that is registered to all messages. */
type AnyCallback<T, U extends number> = (event: T, type: U, args: any[]) => void

export class SocketServer {
  api: BackAPI = create_api();
  clients: BackClients = create_server();

  /** Underlying WebSocket server. */
  server?: ws.Server;
  /** Port the server is listening on (-1 if not listening). */
  port = -1;
  /** Secret value used for authentication. */
  secret: any;

  queue: QueuedMessage[] = [];
  isHandling = false;

  lastClient?: BackClient;

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
      result.server.on('connection', this.onConnect.bind(this));
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

  // ...

  /**
   * Return a function that opens a message box on a specific client.
   * @param client Client to open a message box on.
   */
  public showMessageBoxBack(client: BackClient): ShowMessageBoxFunc {
    return (options) => {
      return this.request(client, BackOut.OPEN_MESSAGE_BOX, options);
    };
  }

  /**
   * Return a function that opens a save box on a specific client.
   * @param target Client to open a save box on.
   */
  public showSaveDialogBack(client: BackClient): ShowSaveDialogFunc {
    return (options) => {
      return this.request(client, BackOut.OPEN_SAVE_DIALOG, options);
    };
  }

  /**
   * Return a function that opens a load file box on a specific client.
   * @param target Client to open a load file box on.
   */
  public showOpenDialogFunc(client: BackClient): ShowOpenDialogFunc {
    return (options) => {
      return this.request(client, BackOut.OPEN_OPEN_DIALOG, options);
    };
  }

  /**
   * Return a function that opens an external path at a specific client.
   * @param target Client to open an external path at.
   */
  public openExternal(client: BackClient): OpenExternalFunc {
    return (url, options) => {
      return this.request(client, BackOut.OPEN_EXTERNAL, { url, options });
    };
  }

  // API

  public register<TYPE extends T>(type: TYPE, callback: Callback<EVENT, A[TYPE]>): void {
    api_register(this.api, type, callback);
  }

  public unregister(type: T): void {
    api_unregister(this.api, type);
  }

  public registerAny(callback: AnyCallback<EVENT, T>): void {
    api_register_any(this.api, callback);
  }

  public unregisterAny(callback: AnyCallback<EVENT, T>): void {
    api_unregister_any(this.api, callback);
  }

  // Send

  public request<TYPE extends T2>(client: BackClients['clients'][number], type: TYPE, ...args: Parameters<A2[TYPE]>) {
    return server_request(client, type, ...args);
  }

  public send<TYPE extends T2>(client: BackClients['clients'][number], type: TYPE, ...args: Parameters<A2[TYPE]>): void {
    server_send(client, type, ...args);
  }

  public broadcast<TYPE extends T2>(type: TYPE, ...args: Parameters<A2[TYPE]>): void {
    server_broadcast(this.clients, type, ...args);
  }

  // Event Handlers

  protected onConnect(socket: ws, request: http.IncomingMessage): void {
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

  /*
  private onMessageWrap = async (event: ws.MessageEvent): Promise<void> => {
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
  */

  protected async onMessage(event: ws.MessageEvent): Promise<void> {
    log('Socket Server - Message received');

    // Parse

    const [parsed_data, parse_error] = parse_message_data(event.data);

    if (parse_error) {
      console.error('Failed to parse message data.', parse_error || '');
      return;
    }

    // Validate

    const [data, data_error] = validate_socket_message<any>(parsed_data);

    if (!data || data_error) {
      console.error('Failed to validate message data.', data_error || '');
      return;
    }

    // Prepare event

    const client = this.clients.clients.find(client => client.socket === event.target);

    if (!client) {
      console.error('Failed to handle message. No client was found for the socket.');
      return;
    }

    const msg_event: EVENT = {
      wsEvent: event,
      client: client,
    };

    this.lastClient = client; // Cheap hack for targeting what client to send misc. requests to

    // Handle

    const [inc, out] = await api_handle_message(this.api, data, msg_event);

    if (inc) {
      // @TODO Support incoming responses
    }

    if (out) {
      event.target.send(JSON.stringify(out));
    }
  }
}

type StartServerResult = {
  /** WebScoket server (undefined if it failed to listen). */
  server: ws.Server;
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

function log(...args: any[]): void {
  // console.log(...args);
}
