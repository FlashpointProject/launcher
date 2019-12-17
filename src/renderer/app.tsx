import { ipcRenderer, remote } from 'electron';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import * as which from 'which';
import * as AppConstants from '../shared/AppConstants';
import { AddLogData, BackIn, BackInit, BackOut, BrowseChangeData, BrowseViewAllData, BrowseViewPageData, BrowseViewPageResponseData, GetPlaylistResponse, InitEventData, LanguageChangeData, LanguageListChangeData, LaunchGameData, LogEntryAddedData, PlaylistRemoveData, PlaylistUpdateData, QuickSearchData, QuickSearchResponseData, SaveGameData, SavePlaylistData, ServiceChangeData, ThemeChangeData, ThemeListChangeData } from '../shared/back/types';
import { BrowsePageLayout } from '../shared/BrowsePageLayout';
import { IAdditionalApplicationInfo, IGameInfo, UNKNOWN_LIBRARY } from '../shared/game/interfaces';
import { GamePlaylist, ProcessState, WindowIPC } from '../shared/interfaces';
import { LangContainer, LangFile } from '../shared/lang';
import { getLibraryItemTitle } from '../shared/library/util';
import { memoizeOne } from '../shared/memoize';
import { GameOrderBy, GameOrderReverse } from '../shared/order/interfaces';
import { updatePreferencesData } from '../shared/preferences/util';
import { setTheme } from '../shared/Theme';
import { Theme } from '../shared/ThemeFile';
import { deepCopy, recursiveReplace, versionNumberToText } from '../shared/Util';
import { GameOrderChangeEvent } from './components/GameOrder';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';
import { ConnectedFooter } from './containers/ConnectedFooter';
import HeaderContainer from './containers/HeaderContainer';
import { WithPreferencesProps } from './containers/withPreferences';
import { CreditsFile } from './credits/CreditsFile';
import { CreditsData } from './credits/types';
import { CentralState, GAMES, SUGGESTIONS, UpgradeStageState, UpgradeState } from './interfaces';
import { Paths } from './Paths';
import { AppRouter, AppRouterProps } from './router';
import { SearchQuery } from './store/search';
import { UpgradeStage } from './upgrade/types';
import { UpgradeFile } from './upgrade/UpgradeFile';
import { joinLibraryRoute } from './Util';
import { LangContext } from './util/lang';
import { downloadAndInstallUpgrade, performUpgradeStageChecks } from './util/upgrade';

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
  suggestions: SUGGESTIONS;
  platforms: string[];
  loaded: { [key in BackInit]: boolean; };
  themeList: Theme[];

  /** Semi-global prop. */
  central: CentralState;
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
};

export class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    // Normal constructor stuff
    const preferencesData = this.props.preferencesData;
    this.state = {
      views: {},
      libraries: [],
      playlists: window.External.initialPlaylists || [],
      playlistIconCache: {},
      suggestions: {},
      platforms: window.External.initialPlatformNames,
      loaded: {
        0: false,
        1: false,
      },
      themeList: window.External.initialThemes,

      central: {
        upgrade: {
          doneLoading: false,
          techState: {
            alreadyInstalled: false,
            checksDone: false,
            isInstalling: false,
            isInstallationComplete: false,
            installProgressNote: '',
          },
          screenshotsState: {
            alreadyInstalled: false,
            checksDone: false,
            isInstalling: false,
            isInstallationComplete: false,
            installProgressNote: '',
          },
        },
      },
      creditsData: undefined,
      creditsDoneLoading: false,
      gameScale: preferencesData.browsePageGameScale,
      gameLayout: preferencesData.browsePageLayout,
      lang: window.External.initialLang,
      langList: window.External.initialLangList,
      wasNewGameClicked: false,
      order: {
        orderBy: preferencesData.gamesOrderBy,
        orderReverse: preferencesData.gamesOrder
      }
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
        const { central } = this.state;
        if (askBeforeClosing && (central.upgrade.screenshotsState.isInstalling || central.upgrade.techState.isInstalling)) {
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
              remote.getCurrentWindow().close();
            }
          });
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

    window.External.back.send<BrowseViewAllData>(BackIn.GET_LIBRARIES, undefined, res => {
      if (!res.data) { throw new Error('no boring data wtf'); }
      const libraries = res.data.libraries;

      const views: Record<string, View> = {};
      for (let library of libraries) {
        views[library] = {
          dirtyCache: false,
          games: {},
          pages: {},
          total: 0,
          query: {
            search: this.props.search.text,
            orderBy: this.state.order.orderBy,
            orderReverse: this.state.order.orderReverse,
          }
        };
      }

      this.setState({
        libraries,
        views,
      });
    });

    window.External.back.on('message', res => {
      // console.log('IN', res);
      switch (res.type) {
        case BackOut.INIT_EVENT: {
          const resData: InitEventData = res.data;

          const loaded = { ...this.state.loaded };
          for (let index of resData.done) {
            loaded[index] = true;

            if (index+'' === BackInit.PLAYLISTS+'') {
              window.External.back.send<GetPlaylistResponse>(BackIn.GET_PLAYLISTS, undefined, res => {
                if (res.data) {
                  this.setState({ playlists: res.data });
                  this.cachePlaylistIcons(res.data);
                }
              });
            }
          }

          this.setState({ loaded });
        } break;

        case BackOut.LOG_ENTRY_ADDED: {
          const resData: LogEntryAddedData = res.data;
          window.External.log.entries[resData.index - window.External.log.offset] = resData.entry;
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

          if (resData.library) { // (Clear specific cache)
            const view = this.state.views[resData.library];
            if (view) {
              this.setState({
                views: {
                  ...this.state.views,
                  [resData.library]: {
                    ...view,
                    dirtyCache: true,
                  }
                }
              }, () => { this.onRequestGames(0, 1); });
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
            this.setState({ views: newViews }, () => { this.onRequestGames(0, 1); });
          }
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
              () => { if (state.views) { this.onRequestGames(0, 1); } }
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

    //
    UpgradeFile.readFile(fullJsonFolderPath, log)
    .then((data) => {
      this.setUpgradeState({
        data: data,
        doneLoading: true,
      });
      performUpgradeStageChecks(data.screenshots, fullFlashpointPath)
      .then(results => {
        this.setScreenshotsUpgradeState({
          alreadyInstalled: results.indexOf(false) === -1,
          checksDone: true,
        });
      });
      performUpgradeStageChecks(data.tech, fullFlashpointPath)
      .then(results => {
        this.setTechUpgradeState({
          alreadyInstalled: results.indexOf(false) === -1,
          checksDone: true,
        });
      });
    })
    .catch((error) => {
      console.warn(error);
      this.setUpgradeState({ doneLoading: true });
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
    // Check for Wine and PHP on Linux
    if (process.platform === 'linux') {
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
      which('wine', function(err: Error | null) {
        if (err) {
          if (window.External.preferences.data.useWine) {
            log('Warning: Wine is enabled but it was not found on the path.');
            remote.dialog.showMessageBox({
              type: 'error',
              title: strings.dialog.programNotFound,
              message: strings.dialog.wineNotFound,
              buttons: ['Ok']
            } );
          }
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
      }, () => { this.onRequestGames(0, 1); });
    }
    // Check if the library changed
    if (library && prevLibrary && library !== prevLibrary) {
      // Fetch first games when switching browse page view
      this.onRequestGames(0, 1);
      // Update search options (if they have changed)
      if (view) {
        if (view.query.search       !== this.props.search.text ||
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
                  orderBy: this.state.order.orderBy,
                  orderReverse: this.state.order.orderReverse,
                },
              }
            }
          }, () => { this.onRequestGames(0, 1); });
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
            this.onRequestGames(0, 1);
          });
        }
      }
    }
    // Update preference "lastSelectedLibrary"
    const gameLibraryRoute = getBrowseSubPath(location.pathname);
    if (location.pathname.startsWith(Paths.BROWSE) &&
        preferencesData.lastSelectedLibrary !== gameLibraryRoute) {
      updatePreferencesData({ lastSelectedLibrary: gameLibraryRoute });
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
      this.state.central.upgrade.doneLoading &&
      this.state.creditsDoneLoading
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
      platforms: this.state.platforms,
      playlistIconCache: this.state.playlistIconCache,
      onSaveGame: this.onSaveGame,
      onLaunchGame: this.onLaunchGame,
      onRequestGames: this.onRequestGames,
      onQuickSearch: this.onQuickSearch,

      central: this.state.central,
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
      onDownloadTechUpgradeClick: this.onDownloadTechUpgradeClick,
      onDownloadScreenshotsUpgradeClick: this.onDownloadScreenshotsUpgradeClick,
      gameLibrary: libraryPath,
      themeList: this.state.themeList,
      languages: this.state.langList,
    };
    // Render
    return (
      <LangContext.Provider value={this.state.lang}>
        {/* Splash screen */}
        <SplashScreen
          gamesLoaded={this.state.loaded[BackInit.GAMES]}
          playlistsLoaded={this.state.loaded[BackInit.PLAYLISTS]}
          upgradesLoaded={this.state.central.upgrade.doneLoading}
          creditsLoaded={this.state.creditsDoneLoading} />
        {/* Title-bar (if enabled) */}
        { window.External.config.data.useCustomTitlebar ? (
          <TitleBar title={`${AppConstants.appTitle} (${versionNumberToText(window.External.misc.version)})`} />
        ) : undefined }
        {/* "Content" */}
        {loaded ? (
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
              totalCount={-1}
              currentLabel={libraryPath && getLibraryItemTitle(libraryPath, this.state.lang.libraries)}
              currentCount={view ? view.total : 0}
              onScaleSliderChange={this.onScaleSliderChange} scaleSliderValue={this.state.gameScale}
              onLayoutChange={this.onLayoutSelectorChange} layout={this.state.gameLayout}
              onNewGameClick={this.onNewGameClick} />
          </>
        ) : undefined}
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
      }, () => { this.onRequestGames(0, 1); });
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

  private onDownloadTechUpgradeClick = () => {
    const upgradeData = this.state.central.upgrade.data;
    if (!upgradeData) { throw new Error('Upgrade data not found?'); }
    downloadAndInstallStage(upgradeData.tech, 'flashpoint_stage_tech.zip', this.setTechUpgradeState);
  }

  private onDownloadScreenshotsUpgradeClick = () => {
    const upgradeData = this.state.central.upgrade.data;
    if (!upgradeData) { throw new Error('Upgrade data not found?'); }
    downloadAndInstallStage(upgradeData.screenshots, 'flashpoint_stage_screenshots.zip', this.setScreenshotsUpgradeState);
  }

  private setUpgradeState(state: Partial<UpgradeState>) {
    this.setState({
      central: Object.assign({}, this.state.central, {
        upgrade: Object.assign({}, this.state.central.upgrade, state),
      })
    });
  }

  private setTechUpgradeState = (state: Partial<UpgradeStageState>): void => {
    const { central: { upgrade: { techState } } } = this.state;
    this.setUpgradeState({
      techState: Object.assign({}, techState, state),
    });
  }

  private setScreenshotsUpgradeState = (state: Partial<UpgradeStageState>):void => {
    const { central: { upgrade: { screenshotsState } } } = this.state;
    this.setUpgradeState({
      screenshotsState: Object.assign({}, screenshotsState, state),
    });
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
        id: library,
        type: BackIn.BROWSE_VIEW_PAGE,
        data: {
          offset: pageMin * VIEW_PAGE_SIZE,
          limit: (pageMax - pageMin + 1) * VIEW_PAGE_SIZE,
          query: {
            extreme: this.props.preferencesData.browsePageShowExtreme,
            broken: false, // @TODO Add an option for this or something
            library: library,
            search: this.props.search.text, // view.query.search,
            playlistId: view && view.selectedPlaylistId,
            orderBy: this.state.order.orderBy, // view.query.orderBy,
            orderReverse: this.state.order.orderReverse, // view.query.orderReverse,
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
}

function downloadAndInstallStage(stage: UpgradeStage, filename: string, setStageState: (stage: Partial<UpgradeStageState>) => void) {
  // Flag as installing
  setStageState({
    isInstalling: true,
    installProgressNote: '...',
  });
  // Start download and installation
  let prevProgressUpdate = Date.now();
  const state = (
    downloadAndInstallUpgrade(stage, {
      installPath: window.External.config.fullFlashpointPath,
      downloadFilename: filename
    })
    .on('progress', () => {
      const now = Date.now();
      if (now - prevProgressUpdate > 100) {
        prevProgressUpdate = now;
        switch (state.currentTask) {
          case 'downloading': setStageState({ installProgressNote: `Downloading: ${(state.downloadProgress * 100).toFixed(1)}%` }); break;
          case 'extracting':  setStageState({ installProgressNote: `Extracting: ${(state.extractProgress * 100).toFixed(1)}%` });   break;
          default:            setStageState({ installProgressNote: '...' });                                                        break;
        }
      }
    })
    .once('done', () => {
      // Flag as done installing
      setStageState({
        isInstalling: false,
        isInstallationComplete: true,
      });
    })
    .once('error', (error) => {
      // Flag as not installing (so the user can retry if they want to)
      setStageState({ isInstalling: false });
      console.error(error);
    })
    .on('warn', console.warn)
  );
}

/** Get the "library route" of a url (returns empty string if URL is not a valid "sub-browse path") */
function getBrowseSubPath(urlPath: string): string {
  if (urlPath.startsWith(Paths.BROWSE)) {
    let str = urlPath.substr(Paths.BROWSE.length);
    if (str[0] == '/') { str = str.substring(1); }
    return str;
  }
  return '';
}

async function cacheIcon(icon: string): Promise<string> {
  const r = await fetch(icon);
  const blob = await r.blob();
  return `url(${URL.createObjectURL(blob)})`;
}

function log(content: string): void {
  window.External.back.send<any, AddLogData>(BackIn.ADD_LOG, {
    source: 'Launcher',
    content: content,
  });
}
