import { ConnectedRouter } from 'connected-react-router';
import { createMemoryHistory } from 'history';
import * as path from 'path';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { readGameLibraryFile } from '../shared/library/GameLibrary';
import configureStore from './configureStore';
import ConnectedApp from './containers/ConnectedApp';
import { ContextReducerProvider } from './context-reducer/ContextReducerProvider';
import { CurationContext } from './context/CurationContext';
import { LangManager } from './lang/LangManager';
import { updateLibrary } from './store/library';
import { Theme } from './theme/Theme';
import { ThemeManager } from './theme/ThemeManager';

(async () => {
  // Toggle DevTools when CTRL+SHIFT+I is pressed
  window.addEventListener('keypress', (event) => {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyI') {
      window.External.toggleDevtools();
      event.preventDefault();
    }
  });
  // Wait for the preferences and config to initialize
  await Promise.all([
    window.External.config.waitUtilInitialized(),
    window.External.preferences.waitUtilInitialized(),
    window.External.services.waitUtilInitialized(),
  ]);
  // Get preferences data
  const preferencesData = window.External.preferences.getData();
  // Watch language folder & Load current/fallback language files
  const lang = new LangManager();
  await lang.waitToInit();
  // Watch themes folder & Load current theme file
  const themes = new ThemeManager(path.join(window.External.config.fullFlashpointPath, window.External.config.data.themeFolderPath));
  if (preferencesData.currentTheme) { // (If there is a current theme and it is not an empty string)
    const themeOrError = await themes.load(preferencesData.currentTheme);
    if (typeof themeOrError !== 'number') { Theme.set(themeOrError); }
    else { log(Theme.toError(themeOrError) || ''); }
  }
  // Create history
  const history = createMemoryHistory();
  // Create Redux store
  const store = configureStore(history, { preferences: { data: preferencesData } });
  // Load Game Library file
  let library = await readGameLibraryFile(window.External.config.fullJsonFolderPath, log).catch(e => log(e+''));
  if (library) { store.dispatch(updateLibrary(library)); }
  // Render the application
  ReactDOM.render((
      <Provider store={store}>
        <ContextReducerProvider context={CurationContext}>
          <ConnectedRouter history={history}>
            <ConnectedApp
              themes={themes}
              langManager={lang} />
          </ConnectedRouter>
        </ContextReducerProvider>
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
