import { newDisposable } from '@back/util/lifecycle';
import { Disposable } from 'flashpoint-launcher';
import { ApiEvent } from './ApiEvent';
import { BackState } from '@back/types';
import { BackClient } from '@back/SocketServer';

type ApiListener<T> = [(e: T) => void, any] | [(e: T) => Promise<void>, any] | ((e: T) => void) | ((e: T) => Promise<void>);

export interface ApiEmitterFirable<T> {
  fire(event: T, onError?: (err: any) => void): Promise<void>;
}

export class ApiEmitter<T> implements ApiEmitterFirable<T> {
  // Event instance of itself
  private _event?: ApiEvent<T>;
  // List of all registered listeners
  protected _listeners: ApiListener<T>[];

  constructor() {
    this._listeners = [];
  }

  // Returns the event instance of the emitter
  get event(): ApiEvent<T> {
    if (this._event) {
      return this._event;
    } else {
      this._event = (listener: (e: T) => any, thisArgs?: any): Disposable => {
        // Push onto listeners then get exact item back to compare when unregistering.
        const index = this._listeners.push(thisArgs ? listener : [listener, thisArgs]);
        const item = this._listeners[index];

        return newDisposable(() => {
          // Remove from listener when disposed
          const i = this._listeners.findIndex(i => i == item);
          if (i > -1) {
            this._listeners.splice(i, 1);
          }
        });
      };
      return this._event;
    }
  }

  // Fires a given event to all listeners
  public async fire(event: T, onError?: (err: any) => void): Promise<void> {
    for (const listener of this._listeners) {
      try {
        if (typeof listener === 'function') {
          await listener(event);
        } else {
          listener[0].call(listener[1], event);
        }
      } catch (e) {
        onError && onError(e);
        throw e;
      }
    }
  }

  /**
   * Wraps a fire function in a frontend message box alert
   *
   * @param state Back State
   * @param event Event data
   * @param client Client to show error on (broadcasts if undefined)
   * @param errorHeader Prefixes the error message with this header
   * @param onError Error callback (This function always resolves)
   */
  public async fireAlert(state: BackState, event: T, client?: BackClient, errorHeader?: string, onError?: (err: string) => void): Promise<void> {
    await this.fire(event)
    .catch(async (err) => {
      const msg = errorHeader ?
        `${errorHeader}:\n${err.message || err}` :
        err.toString();
      if (client) {
        const openDialog = state.socketServer.showMessageBoxBack(state, client);
        await openDialog({
          largeMessage: true,
          message: msg,
          buttons: [state.languageContainer.misc.ok]
        });
      } else {
        const openDialog = state.socketServer.showMessageBoxBackBroadcast(state);
        openDialog({
          largeMessage: true,
          message: msg,
          buttons: [state.languageContainer.misc.ok]
        });
      }

      if (onError) {
        onError(msg);
      }
    });
  }

  /**
   * Wraps a fire function in a frontend message box alert
   *
   * @param state Back State
   * @param client Client to show error on (broadcasts if undefined)
   * @param errorHeader Prefixes the error message with this header
   */
  public fireableFactory(state: BackState, client?: BackClient, errorHeader?: string): ApiEmitterFirable<T> {
    return {
      fire: (event: T, onError?: (err: any) => void) => this.fireAlert(state, event, client, errorHeader, onError)
    };
  }
}
