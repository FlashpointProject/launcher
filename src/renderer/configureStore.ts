import { Store, createStore, applyMiddleware } from 'redux';
import { routerMiddleware } from 'connected-react-router';
import { composeWithDevTools } from 'redux-devtools-extension';
import { History } from 'history';
import { ApplicationState, createRootReducer } from './store';

export default function configureStore(history: History, initialState?: ApplicationState): Store<ApplicationState> {
  const composeEnhancers = composeWithDevTools({});
  // Create store
  return createStore(
    createRootReducer(history),
    initialState,
    composeEnhancers(applyMiddleware(routerMiddleware(history)))
  )
}
