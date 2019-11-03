import { EventEmitter } from 'events';
import { BackIn, WrappedRequest, WrappedResponse } from './types';
import * as uuid from 'uuid';

export interface SharedSocket {
  /** Listen for all responses */
  on(event: 'response', listener: (event: WrappedResponse) => void): this;
}

export class SharedSocket extends EventEmitter {
  private backSocket: WebSocket;

  constructor(backSocket: WebSocket) {
    super();
    this.backSocket = backSocket;
    this.backSocket.onmessage = this.onMessage;
  }

  private onMessage(event: MessageEvent) {
    // Fit response into wrapped type
    const response = JSON.parse(event.data.toString());
    const parsedResponse: WrappedResponse = { ...response };
    // Emit response to whoever sent it
    this.emit(parsedResponse.id, parsedResponse);
    // Emit to any message watchers
    this.emit('response', parsedResponse);
  }

  public send(requestType: BackIn, data: any, callback?: (res: WrappedResponse) => void) {
    // Create request
    const id = uuid();
    const message: WrappedRequest = {
      id: id,
      requestType: requestType,
      data: data
    };
    this.send(requestType, callback);
    const formedMessage = JSON.stringify(message);
    // Register callback
    if (callback) {
      this.once(id, callback);
    }
    // Send message
    this.backSocket.send(formedMessage);
  }
}