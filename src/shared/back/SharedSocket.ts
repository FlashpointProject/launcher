import { EventEmitter } from 'events';
import { BackIn, WrappedRequest, WrappedResponse } from './types';
import * as uuid from 'uuid';

export interface SharedSocket {
  /** Listen for all responses */
  on(event: 'response', listener: (event: WrappedResponse) => void): this;
}

export class SharedSocket extends EventEmitter {
  socket: WebSocket;

  constructor(socket: WebSocket) {
    super();
    this.socket = socket;
    this.socket.onmessage = this.onMessage;
  }

  private onMessage = (event: MessageEvent): void => {
    // Fit response into wrapped type
    const response: WrappedResponse = JSON.parse(event.data.toString());
    // Emit response to whoever sent it
    this.emit(response.id, response);
    // Emit to any message watchers
    this.emit('response', response);
  }

  public send<T, U = any>(type: BackIn, data: U, callback?: (res: WrappedResponse<T>) => void): void {
    // Create request
    const request: WrappedRequest = {
      id: uuid(),
      type: type,
      data: data
    };
    // Register callback
    if (callback) { this.once(request.id, callback); }
    // Send message
    this.socket.send(JSON.stringify(request));
  }

  public sendReq<T, U = any>(request: WrappedRequest<U>, callback?: (res: WrappedResponse<T>) => void): void {
    console.log(request)
    // Register callback
    if (callback) { this.once(request.id, callback); }
    // Send message
    this.socket.send(JSON.stringify(request));
  }
}
