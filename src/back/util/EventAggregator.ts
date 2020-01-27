import { AnyFunction, ArgumentTypesOf } from '@shared/interfaces';
import { shallowStrictEquals } from '@shared/Util';

/** A callable object that has the same argument types as T (and void as the return type). */
interface CallableCopy<T extends AnyFunction> extends Function {
  (...args: ArgumentTypesOf<T>): void;
}

type EqualsCheck<T extends AnyFunction> = (newArgs: ArgumentTypesOf<T>, prevArgs: ArgumentTypesOf<T>) => boolean;

/** A buffered event. */
type BufferedEvent<T extends AnyFunction> = {
  /** Arguments the function was called with. */
  arguments: ArgumentTypesOf<T>;
  /** Timestamp of when the event was added to the buffer. */
  timestamp: number;
};

export type EventAggregatorOpts<T extends AnyFunction> = {
  /** Number of milliseconds each call will be buffered. */
  time?: number;
  /** Function that compares two sets of arguments to determine if they are "equal". */
  equal?: EqualsCheck<T>;
};

/**
 * Collect unique callbacks and execute them all `time` after the first call
 * @param callback Called when the timer is "released".
 * @param opts Options.
 * @returns Function that buffers events when called.
 */
export function eventAggregator<T extends AnyFunction>(callback: T, opts?: EventAggregatorOpts<T>): CallableCopy<T> {
  // Variables
  const buffer: BufferedEvent<T>[] = []; // Buffer of all recorded and not-yet-released events
  let time: number = 50;
  let equal: EqualsCheck<T> = defaultEqualsFunc;

  // Apply options
  if (opts) {
    if (opts.time  !== undefined) { time  = opts.time;  }
    if (opts.equal !== undefined) { equal = opts.equal; }
  }

  // Function that receives and records the events
  const eventAggregator: CallableCopy<T> = function(...args) {
    // Check if equal arguments already are in the buffer
    let isUnique = true;
    for (let item of buffer) {
      if (equal(item.arguments, args)) {
        isUnique = false;
        break;
      }
    }
    // Buffer event if it is unique (otherwise ignore it)
    if (isUnique) {
      // Add to buffer
      const item: BufferedEvent<T> = {
        arguments: args,
        timestamp: Date.now()
      };
      buffer.push(item);
      // Release event after some time
      setTimeout(function() {
        // Remove from buffer
        const index = buffer.indexOf(item);
        if (index >= 0) { buffer.splice(index, 1); }
        // Callback
        callback(...args);
      }, time);
    }
  };

  return eventAggregator;
}

/** Default function used to compare arguments. */
function defaultEqualsFunc<T extends any[]>(newArgs: T, prevArgs: T): boolean {
  return newArgs.length === prevArgs.length &&
         shallowStrictEquals(newArgs, prevArgs);
}
