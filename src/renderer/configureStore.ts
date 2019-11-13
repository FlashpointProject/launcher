import { routerMiddleware } from 'connected-react-router';
import { History } from 'history';
import { applyMiddleware, createStore, Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { ApplicationState, createRootReducer } from './store';

export default function configureStore(history: History, initialState?: Partial<ApplicationState>): Store<ApplicationState> {
  const composeEnhancers = composeWithDevTools({});
  // Create store
  return createStore(
    createRootReducer(history),
    initialState,
    composeEnhancers(
      applyMiddleware(
        routerMiddleware(history),
      )
    )
  );
}
