import { Disposable } from '@back/util/lifecycle';

// An event instance, typed to the data of the event. Itself is a function to register listeners.
export interface ApiEvent<T> {
  (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable): Disposable;
}
