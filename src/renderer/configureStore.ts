import { routerMiddleware } from 'connected-react-router';
import { History } from 'history';
import { applyMiddleware, createStore, Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { ApplicationState, createRootReducer } from './store';
import { curationSyncMiddleware } from './store/curate/middleware';
import { asyncDispatchMiddleware } from './store/main/types';
import { createReduxMiddleware } from '@karmaniverous/serify-deserify';

const serifyMiddleware = createReduxMiddleware();

export default function configureStore(history: History, initialState?: Partial<ApplicationState>): Store<ApplicationState> {
  const composeEnhancers = composeWithDevTools({});
  // Create store
  return createStore(
    createRootReducer(history),
    initialState,
    composeEnhancers(
      applyMiddleware(
        serifyMiddleware,
        routerMiddleware(history),
        curationSyncMiddleware,
        asyncDispatchMiddleware
      )
    )
  );
}
