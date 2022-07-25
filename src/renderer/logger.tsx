import { BackOut } from '@shared/back/types';
import { LogLevel } from '@shared/Log/interface';
import { ConnectedRouter } from 'connected-react-router';
import { createMemoryHistory } from 'history';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createInitialMainState } from '.';
import configureStore from './configureStore';
import { ConnectedLogsPage } from './containers/ConnectedLogsPage';
import { PreferencesContextProvider } from './context/PreferencesContext';
import { LangContext } from './util/lang';
import { logFactory } from './util/logging';

(async () => {
  window.log = {
    trace: logFactory(LogLevel.TRACE, window.Shared.back),
    debug: logFactory(LogLevel.DEBUG, window.Shared.back),
    info:  logFactory(LogLevel.INFO,  window.Shared.back),
    warn:  logFactory(LogLevel.WARN,  window.Shared.back),
    error: logFactory(LogLevel.ERROR, window.Shared.back)
  };
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
  const store = configureStore(history, {
    main: createInitialMainState(),
  });

  // Connect to backend
  window.Shared.back.register(BackOut.LOG_ENTRY_ADDED, (event, entry, index) => {
    window.Shared.log.entries[index - window.Shared.log.offset] = entry;
  });

  // Render the application
  ReactDOM.render((
    <Provider store={store}>
      <PreferencesContextProvider>
        <ConnectedRouter history={history}>
          <LangContext.Provider value={store.getState().main.lang}>
            <ConnectedLogsPage isLogsWindow={true}/>
          </LangContext.Provider>
        </ConnectedRouter>
      </PreferencesContextProvider>
    </Provider>
  ), document.getElementById('root'));
})();
