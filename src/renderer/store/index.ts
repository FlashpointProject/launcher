import { TagCategory } from '@database/entity/TagCategory';
import { Task } from '@shared/interfaces';
import { connectRouter, RouterState } from 'connected-react-router';
import { History } from 'history';
import { combineReducers } from 'redux';
import { curateStateReducer } from './curate/reducer';
import { CurateState } from './curate/types';
import { mainStateReducer } from './main/reducer';
import { MainState } from './main/types';
import { searchReducer, SearchState } from './search';
import { tagCategoriesReducer } from './tagCategories';
import { tasksStateReducer } from './tasks';

// The top-level state object
export interface ApplicationState {
  router: RouterState;
  search: SearchState;
  tagCategories: TagCategory[];
  main: MainState;
  curate: CurateState;
  tasks: Task[];
}

// Top-level reducer
export const createRootReducer = (history: History) => combineReducers<ApplicationState>({
  router: connectRouter(history),
  search: searchReducer,
  tagCategories: tagCategoriesReducer,
  main: mainStateReducer,
  curate: curateStateReducer,
  tasks: tasksStateReducer,
});
