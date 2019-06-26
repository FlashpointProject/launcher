import * as React from 'react';
import { useMemo, useReducer } from 'react';
import { ReducerContext, ReducerContextValue } from './interfaces';

/** Short-hand type. */
type AnyReducer = React.Reducer<any, any>;

export type ContextReducerProviderProps<R extends AnyReducer> = {
  children?: React.ReactNode;
  /** Reducer context to provide. */
  context: ReducerContext<R>;
};

/** Stores the state of a Context and provides a dispatcher for changing its value. */
export function ContextReducerProvider<R extends AnyReducer>(props: ContextReducerProviderProps<R>) {
  const { Provider } = props.context.context;
  // Reducer that stores the state
  const [state, dispatch]: ReducerContextValue<R> = useReducer(
    props.context.reducer,
    props.context.initialState
  );
  // Context value (reducer state and dispatcher)
  const contextValue = useMemo((): ReducerContextValue<R> => {
    return [state, dispatch];
  }, [state, dispatch]);
  // Render
  return (
    <Provider value={contextValue}>
      {props.children}
    </Provider>
  );
}
