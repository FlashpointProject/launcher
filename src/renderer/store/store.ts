import { configureStore } from '@reduxjs/toolkit';
import searchReducer from './search/slice';
import { listenerMiddleware } from './listenerMiddleware';
import { addSearchMiddleware } from './search/middleware';
import tagCategoriesReducer from './tagCategories/slice';
import mainReducer from './main/slice';
import fpfssReducer from './fpfss/slice';
import tasksReducer from './tasks/slice';
import curateReducer from './curate/slice';
import { addCurationMiddleware } from './curate/middleware';
import { createMemoryHistory } from 'history';
import { connectRouter, routerMiddleware } from 'connected-react-router';
import { addMainMiddleware } from './main/middleware';

export const history = createMemoryHistory();

// Initialize all store middleware
addSearchMiddleware();
addCurationMiddleware();
addMainMiddleware();

// Create store
export const store = configureStore({
  reducer: {
    router: connectRouter(history) as any,
    curate: curateReducer,
    fpfss: fpfssReducer,
    main: mainReducer,
    search: searchReducer,
    tagCategories: tagCategoriesReducer,
    tasks: tasksReducer,
  },
  middleware: (getDefaultMiddleware) => {
    const middleware = getDefaultMiddleware();
    middleware.push(listenerMiddleware.middleware);
    middleware.push(routerMiddleware(history) as any);
    return middleware;
  }
});

// Create typings for the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
