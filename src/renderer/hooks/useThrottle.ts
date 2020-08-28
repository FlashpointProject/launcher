import { AnyFunction } from '@shared/interfaces';
import * as React from 'react';

type ThrottleRef = {
  /** Timeout of the currently throttled call. */
  timeout: NodeJS.Timeout | number | undefined;
  /** Callback to call once the time is out. */
  callback: AnyFunction;
  /** Function to call in order to later call "callback". */
  fn: (fn: AnyFunction) => void;
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
