import { EventEmitter } from 'events';
import * as uuid from 'uuid';
import { BackIn, WrappedRequest, WrappedResponse } from './types';

export interface SharedSocket {
  /** Fired when a message is received. */
  on(event: 'message', listener: (event: WrappedResponse) => void): this;
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
    this.emit('message', response);
  }

  public send<T, U = any>(type: BackIn, data: U, callback?: (res: WrappedResponse<T>) => void): void {
    this.sendReq({
      id: uuid(),
      type: type,
      data: data
    }, callback);
  }

  public sendReq<T, U = any>(request: WrappedRequest<U>, callback?: (res: WrappedResponse<T>) => void): void {
    console.log('OUT', request)
    // Register callback
    if (callback) { this.once(request.id, callback); }
    // Send message
    this.socket.send(JSON.stringify(request));
  }
}
