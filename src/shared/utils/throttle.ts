import { AnyFunction, ArgumentTypesOf } from '../interfaces';

/** A callable object that has the same argument types as T (and void as the return type). */
interface CallableCopy<T extends AnyFunction> extends Function {
  (...args: ArgumentTypesOf<T>): void;
}
/** A callable object that has the same argument types as T (and Promise<void> as the return type). */
interface CallableCopyAsync<T extends AnyFunction> extends Function {
  (...args: ArgumentTypesOf<T>): Promise<void>;
}

/**
 * Executes a callback immediately and starts a timer, only executes if timer is finished
 * @param callback Called when the timer ends
 * @param time Time in milliseconds before calling
 */
export function throttle<T extends AnyFunction>(callback: T, time:number): CallableCopy<T> {
  // Store timeout
  let timeout: ReturnType<typeof setTimeout> | undefined;
  // Function that receives and records the events
  const throttler: CallableCopy<T> = function(...args) {
    // Check if currently throttling
    if (timeout != undefined) { return; }
    // Release event after some time
    timeout = setTimeout(function() {
      timeout = undefined;
    }, time);
    callback(...args);
  };
  return throttler;
}

/**
 * Executes a callback after a `time` millisecond timer, only starting the timer if it doesn't exist
 * @param callback Called when the timer ends
 * @param time Time in milliseconds before calling
 */
export function delayedThrottle<T extends AnyFunction>(callback: T, time:number): CallableCopy<T> {
  // Store timeout
  let timeout: ReturnType<typeof setTimeout> | undefined;
  // Function that receives and records the events
  const throttler: CallableCopy<T> = function(...args) {
    // Check if currently throttling
    if (timeout != undefined) { return; }
    // Release event after some time
    timeout = setTimeout(function() {
      timeout = undefined;
      callback(...args);
    }, time);
  };
  return throttler;
}

/**
 * Executes a callback after a `time` millisecond timer, only starting the timer if it doesn't exist
 * @param callback Called when the timer ends
 * @param time Time in milliseconds before calling
 */
export function delayedThrottleAsync<T extends AnyFunction>(callback: T, time:number): CallableCopyAsync<T> {
  // Store timeout
  let timeout: ReturnType<typeof setTimeout> | undefined;
  // Function that receives and records the events
  const throttler: CallableCopyAsync<T> = async function(...args) {
    return new Promise(resolve => {
      // Check if currently throttling
      if (timeout != undefined) { resolve(); }
      // Release event after some time
      timeout = setTimeout(async function() {
        timeout = undefined;
        await callback(...args);
        resolve();
      }, time);
    });
  };
  return throttler;
}
