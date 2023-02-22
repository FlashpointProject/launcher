import { BackInit } from '@shared/back/types';
import { LogLevel } from '@shared/Log/interface';
import { Gate } from '@shared/utils/Gate';
import { ConnectedRouter } from 'connected-react-router';
import { createMemoryHistory } from 'history';
import * as ReactDOM from 'react-dom';
import * as remote from '@electron/remote';
import { ShortcutProvider } from 'react-keybind';
import { Provider } from 'react-redux';
import configureStore from './configureStore';
import ConnectedApp from './containers/ConnectedApp';
import { ContextReducerProvider } from './context-reducer/ContextReducerProvider';
import { CurationContext } from './context/CurationContext';
import { PreferencesContextProvider } from './context/PreferencesContext';
import { ProgressContext } from './context/ProgressContext';
import { MainState, View } from './store/main/types';
import { logFactory } from './util/logging';
import { MessageBoxSyncOptions } from 'electron';

(async () => {
  globalThis.alert = function(str) {
    const options: MessageBoxSyncOptions = {
      type: 'warning',
      buttons: ['Ok'],
      defaultId: 0,
      cancelId:0,
      detail:str,
      message: ''
    };
    remote.dialog.showMessageBoxSync(options);
  };
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
      groups: window.Shared.preferences.data.groups,
      collapsedGroups: [],
      curations: [],
      current: '',
      selected: [],
      lastSelected: ''
    },
  });

  // Render the application
  ReactDOM.render((
    <Provider store={store}>
      <ShortcutProvider>
        <PreferencesContextProvider>
          <ContextReducerProvider context={CurationContext}>
            <ContextReducerProvider context={ProgressContext}>
              <ConnectedRouter history={history}>
                <ConnectedApp />
              </ConnectedRouter>
            </ContextReducerProvider>
          </ContextReducerProvider>
        </PreferencesContextProvider>
      </ShortcutProvider>
    </Provider>
  ), document.getElementById('root'));
})();

export function createInitialMainState(): MainState {
  // Prepare libraries
  // const libraries = window.Shared.initialLibraries.sort();
  // const serverNames = window.Shared.initialServerNames.sort();
  // const mad4fpEnabled = window.Shared.initialMad4fpEnabled;
  const views: Record<string, View> = {};
  // for (const library of libraries) {
  //   views[library] = {
  //     query: rebuildQuery({
  //       text: '',
  //       extreme: preferencesData.browsePageShowExtreme,
  //       library: library,
  //       playlistId: undefined,
  //       searchLimit: preferencesData.searchLimit,
  //       order: {
  //         orderBy: preferencesData.gamesOrderBy,
  //         orderReverse: preferencesData.gamesOrder
  //       },
  //       tagFilters: preferencesData.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !preferencesData.browsePageShowExtreme))
  //     }),
  //     pageState: {},
  //     meta: undefined,
  //     metaState: RequestState.WAITING,
  //     games: {},
  //     queryId: 0,
  //     isDirty: false,
  //     total: undefined,
  //     selectedGameId: undefined,
  //     lastStart: 0,
  //     lastCount: 0,
  //     tagFilters: [],
  //   };
  // }

  // Prepare platforms
  const platforms: Record<string, string[]> = {};
  // for (const library of libraries) {
  //   platforms[library] = window.Shared.initialPlatforms[library].slice().sort();
  // }

  return {
    views: views,
    libraries: [],
    serverNames: [],
    mad4fpEnabled: false,
    playlists: [],
    playlistIconCache: {},
    suggestions: {
      tags: [],
      platform: [],
      playMode: [],
      status: [],
      applicationPath: [],
      library: []
    },
    appPaths: {},
    platforms: platforms,
    loadedAll: new Gate(),
    loaded: {
      [BackInit.SERVICES]: false,
      [BackInit.DATABASE]: false,
      [BackInit.PLAYLISTS]: false,
      [BackInit.CURATE]: false,
      [BackInit.EXEC_MAPPINGS]: false,
      [BackInit.EXTENSIONS]: false
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
    extensions: [],
    devScripts: [],
    contextButtons: [],
    curationTemplates: [],
    logoSets: [],
    extConfigs: [],
    extConfig: {},
    services: [],
    logoVersion: 0,
    downloadPercent: 0,
    downloadSize: 0,
    downloadOpen: false,
    downloadVerifying: false,
    taskBarOpen: false,
    socketOpen: true,
    isEditingGame: false,
    updateFeedMarkdown: '',
    busyGames: [],
    gotdList: [],
    componentUpdates: [],
    quitting: false,
  };
}
