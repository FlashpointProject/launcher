import { BackClient } from '@back/SocketServer';
import { BackState } from '@back/types';
import { newDisposable } from '@back/util/lifecycle';
import { Disposable } from 'flashpoint-launcher';
import { ApiEvent } from './ApiEvent';
import { internalNewExtLog } from './ExtensionUtils';

type ApiListener<T> = {
  name?: string;
  func: [(e: T) => void, any] | [(e: T) => Promise<void>, any] | ((e: T) => void) | ((e: T) => Promise<void>)
};

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
      this._event = (listener: (e: T) => any, name?: string, thisArgs?: any): Disposable => {
        // Push onto listeners then get exact item back to compare when unregistering.
        const index = this._listeners.push({
          name: name,
          func: thisArgs ? listener : [listener, thisArgs]
        });
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

  public extEvent(name: string): ApiEvent<T> {
    const e = this.event;
    return (listener: (e: T) => any, thisArgs?: any) => {
      return e(listener, name, thisArgs);
    };
  }

  // Fires a given event to all listeners
  public async fire(event: T, onError?: (err: any, name?: string) => void): Promise<void> {
    for (const listener of this._listeners) {
      try {
        const f = listener.func;
        if (typeof f === 'function') {
          await Promise.resolve(f.call(undefined, event));
        } else {
          await Promise.resolve(f[0].call(f[1], event));
        }
      } catch (e: any) {
        if (listener.name) {
          internalNewExtLog(listener.name, `API Event Error: ${e.message || e.toString()}`, log.error);
        } else {
          log.error('Launcher', `API Event Error: ${e.message || e.toString()}`);
        }
        onError && onError(e, listener.name);
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
  public async fireAlert(state: BackState, event: T, client?: BackClient, errorHeader?: string, onError?: (err: string, name?: string) => void): Promise<void> {
    await this.fire(event, async (err, name) => {
      // Build fancy error message
      let msg = '';
      if (errorHeader) {
        msg += `${errorHeader}:\n`;
      }
      if (name) {
        msg += `Extension: ${name}\n`;
      }
      msg += err.message || err.toString();
      // Send alert to client (broadcast if not given)
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
        onError(err.toString(), name);
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
