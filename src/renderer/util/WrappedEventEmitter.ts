import { EventEmitter } from 'events';

/** A wrapper around an event emitter. */
export class WrappedEventEmitter {
  /** Event emitter this is a wrapper around. */
  protected _emitter: EventEmitter = new EventEmitter();

  on(event: string, listener: () => void): this {
    this._emitter.on(event, listener);
    return this;
  }

  once(event: string, listener: () => void): this {
    this._emitter.once(event, listener);
    return this;
  }

  off(event: string, listener: () => void): this {
    this._emitter.off(event, listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    return this._emitter.emit(event, ...args);
  }
}
