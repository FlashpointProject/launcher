import { AnyFunction, ArgumentTypesOf } from '../interfaces';
import * as React from 'react';

type ThrottleRef = {
  /** Timeout of the currently throttled call. */
  timeout: NodeJS.Timeout | undefined;
  /** Callback to call once the time is out. */
  callback: AnyFunction;
  /** Function to call in order to later call "callback". */
  fn: (fn: AnyFunction) => void;
}

/** A callable object that has the same argument types as T (and void as the return type). */
interface CallableCopy<T extends AnyFunction> extends Function {
  (...args: ArgumentTypesOf<T>): void;
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

export function useThrottle(time: number): ThrottleRef['fn'] {
  const ref = React.useRef<ThrottleRef>(undefined as any);

  if (!ref.current) {
    ref.current = {
      timeout: undefined,
      callback: () => {},
      fn: (callback: AnyFunction) => {
        if (ref.current.timeout !== undefined) { return; }
        callback();

        ref.current.timeout = setTimeout(function() {
          ref.current.timeout = undefined;
        }, time);
      },
    };
  }

  return ref.current.fn;
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

export function useDelayedThrottle(time: number): ThrottleRef['fn'] {
  const ref = React.useRef<ThrottleRef>(undefined as any);

  if (!ref.current) {
    ref.current = {
      timeout: undefined,
      callback: () => {},
      fn: (callback: AnyFunction) => {
        ref.current.callback = callback;

        if (ref.current.timeout !== undefined) { return; }

        ref.current.timeout = setTimeout(function() {
          ref.current.timeout = undefined;
          ref.current.callback();
        }, time);
      },
    };
  }

  return ref.current.fn;
}
