import { ConnectedRouter } from 'connected-react-router';
import { createMemoryHistory } from 'history';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { readGameLibraryFile } from '../shared/library/GameLibrary';
import configureStore from './configureStore';
import ConnectedApp from './containers/ConnectedApp';
import { updateLibrary } from './store/library';

(async () => {
  // Toggle DevTools when CTRL+SHIFT+I is pressed
  window.addEventListener('keypress', (event) => {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyI') {
      window.External.toggleDevtools();
      event.preventDefault();
    }
  });
  // Wait for the preferences and config to initialize
  await window.External.config.waitUtilInitialized();
  await window.External.preferences.waitUtilInitialized();
  // Create history
  const history = createMemoryHistory();
  // Create Redux store
  const store = configureStore(history, { preferences: { data: window.External.preferences.getData() } });
  // Load Game Library file
  let library = await readGameLibraryFile(window.External.config.fullJsonFolderPath, log).catch(e => log(e+''));
  if (library) { store.dispatch(updateLibrary(library)); }
  // Render the application
  ReactDOM.render((
      <Provider store={store}>
        <ConnectedRouter history={history}>
            <ConnectedApp />
        </ConnectedRouter>
      </Provider>
    ),
    document.getElementById('root')
  );
})();

function log(content: string): void {
  window.External.log.addEntry({
    source: 'Launcher',
    content: content
  });
}
