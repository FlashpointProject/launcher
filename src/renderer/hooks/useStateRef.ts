import { Dispatch, Reducer, useReducer } from 'react';

export type StateRef<T> = {
  /** Current value (when this was created). */
  value: T;
  /** Reference to the most recent value. */
  ref: Ref<T>;
}

type Ref<T> = {
  current: T;
}

/**
 * Stores state and a ref to the most recent state.
 * Useful when you need the most recent state in callbacks without having to recreate them.
 *
 * @param initial Initial state
 */
export function useStateRef<T>(initial: T): [StateRef<T>, Dispatch<T>] {
  return useReducer<Reducer<StateRef<T>, T>, T>(reducer, initial, initializer);
}

function reducer<T>(prevState: StateRef<T>, action: T): StateRef<T> {
  prevState.ref.current = action;

  return {
    value: action,
    ref: prevState.ref,
  };
}

function initializer<T>(arg: T): StateRef<T> {
  return {
    value: arg,
    ref: { current: arg },
  };
}
