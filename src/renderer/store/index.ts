import { connectRouter, RouterState } from 'connected-react-router';
import { History } from 'history';
import { combineReducers } from 'redux';
import { ILibraryState, libraryReducer } from './library';
import { IPreferencesState, preferencesReducer } from './preferences';
import { searchReducer, SearchState } from './search';
import { langReducer } from './lang';
import { ILangState } from './lang/types';

// The top-level state object
export interface ApplicationState {
  router: RouterState;
  search: SearchState;
  preferences: IPreferencesState;
  library: ILibraryState;
  lang: ILangState;
}

// Top-level reducer
export const createRootReducer = (history: History) => combineReducers<ApplicationState>({
  router: connectRouter(history),
  search: searchReducer,
  preferences: preferencesReducer,
  library: libraryReducer,
  lang: langReducer
});
