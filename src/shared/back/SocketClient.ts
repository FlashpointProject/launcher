import { parse_message_data, validate_socket_message } from '@shared/socket/shared';
import { api_handle_message, api_register, api_register_any, api_unregister, api_unregister_any, create_api, SocketAPIData } from '@shared/socket/SocketAPI';
import { server_request, server_send, SocketServerClient } from '@shared/socket/SocketServer';
import { BaseSocket, SocketResponseData } from '@shared/socket/types';
import { BackIn, BackInTemplate, BackOut, BackOutTemplate } from './types';

interface SocketConstructor<T> {
  new(url: string): T;
  readonly OPEN: number;
  readonly CLOSED: number;
}

type EVENT = {
  data: unknown;
}

/** Callback that is registered to a specific type. */
type Callback<T, U extends (...args: any[]) => any> = (event: T, ...args: Parameters<U>) => (ReturnType<U> | Promise<ReturnType<U>>)

/** Callback that is registered to all messages. */
type AnyCallback<T, U extends number> = (event: T, type: U, args: any[]) => void

export class SocketClient<SOCKET extends BaseSocket> {
  api: SocketAPIData<BackOut, BackOutTemplate, EVENT> = create_api();

  client: SocketServerClient<BackIn, BackInTemplate, SOCKET> = {
    id: -1, // Unused (only used by servers)
    next_id: 0,
    sent: [],
    socket: undefined,
  };

  url = '';
  secret = '';
  /** Constructor of the socket used by this. */
  socketCon: SocketConstructor<SOCKET>;
  /** If the socket should be kept open. */
  keepOpen = false;

  /** Callbacks for when the socket starts listening. */
  protected when_listeners: (() => void)[] = [];

  constructor(socketCon: SocketConstructor<SOCKET>) {
    this.socketCon = socketCon;
  }

  /** Resolves when the socket starts listening. If it is already listening this is resolved immediately. */
  whenListening(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client.socket && this.client.socket.readyState === WebSocket.OPEN) {
        resolve();
      } else {
        this.when_listeners.push(resolve);
      }
    });
  }

  setSocket(socket: SOCKET): void {
    this.keepOpen = true;
    this.client.socket = socket;
    this.client.socket.onmessage = this.onMessage.bind(this);
    // this.client.socket.onerror = this.onError;
    this.client.socket.onclose = this.onClose.bind(this);
    this.client.socket.onopen = this.onOpen.bind(this);
    this.ensureConnection();
  }

  listen(socket: SOCKET): void {
    this.unlisten();

    this.client.socket = socket;
    socket.onmessage = this.onMessage.bind(this);
    socket.onopen = this.onOpen.bind(this);
    socket.onclose = this.onClose.bind(this);
  }

  unlisten(): void {
    if (this.client.socket) {
      this.client.socket.onmessage = noop;
      this.client.socket = undefined;
    }
  }

  /** Disconnect the socket (and do not reconnect to it). */
  disconnect() {
    this.keepOpen = false;
    if (this.client.socket) {
      this.client.socket.close();
      this.client.socket = undefined;
    }
  }

  /** Open a new socket and try to connect again. */
  reconnect(): void {
    if (this.keepOpen) {
      // Disconnect
      console.log('Reconnecting...');
      if (this.client.socket) {
        this.client.socket.close();
        this.client.socket = undefined;
      }

      // Connect
      console.log('Reconnecting to ' + this.url);
      SocketClient.connect(this.socketCon, this.url, this.secret)
      .then(socket => { this.setSocket(socket); })
      .catch(error => {
        console.error(error);
        setTimeout(() => this.reconnect(), 50);
      });
    }
  }

  private ensureConnection() {
    if (this.keepOpen) {
      if (this.url && (!this.client.socket || this.client.socket.readyState === this.socketCon.CLOSED)) {
        console.log('Closed, try again');
        this.reconnect();
      }
      setTimeout(this.ensureConnection.bind(this), 500);
    }
  }

  // API

  register<TYPE extends BackOut>(type: TYPE, callback: Callback<EVENT, BackOutTemplate[TYPE]>): void {
    api_register(this.api, type, callback);
  }

  unregister(type: BackOut): void {
    api_unregister(this.api, type);
  }

  registerAny(callback: AnyCallback<EVENT, BackOut>): void {
    api_register_any(this.api, callback);
  }

  unregisterAny(callback: AnyCallback<EVENT, BackOut>): void {
    api_unregister_any(this.api, callback);
  }

  /**
   * Send a request to the client.
   * An error is thrown if the server throws an error while handling the request or if the message fails to be sent/received.
   * @param type Type of the request.
   * @param args Arguments of the request.
   * @returns The result of the request.
   */
  request<TYPE extends keyof BackInTemplate>(type: TYPE, ...args: Parameters<BackInTemplate[TYPE]>): Promise<ReturnType<BackInTemplate[TYPE]>> {
    return server_request(this.client, type, ...args);
  }

  send<TYPE extends keyof BackInTemplate>(type: TYPE, ...args: Parameters<BackInTemplate[TYPE]>): void {
    server_send(this.client, type, ...args);
  }

  // Event Handlers

  protected async onMessage(event: EVENT): Promise<void> {
    log('Socket Client - Message received');

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

    // Handle

    const [inc, out] = await api_handle_message(this.api, data, event);

    if (inc) {
      const index = this.client.sent.findIndex(sent => sent.id === inc.id);
      const sent = this.client.sent[index];
      if (sent) {
        log(
          '  Response',
          '\n    ID:    ', inc.id,
          '\n    Result:', inc.result,
          '\n    Error: ', inc.error,
        );

        this.client.sent.splice(index, 1);
        sent.resolve(inc as SocketResponseData<BackInTemplate[BackIn]>);
      } else {
        console.error('Socket Client - Received a response with and ID of a request that is not being handled.');
      }
    }

    if (out && this.client.socket) {
      this.client.socket.send(JSON.stringify(out));
    }
  }

  protected onOpen(): void {
    const listeners = this.when_listeners.slice();
    this.when_listeners.length = 0;

    for (const listener of listeners) {
      listener();
    }
  }

  protected onClose(event: CloseEvent): void {
    console.log(`SharedSocket Closed (Code: ${event.code}, Clean: ${event.wasClean}, Reason: "${event.reason}", URL: "${this.url}").`);
    this.reconnect();
  }

  // Static

  static connect<SOCKET extends BaseSocket>(constructor: SocketConstructor<SOCKET>, url: string, secret: string): Promise<SOCKET> {
    return new Promise<SOCKET>((resolve, reject) => {
      let socket: SOCKET;
      try { socket = new constructor(url); }
      catch (error) { reject(error); return; }

      socket.onopen = () => {
        socket.onmessage = () => { console.log('Client - Got Auth Back!'); resolve(socket); };
        socket.onclose   = () => { reject(new Error('Failed to authenticate to the back.')); };
        socket.send(secret);
      };
    });
  }
}

function log(...args: any[]): void {
  // console.log(...args);
}

function noop() { /* Does nothing. */ }
