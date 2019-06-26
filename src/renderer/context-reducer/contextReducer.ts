import * as React from 'react';
import { ReducerContext, ReducerContextValue } from './interfaces';

/**
 * Create a Reducer Context.
 * @param reducer Reducer that will manage the state.
 * @param initialState Initial state of the context (and the default value in case no context is available).
 */
export function createContextReducer<R extends React.Reducer<any, any>>(
  reducer: R,
  initialState: ReducerContextValue<R>[0]
): ReducerContext<R> {
  // Default value of the context
  // (Value returned when attempting to get the value of a context that has no accessible provider)
  const defaultValue: ReducerContextValue<R> = [
    initialState,
    function noProviderDispatch() { console.error('Failed to dispatch. The context does not have a provider.'); }
  ];
  // Create the context this is wrapping
  const context = React.createContext(defaultValue);
  // Create and return the reducer context object
  return {
    context,
    reducer,
    initialState
  };
}
