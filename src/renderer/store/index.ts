import { connectRouter, RouterState } from 'connected-react-router';
import { History } from 'history';
import { combineReducers } from 'redux';
import { searchReducer, SearchState } from './search';
import { tagCategoriesReducer } from './tagCategories';
import { TagCategory } from '@database/entity/TagCategory';

// The top-level state object
export interface ApplicationState {
  router: RouterState;
  search: SearchState;
  tagCategories: TagCategory[];
}

// Top-level reducer
export const createRootReducer = (history: History) => combineReducers<ApplicationState>({
  router: connectRouter(history),
  search: searchReducer,
  tagCategories: tagCategoriesReducer
});
