import { ConnectedRouter } from 'connected-react-router';
import { createMemoryHistory, MemoryHistory } from 'history';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { AddLogData, BackIn, CheckSetupData, SetupUpgradeData } from '../shared/back/types';
import configureStore from './configureStore';
import ConnectedApp from './containers/ConnectedApp';
import { ContextReducerProvider } from './context-reducer/ContextReducerProvider';
import { CurationContext } from './context/CurationContext';
import { PreferencesContextProvider } from './context/PreferencesContext';
import { ProgressContext } from './context/ProgressContext';
import { isFlashpointValidCheck } from './Util';
import { Store } from 'redux';
import { JSXElement } from '@babel/types';
import { SetupPage } from './components/pages/SetupPage';

(async () => {
  // Toggle DevTools when CTRL+SHIFT+I is pressed
  window.addEventListener('keypress', (event) => {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyI') {
      window.External.toggleDevtools();
      event.preventDefault();
    }
  });
  // Wait for the preferences and config to initialize
  await window.External.waitUntilInitialized();
  // Create history
  const history = createMemoryHistory();
  // Create Redux store
  const store = configureStore(history);
  // Check if setup is finished
  window.External.back.send<CheckSetupData>(BackIn.CHECK_SETUP, undefined, async (res) => {
    if (!res.data) {
      // Setup not finished, check for path validity
      const valid = await isFlashpointValidCheck(window.External.config.fullFlashpointPath);
      if (!valid) {
        // Path isn't valid, check for setup upgrade to install
        window.External.back.send<SetupUpgradeData>(BackIn.SETUP_UPGRADE, undefined, async (res) => {
          console.log('Checking upgrade');
          if (res.data) {
            // Upgrade present, continue with setup
            render(store, history, <SetupPage upgrade={res.data}/>)
          } else {
            // Upgrade not present, mark setup as finished and move on
            window.External.back.send<any>(BackIn.FINISH_SETUP, undefined);
            render(store, history, <ConnectedApp />);
          }
        });
      } else {
        // Path valid, mark setup as finished and move on
        window.External.back.send<any>(BackIn.FINISH_SETUP, undefined);
        render(store, history, <ConnectedApp />);
      }
    } else {
      // Setup already finished, move on
      render(store, history, <ConnectedApp />);
    }
  });
})();

function render(store: Store, history: MemoryHistory, pageRender: JSX.Element) {
  console.log('render');
  // Render the application
  ReactDOM.render((
    <Provider store={store}>
      <PreferencesContextProvider>
        <ContextReducerProvider context={CurationContext}>
          <ContextReducerProvider context={ProgressContext}>
            <ConnectedRouter history={history}>
              {pageRender}
            </ConnectedRouter>
          </ContextReducerProvider>
        </ContextReducerProvider>
      </PreferencesContextProvider>
    </Provider>
  ),
  document.getElementById('root')
  );
}

function log(content: string): void {
  window.External.back.send<any, AddLogData>(BackIn.ADD_LOG, {
    source: 'Launcher',
    content: content,
  });
}
