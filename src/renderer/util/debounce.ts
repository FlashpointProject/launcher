import { AnyFunction, ArgumentTypesOf } from '@shared/interfaces';
import { shallowStrictEquals } from '@shared/Util';

/** A callable object that has the same argument types as T (and void as the return type). */
interface CallableCopy<T extends AnyFunction> extends Function {
  (...args: ArgumentTypesOf<T>): void;
}

/**
 * Executes a callback after a `time` millisecond timer, resetting the existing timer (cancelling its callback) with each call
 * @param callback Called when the timer ends
 * @param time Time in milliseconds before calling
 */
export function debounce<T extends AnyFunction>(callback: T, time:number): CallableCopy<T> {
  // Store timeout
  let timeout: number;
  // Function that receives and records the events
  const debouncer: CallableCopy<T> = function(...args) {
    // Reset timer for release
    if (timeout >= 0) { window.clearTimeout(timeout); }
    // Release event after some time
    timeout = window.setTimeout(function() {
      timeout = -1;
      callback(...args);
    }, time);
  };

  return debouncer;
}