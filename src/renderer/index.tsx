import { LogLevel } from '@shared/Log/interface';
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
import { RequestState } from './store/main/enums';
import { MainState, View } from './store/main/types';
import { rebuildQuery } from './Util';
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
    curate: {
      curations: window.Shared.initialCurations,
      current: '',
      selected: [],
      lastSelected: ''
    },
  });

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
  ), document.getElementById('root'));
})();

function createInitialMainState(): MainState {
  const preferencesData = window.Shared.preferences.data;

  // Prepare libraries
  const libraries = window.Shared.initialLibraries.sort();
  const serverNames = window.Shared.initialServerNames.sort();
  const mad4fpEnabled = window.Shared.initialMad4fpEnabled;
  const views: Record<string, View> = {};
  for (const library of libraries) {
    views[library] = {
      query: rebuildQuery({
        text: '',
        extreme: preferencesData.browsePageShowExtreme,
        library: library,
        playlistId: undefined,
        order: {
          orderBy: preferencesData.gamesOrderBy,
          orderReverse: preferencesData.gamesOrder
        },
        tagFilters: preferencesData.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !preferencesData.browsePageShowExtreme))
      }),
      pageState: {},
      meta: undefined,
      metaState: RequestState.WAITING,
      games: {},
      queryId: 0,
      isDirty: false,
      total: undefined,
      selectedGameId: undefined,
      lastStart: 0,
      lastCount: 0,
      tagFilters: [],
    };
  }

  // Prepare platforms
  const platforms: Record<string, string[]> = {};
  for (const library of libraries) {
    platforms[library] = window.Shared.initialPlatforms[library].slice().sort();
  }

  return {
    views: views,
    libraries: libraries,
    serverNames: serverNames,
    mad4fpEnabled: mad4fpEnabled,
    playlists: window.Shared.initialPlaylists || [],
    playlistIconCache: {},
    suggestions: window.Shared.initialSuggestions,
    appPaths: {},
    platforms: platforms,
    loaded: {
      0: false,
      1: false,
      2: false,
      3: false,
    },
    themeList: window.Shared.initialThemes,
    gamesTotal: -1,
    randomGames: [],
    requestingRandomGames: false,
    shiftRandomGames: false,
    localeCode: window.Shared.initialLocaleCode,
    devConsole: '',
    upgrades: [],
    gamesDoneLoading: false,
    upgradesDoneLoading: false,
    stopRender: false,
    creditsData: undefined,
    creditsDoneLoading: false,
    lang: window.Shared.initialLang,
    langList: window.Shared.initialLangList,
    wasNewGameClicked: false,
    updateInfo: undefined,
    metaEditExporterOpen: false,
    metaEditExporterGameId: '',
    extensions: window.Shared.initialExtensions,
    devScripts: window.Shared.initialDevScripts,
    contextButtons: window.Shared.initialContextButtons,
    curationTemplates: window.Shared.initialCurationTemplates,
    logoSets: window.Shared.initialLogoSets,
    extConfigs: window.Shared.initialExtConfigs,
    extConfig: window.Shared.initialExtConfig,
    services: window.Shared.initialServices,
    logoVersion: 0,
    downloadPercent: 0,
    downloadSize: 0,
    downloadOpen: false,
    downloadVerifying: false
  };
}
