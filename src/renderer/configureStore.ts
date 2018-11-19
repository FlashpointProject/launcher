import { Store, createStore, applyMiddleware } from 'redux';
import { routerMiddleware } from 'connected-react-router';
import { composeWithDevTools } from 'redux-devtools-extension';
import { History } from 'history';
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
        /* Update preferences api's data */
        store => next => action => {
          const result = next(action);
          if ((action.type + '').startsWith('@@preferences/')) {
            window.External.preferences.setData(store.getState().preferences.data);
          }
          return result;
        }
      )
    )
  )
}
