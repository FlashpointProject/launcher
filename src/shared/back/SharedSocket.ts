import { EventEmitter } from 'events';
import * as uuid from 'uuid/v4';
import { BackIn, WrappedRequest, WrappedResponse } from './types';

export interface SharedSocket {
  on(event: 'connect', listener: () => void): this;
  /** Fired when a message is received. */
  on(event: 'message', listener: (event: WrappedResponse) => void): this;
}

export class SharedSocket extends EventEmitter {
  url: string = '';
  secret: string = '';
  socket: WebSocket | undefined;

  constructor() {
    super();
    // Reconnect if disconnected (at an interval)
    setInterval(() => {
      if (this.url && (!this.socket || this.socket.readyState === WebSocket.CLOSED)) {
        this.reconnect();
      }
    }, 500);
  }

  setSocket(socket: WebSocket): void {
    this.socket = socket;
    this.socket.onmessage = this.onMessage;
    this.socket.onerror = this.onError;
    this.socket.onclose = this.onClose;
    this.socket.onopen = this.onOpen;
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

  private onClose = (event: CloseEvent): void => {
    console.log('SharedSocket Closed:', event);
    this.reconnect();
  }

  private onOpen = (event: Event): void => {
    console.log('SharedSocket Open:', event);
  }

  public send<T, U = any>(type: BackIn, data: U, callback?: (res: WrappedResponse<T>) => void): void {
    this.sendReq({
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

  public sendReq<T, U = any>(request: WrappedRequest<U>, callback?: (res: WrappedResponse<T>) => void): void {
    // console.log('OUT', request);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Register callback
      if (callback) { this.once(request.id, callback); }
      // Send message
      this.socket.send(JSON.stringify(request));
    } else {
      console.warn(
        'Failed to send message! ' +
        this.socket
          ? 'Socket is not open!'
          : 'There is no socket!'
        );
    }
  }

  /** Open a new socket and try to connect again. */
  private reconnect(): void {
    console.log('Reconnecting...');
    // Disconnect
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
    // Connect
    SharedSocket.connect(this.url, this.secret)
    .then(socket => { window.External.back.setSocket(socket); })
    .catch(error => {
      console.error(error);
      setTimeout(() => this.reconnect(), 50);
    });
  }

  static connect(url: string, secret: string): Promise<WebSocket> {
    return new Promise<WebSocket>((resolve, reject) => {
      let socket: WebSocket;
      try { socket = new WebSocket(url); }
      catch (error) { reject(error); return; }

      socket.onopen = () => {
        socket.onmessage = () => { resolve(socket); };
        socket.onclose   = () => { reject(new Error('Failed to authenticate to the back.')); };
        socket.send(secret);
      };
    });
  }
}
