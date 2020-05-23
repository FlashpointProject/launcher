import { AddLogData, BackIn } from '@shared/back/types';
import { ConnectedRouter } from 'connected-react-router';
import { createMemoryHistory } from 'history';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import configureStore from './configureStore';
import ConnectedApp from './containers/ConnectedApp';
import { ContextReducerProvider } from './context-reducer/ContextReducerProvider';
import { CurationContext } from './context/CurationContext';
import { PreferencesContextProvider } from './context/PreferencesContext';
import { ProgressContext } from './context/ProgressContext';

(async () => {
  // Toggle DevTools when CTRL+SHIFT+I is pressed
  window.addEventListener('keypress', (event) => {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyI') {
      window.Shared.toggleDevtools();
      event.preventDefault();
    }
  });
  // Wait for the preferences and config to initialize
  await window.Shared.waitUntilInitialized();
  // Create history
  const history = createMemoryHistory();
  // Create Redux store
  const store = configureStore(history);
  // Render the application
  ReactDOM.render((
      <Provider store={store}>
        <PreferencesContextProvider>
          <ContextReducerProvider context={CurationContext}>
            <ContextReducerProvider context={ProgressContext}>
              <ConnectedRouter history={history}>
                <ConnectedApp />
              </ConnectedRouter>
            </ContextReducerProvider>
          </ContextReducerProvider>
        </PreferencesContextProvider>
      </Provider>
    ),
    document.getElementById('root')
  );
})();

function log(content: string): void {
  window.Shared.back.send<any, AddLogData>(BackIn.ADD_LOG, {
    source: 'Launcher',
    content: content,
  });
}
