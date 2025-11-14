import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { addCurationMiddleware } from './curate/middleware';
import curateReducer from './curate/slice';
import downloadsReducer from './downloads/slice';
import fpfssReducer from './fpfss/slice';
import historyReducer from './history/slice';
import { listenerMiddleware } from './listenerMiddleware';
import logsReducer from './logs/slice';
import { addMainMiddleware } from './main/middleware';
import mainReducer from './main/slice';
import { addPreferencesMiddleware } from './preferences/middleware';
import prefsReducer from './preferences/slice';
import { addSearchMiddleware } from './search/middleware';
import searchReducer from './search/slice';
import tagCategoriesReducer from './tagCategories/slice';
import tasksReducer from './tasks/slice';

// Initialize all store middleware
addSearchMiddleware();
addCurationMiddleware();
addMainMiddleware();
addPreferencesMiddleware();

const rootReducer = combineReducers({
  curate: curateReducer,
  fpfss: fpfssReducer,
  main: mainReducer,
  search: searchReducer,
  tagCategories: tagCategoriesReducer,
  tasks: tasksReducer,
  logs: logsReducer,
  downloads: downloadsReducer,
  preferences: prefsReducer,
  history: historyReducer,
});

export function setupStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    devTools: true,
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({
        serializableCheck: {
          ignoredPaths: ['search', 'downloads'] // Big performance drop in dev with this on search views
        },
      });
      middleware.push(listenerMiddleware.middleware);
      return middleware;
    },
    preloadedState
  });
}

// Create store
export const store = setupStore();

// Create typings for the store
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = typeof store.dispatch;
export default store;
