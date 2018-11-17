import { combineReducers, Dispatch, Action, AnyAction } from 'redux';
import { connectRouter, RouterState } from 'connected-react-router';
import { History } from 'history';

// The top-level state object
export interface ApplicationState {
  router: RouterState;
}

// Top-level reducer
export const createRootReducer = (history: History) => combineReducers<ApplicationState>({
  router: connectRouter(history),
});
