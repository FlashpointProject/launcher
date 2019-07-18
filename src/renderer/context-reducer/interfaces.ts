import * as React from 'react';

/**
 * Value of a Reducer Context.
 * It contains both the state and dispatcher for the reducer used.
 * The first value is the state, the second is the dispatcher.
 */
export type ReducerContextValue<R extends React.Reducer<any, any>> = [
  React.ReducerState<R>,
  React.Dispatch<React.ReducerAction<R>>
];

/**
 * A "wrapped" React Context that can be used together with a Context Reducer Provider.
 * This makes it capable of providing the state and dispatcher for a reducer.
 */
export type ReducerContext<R extends React.Reducer<any, any>> = {
  /** React Context that this is wrapping. */
  context: React.Context<ReducerContextValue<R>>;
  /** Reducer used to modify the state. */
  reducer: R;
  /** Initial state of the context. */
  initialState: ReducerContextValue<R>[0];
};

/** Generic reducer action with a type and a payload. */
export type ReducerAction<T extends string, P = undefined> = {
  /** Identifier of what type of action this is. */
  type: T;
  /** Arguments or data passed along the action. */
  payload: P;
};
