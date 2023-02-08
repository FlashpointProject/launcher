import { newDisposable } from '@back/util/lifecycle';
import { Disposable } from 'flashpoint-launcher';
import { ApiEvent } from './ApiEvent';

type ApiListener<T> = [(e: T) => void, any] | ((e: T) => void);

export class ApiEmitter<T> {
  // Event instance of itself
  private _event?: ApiEvent<T>;
  // List of all registered listeners
  protected _listeners: ApiListener<T>[];

  constructor() {
    this._listeners = [];
  }

  // Returns the event instance of the emitter
  get event(): ApiEvent<T> {
    if (!this._event) {
      this._event = (listener: (e: T) => any, thisArgs?: any): Disposable => {
        // Push onto listeners then get exact item back to compare when unregistering.
        const index = this._listeners.push(thisArgs ? listener : [listener, thisArgs]);
        const item = this._listeners[index];

        const disp = newDisposable(() => {
          // Remove from listener when disposed
          const i = this._listeners.findIndex(i => i == item);
          if (i > -1) {
            this._listeners.splice(i, 1);
          }
        });
        return disp;
      };
      return this._event;
    } else {
      return this._event;
    }
  }

  // Fires a given event to all listeners
  public async fire(event: T): Promise<void> {
    for (const listener of this._listeners) {
      try {
        if (typeof listener === 'function') {
          await Promise.resolve(listener.call(undefined, event));
        } else {
          await Promise.resolve(listener[0].call(listener[1], event));
        }
      } catch (e) {
        log.error('Launcher', `Error in ApiEmitter listener: ${e}`);
      }
    }
  }
}
