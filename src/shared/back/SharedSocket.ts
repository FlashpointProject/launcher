import { EventEmitter } from 'events';
import * as uuid from 'uuid/v4';
import { BackIn, WrappedRequest, WrappedResponse } from './types';

type CB = ((ev: any) => any) | null;

interface Socket {
  onclose:   CB;
  onerror:   CB;
  onmessage: CB;
  onopen:    CB;
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  readyState: number;
}

interface SocketConstructor<T> {
  new(url: string): T;
  readonly OPEN: number;
  readonly CLOSED: number;
}

type SocketCloseEvent = Pick<CloseEvent, 'reason' | 'code' | 'wasClean'>

export interface SharedSocket<T extends Socket> {
  on(event: 'connect', listener: () => void): this;
  /** Fired when a message is received. */
  on(event: 'message', listener: (event: WrappedResponse) => void): this;
}

export class SharedSocket<T extends Socket> extends EventEmitter {
  url: string = '';
  secret: string = '';
  socket: T | undefined;
  /** Constructor of the socket used by this. */
  socketCon: SocketConstructor<T>;
  /** If the socket should be kept open. */
  keepOpen: boolean = false;

  constructor(socketCon: SocketConstructor<T>) {
    super();
    this.socketCon = socketCon;
  }

  setSocket(socket: T): void {
    this.keepOpen = true;
    this.socket = socket;
    this.socket.onmessage = this.onMessage;
    this.socket.onerror = this.onError;
    this.socket.onclose = this.onClose;
    this.socket.onopen = this.onOpen;
    this.ensureConnection();
  }

  private onMessage = (event: MessageEvent): void => {
    // Fit response into wrapped type
    const response: WrappedResponse = JSON.parse(event.data.toString());
    // Emit response to whoever sent it
    this.emit(response.id, response);
    // Emit to any message watchers
    this.emit('message', response);
  }

  private onError = (event: Event): void => {
    console.log('SharedSocket Error:', event);
    this.reconnect();
  }

  private onClose = (event: SocketCloseEvent): void => {
    console.log(`SharedSocket Closed (Code: ${event.code}, Clean: ${event.wasClean}, Reason: "${event.reason}", URL: "${this.url}").`);
    this.reconnect();
  }

  private onOpen = (event: Event): void => {
    // console.log('SharedSocket Open:', event);
  }

  public send<T, U = any>(type: BackIn, data: U, callback?: (res: WrappedResponse<T>) => void): boolean {
    return this.sendReq({
      id: uuid(),
      type: type,
      data: data
    }, callback);
  }

  public sendP<T, U = any>(type: BackIn, data: U): Promise<WrappedResponse<T>> {
    return new Promise(resolve => {
      this.sendReq<T, U>({
        id: uuid(),
        type: type,
        data: data
      }, res => { resolve(res); });
    });
  }

  /**
   * Send a request.
   * @param request Request to send.
   * @param callback Called when a response with the same ID is received.
   * @returns If the request was successfully sent.
   */
  public sendReq<T, U = any>(request: WrappedRequest<U>, callback?: (res: WrappedResponse<T>) => void): boolean {
    // console.log('OUT', request);
    if (this.socket && this.socket.readyState === this.socketCon.OPEN) {
      // Register callback
      if (callback) { this.once(request.id, callback); }
      // Send message
      this.socket.send(JSON.stringify(request));
      return true;
    } else {
      console.warn(
        'Failed to send message! ' +
        (this.socket ? 'Socket is not open!' : 'There is no socket!') +
        ` (ID: "${request.id}", Type: ${request.type} / "${BackIn[request.type]}")`
      );
      return false;
    }
  }

  /** Disconnect the socket (and do not reconnect to it). */
  public disconnect() {
    this.keepOpen = false;
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }

  /** Ensure that the connection stays open (by checking its status at an interval and reconnect). */
  private ensureConnection = () => {
    if (this.keepOpen) {
      if (this.url && (!this.socket || this.socket.readyState === this.socketCon.CLOSED)) {
        console.log('Closed, try again');
        this.reconnect();
      }
      setTimeout(this.ensureConnection, 500);
    }
  }

  /** Open a new socket and try to connect again. */
  public reconnect(): void {
    if (this.keepOpen) {
      console.log('Reconnecting...');
      // Disconnect
      if (this.socket) {
        this.socket.close();
        this.socket = undefined;
      }
      console.log('Reconnecting to ' + this.url);
      // Connect
      SharedSocket.connect(this.socketCon, this.url, this.secret)
      .then(socket => { this.setSocket(socket); })
      .catch(error => {
        console.error(error);
        setTimeout(() => this.reconnect(), 50);
      });
    }
  }

  static connect<T extends Socket>(constructor: SocketConstructor<T>, url: string, secret: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let socket: T;
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
