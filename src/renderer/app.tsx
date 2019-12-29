import { ipcRenderer, remote } from 'electron';
import { AppUpdater, UpdateInfo } from 'electron-updater';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import * as which from 'which';
import * as AppConstants from '../shared/AppConstants';
import { AddLogData, BackIn, BackInit, BackOut, BrowseChangeData, BrowseViewAllData, BrowseViewPageData, BrowseViewPageResponseData, GetGamesTotalResponseData, GetPlaylistResponse, GetSuggestionsResponseData, InitEventData, LanguageChangeData, LanguageListChangeData, LaunchGameData, LocaleUpdateData, LogEntryAddedData, PlaylistRemoveData, PlaylistUpdateData, QuickSearchData, QuickSearchResponseData, SaveGameData, SavePlaylistData, ServiceChangeData, ThemeChangeData, ThemeListChangeData, UpdateConfigData, BrowseViewIndexData, BrowseViewIndexResponseData } from '../shared/back/types';
import { BrowsePageLayout } from '../shared/BrowsePageLayout';
import { IAdditionalApplicationInfo, IGameInfo, UNKNOWN_LIBRARY } from '../shared/game/interfaces';
import { GamePlaylist, GamePropSuggestions, ProcessState, WindowIPC } from '../shared/interfaces';
import { LangContainer, LangFile } from '../shared/lang';
import { getLibraryItemTitle } from '../shared/library/util';
import { memoizeOne } from '../shared/memoize';
import { GameOrderBy, GameOrderReverse } from '../shared/order/interfaces';
import { updatePreferencesData } from '../shared/preferences/util';
import { setTheme } from '../shared/Theme';
import { Theme } from '../shared/ThemeFile';
import { getUpgradeString } from '../shared/upgrade/util';
import { canReadWrite, deepCopy, recursiveReplace } from '../shared/Util';
import { formatString } from '../shared/utils/StringFormatter';
import { GameOrderChangeEvent } from './components/GameOrder';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';
import { ConnectedFooter } from './containers/ConnectedFooter';
import HeaderContainer from './containers/HeaderContainer';
import { WithPreferencesProps } from './containers/withPreferences';
import { CreditsFile } from './credits/CreditsFile';
import { CreditsData } from './credits/types';
import { GAMES, UpgradeStageState } from './interfaces';
import { Paths } from './Paths';
import { AppRouter, AppRouterProps } from './router';
import { SearchQuery } from './store/search';
import { UpgradeStage } from './upgrade/types';
import { UpgradeFile } from './upgrade/UpgradeFile';
import { isFlashpointValidCheck, joinLibraryRoute, openConfirmDialog } from './Util';
import { LangContext } from './util/lang';
import { checkUpgradeStateInstalled, checkUpgradeStateUpdated, downloadAndInstallUpgrade } from './util/upgrade';

const autoUpdater: AppUpdater = remote.require('electron-updater').autoUpdater;

const VIEW_PAGE_SIZE = 250;

type Views = Record<string, View | undefined>; // views[id] = view
type View = {
  games: GAMES;
  pages: Record<number, ViewPage | undefined>;
  total: number;
  selectedPlaylistId?: string;
  selectedGameId?: string;
  /** If the cache is dirty and should be discarded. */
  dirtyCache: boolean;
  /** The most recent query used for this view. */
  query: {
    search: string;
    extreme: boolean;
    orderBy: GameOrderBy;
    orderReverse: GameOrderReverse;
  };
}
type ViewPage = {}

type AppOwnProps = {
  /** Most recent search query. */
  search: SearchQuery;
};

export type AppProps = AppOwnProps & RouteComponentProps & WithPreferencesProps;

export type AppState = {
  views: Views;
  libraries: string[];
  playlists: GamePlaylist[];
  playlistIconCache: Record<string, string>; // [PLAYLIST_ID] = ICON_BLOB_URL
  suggestions: Partial<GamePropSuggestions>;
  appPaths: Record<string, string>;
  platforms: Record<string, string[]>;
  loaded: { [key in BackInit]: boolean; };
  themeList: Theme[];
  gamesTotal: number;
  localeCode: string;

  /** Data and state used for the upgrade system (optional install-able downloads from the HomePage). */
  upgrades: UpgradeStage[];
  /** If upgrades files have loaded */
  upgradesDoneLoading: boolean;
  /** Stop rendering to force component unmounts */
  stopRender: boolean;
  /** Credits data (if any). */
  creditsData?: CreditsData;
  creditsDoneLoading: boolean;
  /** Current parameters for ordering games. */
  order: GameOrderChangeEvent;
  /** Scale of the games. */
  gameScale: number;
  /** Layout of the browse page */
  gameLayout: BrowsePageLayout;
  /** If the "New Game" button was clicked (silly way of passing the event from the footer the the browse page). */
  wasNewGameClicked: boolean;
  /** Current language container. */
  lang: LangContainer;
  /** Current list of available language files. */
  langList: LangFile[];
  /** Info of the update, if one was found */
  updateInfo: UpdateInfo | undefined;
};

export class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    const preferencesData = this.props.preferencesData;
    const order: GameOrderChangeEvent = {
      orderBy: preferencesData.gamesOrderBy,
      orderReverse: preferencesData.gamesOrder
    };

    // Prepare libraries and initial views
    const libraries = Object.keys(window.External.initialPlatforms).sort();
    const views: Record<string, View> = {};
    for (let library of libraries) {
      views[library] = {
        dirtyCache: false,
        games: {},
        pages: {},
        total: 0,
        query: {
          search: this.props.search.text,
          extreme: this.props.preferencesData.browsePageShowExtreme,
          orderBy: order.orderBy,
          orderReverse: order.orderReverse,
        }
      };
    }

    // Set initial state
    this.state = {
      views: views,
      libraries: libraries,
      playlists: window.External.initialPlaylists || [],
      playlistIconCache: {},
      suggestions: {},
      appPaths: {},
      platforms: window.External.initialPlatforms,
      loaded: {
        0: false,
        1: false,
        2: false,
      },
      themeList: window.External.initialThemes,
      gamesTotal: -1,
      localeCode: window.External.initialLocaleCode,
      upgrades: [],
      upgradesDoneLoading: false,
      stopRender: false,
      creditsData: undefined,
      creditsDoneLoading: false,
      gameScale: preferencesData.browsePageGameScale,
      gameLayout: preferencesData.browsePageLayout,
      lang: window.External.initialLang,
      langList: window.External.initialLangList,
      wasNewGameClicked: false,
      updateInfo: undefined,
      order,
    };

    // Initialize app
    this.init();
  }

  init() {
    const strings = this.state.lang;
    const fullFlashpointPath = window.External.config.fullFlashpointPath;
    const fullJsonFolderPath = window.External.config.fullJsonFolderPath;
    // Warn the user when closing the launcher WHILE downloading or installing an upgrade
    (() => {
      let askBeforeClosing = true;
      window.onbeforeunload = (event: BeforeUnloadEvent) => {
        const { upgrades } = this.state;
        let stillDownloading = false;
        for (let stage of upgrades) {
          if (stage.state.isInstalling) {
            stillDownloading = true;
            break;
          }
        }
        if (askBeforeClosing && stillDownloading) {
          event.returnValue = 1; // (Prevent closing the window)
          remote.dialog.showMessageBox({
            type: 'warning',
            title: 'Exit Launcher?',
            message: 'All progress on downloading or installing the upgrade will be lost.\n'+
                     'Are you sure you want to exit?',
            buttons: ['Yes', 'No'],
            defaultId: 1,
            cancelId: 1,
          })
          .then(({ response }) => {
            if (response === 0) {
              askBeforeClosing = false;
              this.unmountBeforeClose();
            }
          });
        } else {
          this.unmountBeforeClose();
        }
      };
    })();
    // Listen for the window to move or resize (and update the preferences when it does)
    ipcRenderer.on(WindowIPC.WINDOW_MOVE, (sender, x: number, y: number, isMaximized: boolean) => {
      if (!isMaximized) {
        updatePreferencesData({ mainWindow: { x: x|0, y: y|0 } });
      }
    });
    ipcRenderer.on(WindowIPC.WINDOW_RESIZE, (sender, width: number, height: number, isMaximized: boolean) => {
      if (!isMaximized) {
        updatePreferencesData({ mainWindow: { width: width|0, height: height|0 } });
      }
    });
    ipcRenderer.on(WindowIPC.WINDOW_MAXIMIZE, (sender, isMaximized: boolean) => {
      updatePreferencesData({ mainWindow: { maximized: isMaximized } });
    });

    window.External.back.send<InitEventData>(BackIn.INIT_LISTEN, undefined, res => {
      if (!res.data) { throw new Error('INIT_LISTEN response is missing data.'); }
      const nextLoaded = { ...this.state.loaded };
      for (let key of res.data.done) {
        nextLoaded[key] = true;
      }
      this.setState({ loaded: nextLoaded });
    });

    window.External.back.on('message', res => {
      // console.log('IN', res);
      switch (res.type) {
        case BackOut.INIT_EVENT: {
          const resData: InitEventData = res.data;

          const loaded = { ...this.state.loaded };
          for (let index of resData.done) {
            loaded[index] = true;

            switch (parseInt(index+'')) { // (It is a string, even though TS thinks it is a number)
              case BackInit.PLAYLISTS:
                window.External.back.send<GetPlaylistResponse>(BackIn.GET_PLAYLISTS, undefined, res => {
                  if (res.data) {
                    this.setState({ playlists: res.data });
                    this.cachePlaylistIcons(res.data);
                  }
                });
                break;

              case BackInit.GAMES:
                window.External.back.send<GetGamesTotalResponseData>(BackIn.GET_GAMES_TOTAL, undefined, res => {
                  if (res.data) {
                    this.setState({ gamesTotal: res.data });
                  }
                });
                window.External.back.send<GetSuggestionsResponseData>(BackIn.GET_SUGGESTIONS, undefined, res => {
                  if (res.data) {
                    this.setState({
                      suggestions: res.data.suggestions,
                      appPaths: res.data.appPaths,
                    });
                  }
                });
                break;
            }
          }

          this.setState({ loaded });
        } break;

        case BackOut.LOG_ENTRY_ADDED: {
          const resData: LogEntryAddedData = res.data;
          window.External.log.entries[resData.index - window.External.log.offset] = resData.entry;
        } break;

        case BackOut.LOCALE_UPDATE: {
          const resData: LocaleUpdateData = res.data;
          this.setState({ localeCode: resData });
        } break;

        case BackOut.BROWSE_VIEW_PAGE_RESPONSE: {
          const resData: BrowseViewPageResponseData = res.data;

          let view: View | undefined = this.state.views[res.id];

          if (view) {
            const views = { ...this.state.views };
            const newView = views[res.id] = { ...view };
            if (view.dirtyCache) {
              newView.dirtyCache = false;
              newView.games = {};
              newView.pages = {};
            } else {
              newView.games = { ...view.games };
            }
            for (let i = 0; i < resData.games.length; i++) {
              newView.games[resData.offset + i] = resData.games[i];
            }
            if (resData.total !== undefined) { newView.total = resData.total; }
            this.setState({ views });
          }
        } break;

        case BackOut.BROWSE_CHANGE: {
          const resData: BrowseChangeData = res.data;
          const newState: Partial<AppState> = {
            gamesTotal: resData.gamesTotal,
          };

          if (resData.library) { // (Clear specific cache)
            const view = this.state.views[resData.library];
            if (view) {
              newState.views = {
                ...this.state.views,
                [resData.library]: {
                  ...view,
                  dirtyCache: true,
                }
              };
            }
          } else { // (Clear all caches)
            const newViews = { ...this.state.views };
            for (let library in newViews) {
              const view = newViews[library];
              if (view) {
                newViews[library] = {
                  ...view,
                  dirtyCache: true,
                };
              }
            }
            newState.views = newViews;
          }

          this.setState(newState as any, () => {
            if (resData.library !== undefined) { this.requestSelectedGame(resData.library); }
          });
        } break;

        case BackOut.SERVICE_CHANGE: {
          const resData: ServiceChangeData = res.data;
          if (resData.id) {
            const service = window.External.services.find(item => item.id === resData.id);
            if (service) {
              recursiveReplace(service, resData);
            } else {
              window.External.services.push(recursiveReplace({
                id: 'invalid',
                name: 'Invalid',
                state: ProcessState.STOPPED,
                pid: -1,
                startTime: 0,
                info: {
                  path: '',
                  filename: '',
                  arguments: [],
                  kill: false,
                },
              }, resData));
            }
          } else { throw new Error('Service update did not reference a service.'); }
        } break;

        case BackOut.LANGUAGE_CHANGE: {
          const resData: LanguageChangeData = res.data;
          this.setState({ lang: resData });
        } break;

        case BackOut.LANGUAGE_LIST_CHANGE: {
          const resData: LanguageListChangeData = res.data;
          this.setState({ langList: resData });
        } break;

        case BackOut.THEME_CHANGE: {
          const resData: ThemeChangeData = res.data;
          if (resData === this.props.preferencesData.currentTheme) { setTheme(resData); }
        } break;

        case BackOut.THEME_LIST_CHANGE: {
          const resData: ThemeListChangeData = res.data;
          this.setState({ themeList: resData });
        } break;

        case BackOut.PLAYLIST_UPDATE: {
          const resData: PlaylistUpdateData = res.data;
          const index = this.state.playlists.findIndex(p => p.filename === resData.filename);
          if (index >= 0) {
            const playlist = this.state.playlists[index];
            const state: Partial<Pick<AppState, 'playlistIconCache' | 'playlists' | 'views'>> = {};

            // Remove old icon from cache
            if (playlist.filename in this.state.playlistIconCache) {
              state.playlistIconCache = { ...this.state.playlistIconCache };
              delete state.playlistIconCache[playlist.filename];
              URL.revokeObjectURL(state.playlistIconCache[playlist.filename]); // Free blob from memory
            }

            // Cache new icon
            if (resData.icon !== undefined) {
              cacheIcon(resData.icon).then(url => {
                this.setState({
                  playlistIconCache: {
                    ...this.state.playlistIconCache,
                    [resData.filename]: url,
                  }
                });
              });
            }

            // Update playlist
            state.playlists = [ ...this.state.playlists ];
            state.playlists[index] = resData;

            // Clear view caches (that use this playlist)
            for (let id in this.state.views) {
              const view = this.state.views[id];
              if (view) {
                if (view.selectedPlaylistId === resData.filename) {
                  if (!state.views) { state.views = { ...this.state.views }; }
                  state.views[id] = {
                    ...view,
                    dirtyCache: true,
                  };
                }
              }
            }

            this.setState(
              state as any, // (This is very annoying to make typesafe)
              () => { if (state.views && resData.library !== undefined) { this.requestSelectedGame(resData.library); } }
            );
          } else {
            this.setState({ playlists: [...this.state.playlists, resData] });
          }
        } break;

        case BackOut.PLAYLIST_REMOVE: {
          const resData: PlaylistRemoveData = res.data;

          const index = this.state.playlists.findIndex(p => p.filename === resData);
          if (index >= 0) {
            const playlists = [ ...this.state.playlists ];
            playlists.splice(index, 1);

            const cache: Record<string, string> = { ...this.state.playlistIconCache };
            const filename = this.state.playlists[index].filename;
            if (filename in cache) { delete cache[filename]; }

            this.setState({
              playlists: playlists,
              playlistIconCache: cache
            });
          }
        } break;
      }
    });

    // Cache playlist icons (if they are loaded)
    if (this.state.playlists.length > 0) { this.cachePlaylistIcons(this.state.playlists); }

    // -- Stuff that should probably be moved to the back --

    // Load Upgrades
    const folderPath = window.External.isDev
        ? process.cwd()
        : path.dirname(remote.app.getPath('exe'));
    const upgradeCatch = (error: Error) => { console.warn(error); };
    Promise.all([UpgradeFile.readFile(folderPath, log), UpgradeFile.readFile(fullJsonFolderPath, log)].map(p => p.catch(upgradeCatch)))
    .then(async (fileData) => {
      // Combine all file data
      let allData: UpgradeStage[] = [];
      for (let data of fileData) {
        if (data) {
          allData = allData.concat(data);
        }
      }
      this.setState({
        upgrades: allData,
        upgradesDoneLoading: true,
      });
      const isValid = await isFlashpointValidCheck(window.External.config.data.flashpointPath);
      // Notify of downloading initial data (if available)
      if (!isValid && allData.length > 0) {
        remote.dialog.showMessageBox({
          type: 'info',
          title: strings.dialog.dataRequired,
          message: strings.dialog.dataRequiredDesc,
          buttons: [strings.misc.yes, strings.misc.no]
        })
        .then((res) => {
          if (res.response === 0) {
            this.onDownloadUpgradeClick(allData[0], strings);
          }
        });
      }
      // Do existance checks on all upgrades
      await Promise.all(allData.map(async upgrade => {
        const baseFolder = fullFlashpointPath;
        // Perform install checks
        const installed = await checkUpgradeStateInstalled(upgrade, baseFolder);
        this.setUpgradeStageState(upgrade.id, {
          alreadyInstalled: installed,
          checksDone: true
        });
        // If installed, check for updates
        if (installed) {
          const upToDate = await checkUpgradeStateUpdated(upgrade, baseFolder);
          this.setUpgradeStageState(upgrade.id, {
            upToDate: upToDate
          });
        }
      }));
    });
    // Load Credits
    CreditsFile.readFile(fullJsonFolderPath, log)
    .then((data) => {
      this.setState({
        creditsData: data,
        creditsDoneLoading: true
      });
    })
    .catch((error) => {
      console.warn(error);
      log(`Failed to load credits.\n${error}`);
      this.setState({ creditsDoneLoading: true });
    });

    // Updater code - DO NOT run in development environment!
    if (!window.External.isDev) {
      autoUpdater.autoDownload = false;
      autoUpdater.on('error', (error: Error) => {
        console.log(error);
      });
      autoUpdater.on('update-available', (info) => {
        log(`Update Available - ${info.version}`);
        console.log(info);
        this.setState({
          updateInfo: info
        });
      });
      autoUpdater.on('update-downloaded', onUpdateDownloaded);
      autoUpdater.checkForUpdates()
      .catch((error) => { log(`Error Fetching Update Info - ${error.message}`); });
      console.log('Checking for updates...');
    }

    // Check for Wine and PHP on Linux/Mac
    if (process.platform !== 'win32') {
      which('php', function(err: Error | null) {
        if (err) {
          log('Warning: PHP not found in path, may cause unexpected behaviour.');
          remote.dialog.showMessageBox({
            type: 'error',
            title: strings.dialog.programNotFound,
            message: strings.dialog.phpNotFound,
            buttons: ['Ok']
          } );
        }
      });
    }
  }

  componentDidUpdate(prevProps: AppProps, prevState: AppState) {
    const { history, location, preferencesData } = this.props;
    const library = getBrowseSubPath(this.props.location.pathname);
    const prevLibrary = getBrowseSubPath(prevProps.location.pathname);
    const view = this.state.views[library];
    const prevView = prevState.views[prevLibrary];
    // Check if theme changed
    if (preferencesData.currentTheme !== prevProps.preferencesData.currentTheme) {
      setTheme(preferencesData.currentTheme);
    }
    // Check if the playlist changed
    if (view && (view.selectedPlaylistId !== (prevView && prevView.selectedPlaylistId))) {
      this.setState({
        views: {
          ...this.state.views,
          [library]: {
            ...view,
            dirtyCache: true,
          }
        }
      }, () => { this.requestSelectedGame(library); });
    }
    // Check if the library changed
    if (library && prevLibrary && library !== prevLibrary) {
      // Fetch first games when switching browse page view
      this.requestSelectedGame(library);
      // Update search options (if they have changed)
      if (view) {
        if (view.query.search       !== this.props.search.text ||
            view.query.extreme      !== this.props.preferencesData.browsePageShowExtreme ||
            view.query.orderBy      !== this.state.order.orderBy ||
            view.query.orderReverse !== this.state.order.orderReverse) {
          this.setState({
            views: {
              ...this.state.views,
              [library]: {
                ...view,
                dirtyCache: true,
                query: {
                  ...view.query,
                  search: this.props.search.text,
                  extreme: this.props.preferencesData.browsePageShowExtreme,
                  orderBy: this.state.order.orderBy,
                  orderReverse: this.state.order.orderReverse,
                },
              }
            }
          }, () => { this.requestSelectedGame(library); });
        }
      }
    }
    // Update search text of current library
    if (this.props.search.text !== prevProps.search.text) {
      if (view) {
        if (view.query.search !== this.props.search.text) {
          this.setState({
            views: {
              ...this.state.views,
              [library]: {
                ...view,
                dirtyCache: true,
                query: {
                  ...view.query,
                  search: this.props.search.text,
                },
              }
            }
          }, () => {
            // @TODO This requets some games just to update the state with some fresh values
            //       from the back. It's kinda cheesy and probably adds an unnecessary delay.
            this.requestSelectedGame(library);
          });
        }
      }
    }
    // Update preference "lastSelectedLibrary"
    const gameLibrary = getBrowseSubPath(location.pathname);
    if (location.pathname.startsWith(Paths.BROWSE) &&
        preferencesData.lastSelectedLibrary !== gameLibrary) {
      updatePreferencesData({ lastSelectedLibrary: gameLibrary });
    }
    // Create a new game
    if (this.state.wasNewGameClicked) {
      let route = '';
      if (preferencesData.lastSelectedLibrary) {
        route = preferencesData.lastSelectedLibrary;
      } else {
        const defaultLibrary = preferencesData.defaultLibrary;
        if (defaultLibrary) { route = defaultLibrary; }
        else                { route = UNKNOWN_LIBRARY; }
      }
      if (!location.pathname.startsWith(Paths.BROWSE)) {
        history.push(joinLibraryRoute(route));
      }
      if (location.pathname.startsWith(Paths.BROWSE)) {
        this.setState({ wasNewGameClicked: false });
        // Deselect the current game
        const view = this.state.views[route];
        if (view && view.selectedGameId !== undefined) {
          const views = { ...this.state.views };
          views[route] = {
            ...view,
            selectedGameId: undefined,
          };
          this.setState({ views });
        }
      }
    }
  }

  render() {
    const loaded = (
      this.state.loaded[BackInit.GAMES] &&
      this.state.loaded[BackInit.PLAYLISTS] &&
      this.state.upgradesDoneLoading &&
      this.state.creditsDoneLoading &&
      this.state.loaded[BackInit.EXEC]
    );
    const libraryPath = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[libraryPath];
    const playlists = this.filterAndOrderPlaylistsMemo(this.state.playlists, libraryPath);
    // Props to set to the router
    const routerProps: AppRouterProps = {
      games: view && view.games,
      gamesTotal: view ? view.total : 0,
      playlists: playlists,
      suggestions: this.state.suggestions,
      appPaths: this.state.appPaths,
      platforms: this.state.platforms,
      platformsFlat: this.flattenPlatformsMemo(this.state.platforms),
      playlistIconCache: this.state.playlistIconCache,
      onSaveGame: this.onSaveGame,
      onLaunchGame: this.onLaunchGame,
      onRequestGames: this.onRequestGames,
      onQuickSearch: this.onQuickSearch,
      libraries: this.state.libraries,
      localeCode: this.state.localeCode,
      upgrades: this.state.upgrades,
      creditsData: this.state.creditsData,
      creditsDoneLoading: this.state.creditsDoneLoading,
      order: this.state.order,
      gameScale: this.state.gameScale,
      gameLayout: this.state.gameLayout,
      selectedGameId: view && view.selectedGameId,
      selectedPlaylistId: view && view.selectedPlaylistId,
      onSelectGame: this.onSelectGame,
      onSelectPlaylist: this.onSelectPlaylist,
      wasNewGameClicked: this.state.wasNewGameClicked,
      onDownloadUpgradeClick: this.onDownloadUpgradeClick,
      gameLibrary: libraryPath,
      themeList: this.state.themeList,
      languages: this.state.langList,
      updateInfo: this.state.updateInfo,
      autoUpdater: autoUpdater,
    };
    // Render
    return (
      <LangContext.Provider value={this.state.lang}>
        { !this.state.stopRender ? (
          <>
            {/* Splash screen */}
            <SplashScreen
              gamesLoaded={this.state.loaded[BackInit.GAMES]}
              playlistsLoaded={this.state.loaded[BackInit.PLAYLISTS]}
              upgradesLoaded={this.state.upgradesDoneLoading}
              creditsLoaded={this.state.creditsDoneLoading}
              miscLoaded={this.state.loaded[BackInit.EXEC]} />
            {/* Title-bar (if enabled) */}
            { window.External.config.data.useCustomTitlebar ? (
              <TitleBar title={`${AppConstants.appTitle} (${remote.app.getVersion()})`} />
            ) : undefined }
            {/* "Content" */}
            { loaded ? (
              <>
                {/* Header */}
                <HeaderContainer
                  libraries={this.state.libraries}
                  onOrderChange={this.onOrderChange}
                  onToggleLeftSidebarClick={this.onToggleLeftSidebarClick}
                  onToggleRightSidebarClick={this.onToggleRightSidebarClick}
                  order={this.state.order} />
                {/* Main */}
                <div className='main'>
                  <AppRouter { ...routerProps } />
                  <noscript className='nojs'>
                    <div style={{textAlign:'center'}}>
                      This website requires JavaScript to be enabled.
                    </div>
                  </noscript>
                </div>
                {/* Footer */}
                <ConnectedFooter
                  totalCount={this.state.gamesTotal}
                  currentLabel={libraryPath && getLibraryItemTitle(libraryPath, this.state.lang.libraries)}
                  currentCount={view ? view.total : 0}
                  onScaleSliderChange={this.onScaleSliderChange} scaleSliderValue={this.state.gameScale}
                  onLayoutChange={this.onLayoutSelectorChange} layout={this.state.gameLayout}
                  onNewGameClick={this.onNewGameClick} />
              </>
            ) : undefined }
          </>
        ) : undefined }
      </LangContext.Provider>
    );
  }

  private onOrderChange = (event: GameOrderChangeEvent): void => {
    const library = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[library];
    if (view) {
      // @TODO I'm thinking about moving the order options to be specific to each view,
      //       instead of global. But maybe that is unnecessary and just adds complexity.
      this.setState({
        order: event,
        views: {
          ...this.state.views,
          [library]: {
            ...view,
            dirtyCache: true,
            query: {
              ...view.query,
              orderBy: event.orderBy,
              orderReverse: event.orderReverse,
            },
          }
        }
      }, () => { this.requestSelectedGame(library); });
    }
    // Update Preferences Data (this is to make it get saved on disk)
    updatePreferencesData({
      gamesOrderBy: event.orderBy,
      gamesOrder: event.orderReverse
    });
  }

  private onScaleSliderChange = (value: number): void => {
    this.setState({ gameScale: value });
    // Update Preferences Data (this is to make it get saved on disk)
    updatePreferencesData({ browsePageGameScale: value });
  }

  private onLayoutSelectorChange = (value: BrowsePageLayout): void => {
    this.setState({ gameLayout: value });
    // Update Preferences Data (this is to make it get saved on disk)
    updatePreferencesData({ browsePageLayout: value });
  }

  private onNewGameClick = (): void => {
    this.setState({ wasNewGameClicked: true });
  }

  private onToggleLeftSidebarClick = (): void => {
    updatePreferencesData({ browsePageShowLeftSidebar: !this.props.preferencesData.browsePageShowLeftSidebar });
    this.forceUpdate();
  }

  private onToggleRightSidebarClick = (): void => {
    updatePreferencesData({ browsePageShowRightSidebar: !this.props.preferencesData.browsePageShowRightSidebar });
    this.forceUpdate();
  }

  private onSelectGame = (gameId?: string): void => {
    const library = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[library];
    if (view) {
      this.setState({
        views: {
          ...this.state.views,
          [library]: {
            ...view,
            selectedGameId: gameId,
          }
        }
      });
    }
  }

  /** Set the selected playlist for a single "browse route" */
  private onSelectPlaylist = (library: string, playlistId: string | undefined): void => {
    const view = this.state.views[library];
    if (view) {
      this.setState({
        views: {
          ...this.state.views,
          [library]: {
            ...view,
            selectedPlaylistId: playlistId,
            selectedGameId: undefined,
          }
        }
      });
    }
  }

  private onDownloadUpgradeClick = (stage: UpgradeStage, strings: LangContainer) => {
    downloadAndInstallStage(stage, this.setUpgradeStageState, strings);
  }

  private setUpgradeStageState = (id: string, data: Partial<UpgradeStageState>) => {
    const { upgrades } = this.state;
    const index = upgrades.findIndex(u => u.id === id);
    if (index !== -1) {
      const newUpgrades = deepCopy(upgrades);
      const newStageState = Object.assign({}, upgrades[index].state, data);
      newUpgrades[index].state = newStageState;
      this.setState({
        upgrades: newUpgrades,
      });
    }
  }

  onSaveGame = (game: IGameInfo, addApps: IAdditionalApplicationInfo[] | undefined, playlistNotes: string | undefined, saveToFile: boolean): void => {
    const library = getBrowseSubPath(this.props.location.pathname);
    window.External.back.send<any, SaveGameData>(BackIn.SAVE_GAME, { game, addApps: addApps || [], library, saveToFile });

    const view = this.state.views[library];
    if (view && view.selectedPlaylistId && view.selectedGameId) {
      // Find the selected game in the selected playlist
      const playlist = this.state.playlists.find(p => p.filename === view.selectedPlaylistId);
      if (playlist) {
        const entryIndex = playlist.games.findIndex(g => g.id === view.selectedGameId);
        if (entryIndex >= 0 && playlist.games[entryIndex].notes !== playlistNotes) {
          // Save playlist
          const newPlaylist = deepCopy(playlist); // @PERF This should only copy the objects that are modified instead of the whole thing
          newPlaylist.games[entryIndex].notes = playlistNotes;
          window.External.back.send<any, SavePlaylistData>(BackIn.SAVE_PLAYLIST, { playlist: newPlaylist });
        }
      }
    }
  }

  onLaunchGame(gameId: string): void {
    window.External.back.send<LaunchGameData>(BackIn.LAUNCH_GAME, { id: gameId });
  }

  /** Fetch the selected game of the specified library (or the first page if no game is selected). */
  requestSelectedGame(library: string): void {
    const view = this.state.views[library];

    if (!view) {
      log(`Failed to request game index. Current view is missing (Library: "${library}", View: "${view}").`);
      return;
    }

    if (view.selectedGameId === undefined) {
      this.onRequestGames(0, 1);
    } else {
      window.External.back.send<any, BrowseViewIndexData>(BackIn.BROWSE_VIEW_INDEX, {
        gameId: view.selectedGameId,
        query: {
          extreme: view.query.extreme,
          broken: false, // @TODO Add an option for this or something
          library: library,
          search: view.query.search,
          playlistId: view && view.selectedPlaylistId,
          orderBy: view.query.orderBy,
          orderReverse: view.query.orderReverse,
        }
      }, res => {
        const resData: BrowseViewIndexResponseData = res.data;
        if (resData.index >= 0) { // (Game found)
          this.onRequestGames(resData.index, 1);
        } else { // (Game not found)
          this.setState({
            views: {
              ...this.state.views,
              [library]: {
                ...view,
                selectedGameId: undefined,
              }
            }
          }, () => { this.onRequestGames(0, 1); });
        }
      });
    }
  }

  onRequestGames = (offset: number, limit: number): void => {
    const library = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[library];

    if (!view) {
      log(`Failed to request games. Current view is missing (Library: "${library}", View: "${view}").`);
      return;
    }

    const pageMin = Math.floor(offset / VIEW_PAGE_SIZE);
    const pageMax = Math.ceil((offset + limit) / VIEW_PAGE_SIZE);

    const pageIndices: number[] = [];
    const pages: ViewPage[] = [];
    for (let page = pageMin; page <= pageMax; page++) {
      if (view.dirtyCache || !view.pages[page]) {
        pageIndices.push(page);
        pages.push({});
      }
    }

    if (pages.length > 0) {
      // console.log(`GET (PAGES: ${pageMin} - ${pageMax} | OFFSET: ${pageMin * VIEW_PAGE_SIZE} | LIMIT: ${(pageMax - pageMin + 1) * VIEW_PAGE_SIZE})`);
      window.External.back.sendReq<any, BrowseViewPageData>({
        id: library, // @TODO Add this as an optional property of the data instead of misusing the id
        type: BackIn.BROWSE_VIEW_PAGE,
        data: {
          offset: pageMin * VIEW_PAGE_SIZE,
          limit: (pageMax - pageMin + 1) * VIEW_PAGE_SIZE,
          query: {
            extreme: view.query.extreme,
            broken: false, // @TODO Add an option for this or something
            library: library,
            search: view.query.search,
            playlistId: view && view.selectedPlaylistId,
            orderBy: view.query.orderBy,
            orderReverse: view.query.orderReverse,
          },
        }
      });

      const newPages: Record<number, ViewPage | undefined> = {};
      for (let i = 0; i < pages.length; i++) {
        newPages[pageIndices[i]] = pages[i];
      }
      this.setState({
        views: {
          ...this.state.views,
          [library]: {
            ...view,
            pages: {
              ...view.pages,
              ...newPages
            }
          },
        }
      });
    }
  }

  onQuickSearch = (search: string): void => {
    const library = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[library];

    if (!view) {
      log(`Failed to quick search. Current view is missing (Library: "${library}", View: "${view}").`);
      return;
    }

    window.External.back.send<QuickSearchResponseData, QuickSearchData>(BackIn.QUICK_SEARCH, {
      search: search,
      query: {
        extreme: this.props.preferencesData.browsePageShowExtreme,
        broken: false, // @TODO Add an option for this or something
        library: library,
        search: this.props.search.text, // view.query.search,
        playlistId: view && view.selectedPlaylistId,
        orderBy: this.state.order.orderBy, // view.query.orderBy,
        orderReverse: this.state.order.orderReverse, // view.query.orderReverse,
      },
    }, res => {
      const view = this.state.views[library];
      if (res.data && view) {
        // Fetch the page that the game is on
        if (res.data.index !== undefined && !view.pages[(res.data.index / VIEW_PAGE_SIZE) | 0]) {
          this.onRequestGames(res.data.index, res.data.index);
        }

        this.setState({
          views: {
            ...this.state.views,
            [library]: {
              ...view,
              selectedGameId: res.data.id
            },
          }
        });
      }
    });
  }

  cachePlaylistIcons(playlists: GamePlaylist[]): void {
    Promise.all(playlists.map(p => (async () => {
      if (p.icon) { return cacheIcon(p.icon); }
    })()))
    .then(urls => {
      const cache: Record<string, string> = {};
      for (let i = 0; i < playlists.length; i++) {
        const url = urls[i];
        if (url) { cache[playlists[i].filename] = url; }
      }
      this.setState({ playlistIconCache: cache });
    });
  }

  filterAndOrderPlaylistsMemo = memoizeOne((playlists: GamePlaylist[], library: string) => {
    // @FIXTHIS "arcade" should not be hard coded as the "default" library
    const lowerLibrary = library.toLowerCase();
    return (
      playlists
      .filter(p => p.library ? p.library.toLowerCase() === lowerLibrary : (lowerLibrary === '' || lowerLibrary === 'arcade'))
      .sort((a, b) => {
        if (a.title < b.title) { return -1; }
        if (a.title > b.title) { return  1; }
        return 0;
      })
    );
  });

  private unmountBeforeClose = (): void => {
    this.setState({ stopRender: true });
    setTimeout(() => { window.close(); }, 100);
  }

  /** Convert the platforms object into a flat array of platform names (with all duplicates removed). */
  private flattenPlatformsMemo = memoizeOne((platforms: Record<string, string[]>): string[] => {
    const names: string[] = [];
    const libraries = Object.keys(platforms);
    for (let i = 0; i < libraries.length; i++) {
      const p = platforms[libraries[i]];
      for (let j = 0; j < p.length; j++) {
        if (names.indexOf(p[j]) === -1) { names.push(p[j]); }
      }
    }
    return names;
  });
}

async function downloadAndInstallStage(stage: UpgradeStage, setStageState: (id: string, stage: Partial<UpgradeStageState>) => void, strings: LangContainer) {
  // Check data folder is set
  let flashpointPath = window.External.config.data.flashpointPath;
  const isValid = await isFlashpointValidCheck(flashpointPath);
  if (!isValid) {
    let verifiedPath = false;
    let chosenPath: (string | undefined);
    while (verifiedPath !== true) {
      // If folder isn't set, ask to set now
      const res = await openConfirmDialog(strings.dialog.flashpointPathInvalid, strings.dialog.flashpointPathNotFound);
      if (!res) { return; }
      // Set folder now
      const chosenPaths = window.External.showOpenDialogSync({
        title: strings.dialog.selectFolder,
        properties: ['openDirectory', 'promptToCreate', 'createDirectory']
      });
      if (chosenPaths && chosenPaths.length > 0) {
        // Take first selected folder (Should only be able to select 1 anyway!)
        chosenPath = chosenPaths[0];
        // Make sure we can write to this path
        const havePerms = await canReadWrite(chosenPath);
        if (!havePerms) {
          remote.dialog.showMessageBoxSync({
            title: strings.dialog.badFolderPerms,
            type: 'error',
            message: strings.dialog.pickAnotherFolder
          });
        } else {
          // Verify the path chosen is the one desired
          const topString = formatString(strings.dialog.upgradeWillInstallTo, getUpgradeString(stage.title, strings.upgrades));
          const choiceVerify = await openConfirmDialog(strings.dialog.areYouSure, `${topString}:\n\n${chosenPath}\n\n${strings.dialog.verifyPathSelection}`);
          if (choiceVerify) {
            verifiedPath = true;
          }
        }
      } else {
        // Window closed, cancel the upgrade
        return;
      }
    }
    // Make sure folder given exists
    if (chosenPath) {
      flashpointPath = chosenPath;
      fs.ensureDirSync(flashpointPath);
      // Save picked folder to config
      window.External.back.send<any, UpdateConfigData>(BackIn.UPDATE_CONFIG, {
        flashpointPath: flashpointPath,
      }, () => { /* window.External.restart(); */ });
    }
  }
  // Flag as installing
  setStageState(stage.id, {
    isInstalling: true,
    installProgressNote: '...',
  });
  // Grab filename from url

  for (let source of stage.sources) {
    const filename = stage.id + '__' + source.split('/').pop() || 'unknown';
    let lastUpdateType = '';
    // Start download and installation
    let prevProgressUpdate = Date.now();
    const state = downloadAndInstallUpgrade(stage, {
      installPath: path.join(flashpointPath),
      downloadFilename: filename
    })
    .on('progress', () => {
      const now = Date.now();
      if (now - prevProgressUpdate > 100 || lastUpdateType !== state.currentTask) {
        prevProgressUpdate = now;
        lastUpdateType = state.currentTask;
        switch (state.currentTask) {
          case 'downloading': setStageState(stage.id, { installProgressNote: `${strings.misc.downloading}: ${(state.downloadProgress * 100).toFixed(1)}%` }); break;
          case 'extracting':  setStageState(stage.id, { installProgressNote: `${strings.misc.extracting}: ${(state.extractProgress * 100).toFixed(1)}%` });   break;
          case 'installing':  setStageState(stage.id, { installProgressNote: `${strings.misc.installingFiles}`});                                         break;
          default:            setStageState(stage.id, { installProgressNote: '...' });                                                        break;
        }
      }
    })
    .once('done', async () => {
      // Flag as done installing
      setStageState(stage.id, {
        isInstalling: false,
        isInstallationComplete: true,
      });
      const res = await openConfirmDialog(strings.dialog.restartNow, strings.dialog.restartToApplyUpgrade);
      if (res) {
        window.External.restart();
      }
    })
    .once('error', (error) => {
      // Flag as not installing (so the user can retry if they want to)
      setStageState(stage.id, {
        isInstalling: false,
      });
      log(`Error installing '${stage.title}' - ${error.message}`);
      console.error(error);
    })
    .on('warn', console.warn);
  }
}

/** Get the "library route" of a url (returns empty string if URL is not a valid "sub-browse path") */
function getBrowseSubPath(urlPath: string): string {
  if (urlPath.startsWith(Paths.BROWSE)) {
    let str = urlPath.substr(Paths.BROWSE.length);
    if (str[0] === '/') { str = str.substring(1); }
    return str;
  }
  return '';
}

async function cacheIcon(icon: string): Promise<string> {
  const r = await fetch(icon);
  const blob = await r.blob();
  return `url(${URL.createObjectURL(blob)})`;
}

function onUpdateDownloaded() {
  remote.dialog.showMessageBox({
    title: 'Installing Update',
    message: 'The Launcher will restart to install the update now.',
    buttons: ['OK']
  })
  .then(() => {
    setImmediate(() => autoUpdater.quitAndInstall());
  });
}

function log(content: string): void {
  window.External.back.send<any, AddLogData>(BackIn.ADD_LOG, {
    source: 'Launcher',
    content: content,
  });
}
