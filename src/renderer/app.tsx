import { ipcRenderer, remote } from 'electron';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import * as which from 'which';
import * as AppConstants from '../shared/AppConstants';
import { BackIn, BackInit, BackOut, BrowseChangeData, BrowseViewAllData, BrowseViewPageData, BrowseViewPageResponseData, InitEventData, LaunchGameData, SaveGameData, DeleteGameData } from '../shared/back/types';
import { sendRequest } from '../shared/back/util';
import { BrowsePageLayout } from '../shared/BrowsePageLayout';
import { IAdditionalApplicationInfo, IGameInfo, UNKNOWN_LIBRARY } from '../shared/game/interfaces';
import { WindowIPC } from '../shared/interfaces';
import { LangContainer, LangFile } from '../shared/lang';
import { getLibraryItemTitle } from '../shared/library/util';
import { GameOrderBy, GameOrderReverse } from '../shared/order/interfaces';
import { PlatformInfo } from '../shared/platform/interfaces';
import { updatePreferencesData } from '../shared/preferences/util';
import { versionNumberToText } from '../shared/Util';
import { formatString } from '../shared/utils/StringFormatter';
import { GameOrderChangeEvent } from './components/GameOrder';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';
import { ConnectedFooter } from './containers/ConnectedFooter';
import HeaderContainer from './containers/HeaderContainer';
import { WithPreferencesProps } from './containers/withPreferences';
import { CreditsFile } from './credits/CreditsFile';
import { CreditsData } from './credits/types';
import { GameImageCollection } from './image/GameImageCollection';
import { CentralState, GAMES, SUGGESTIONS, UpgradeStageState, UpgradeState } from './interfaces';
import { LangManager } from './lang/LangManager';
import { Paths } from './Paths';
import { GamePlaylistManager } from './playlist/GamePlaylistManager';
import { GamePlaylist } from './playlist/types';
import { AppRouter, AppRouterProps } from './router';
import { SearchQuery } from './store/search';
import { Theme } from './theme/Theme';
import { ThemeManager } from './theme/ThemeManager';
import { UpgradeStage } from './upgrade/types';
import { UpgradeFile } from './upgrade/UpgradeFile';
import { joinLibraryRoute } from './Util';
import { LangContext } from './util/lang';
import { downloadAndInstallUpgrade, performUpgradeStageChecks } from './util/upgrade';

type Views = Record<string, View | undefined>; // views[id] = view
type View = {
  games: GAMES;
  pages: Record<number, ViewPage | undefined>;
  total: number;
  selectedPlaylistId?: string;
  selectedGameId?: string;
  /** The most recent query used for this view. */
  query: {
    search: string;
    orderBy: GameOrderBy;
    orderReverse: GameOrderReverse;
  };
}
type ViewPage = {
}

type AppOwnProps = {
  /** Most recent search query. */
  search: SearchQuery;
  /** Theme manager. */
  themes: ThemeManager;
  /** Lang manager. */
  langManager: LangManager;
};

export type AppProps = AppOwnProps & RouteComponentProps & WithPreferencesProps;

export type AppState = {
  views: Views;
  libraries: string[];
  playlists: GamePlaylist[];
  suggestions: SUGGESTIONS;
  platforms: PlatformInfo[];
  loaded: { [key in BackInit]: boolean; };

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
  /** Manager of all the game image folders, and container of their data. */
  gameImages: GameImageCollection;
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
    const config = window.External.config;
    this.state = {
      views: {},
      libraries: [],
      playlists: [],
      suggestions: {},
      platforms: [],
      loaded: {
        0: false,
      },

      central: {
        playlists: new GamePlaylistManager(),
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
        playlistsDoneLoading: false,
        playlistsFailedLoading: false,
      },
      gameImages: new GameImageCollection(config.fullFlashpointPath),
      creditsData: undefined,
      creditsDoneLoading: false,
      gameScale: preferencesData.browsePageGameScale,
      gameLayout: preferencesData.browsePageLayout,
      lang: this.props.langManager.container,
      langList: this.props.langManager.items,
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

    window.External.back.on('response', res => {
      console.log('IN', res);
      switch (res.type) {
        case BackOut.BROWSE_VIEW_PAGE_RESPONSE: {
          const resData: BrowseViewPageResponseData = res.data;

          let view: View | undefined = this.state.views[res.id];

          if (view) {
            const views = { ...this.state.views };
            const newView = views[res.id] = { ...view, games: { ...view.games } };
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
                    // Clear cache
                    games: {},
                    pages: {},
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
                  // Clear cache
                  games: {},
                  pages: {},
                };
              }
            }
            this.setState({ views: newViews }, () => { this.onRequestGames(0, 1); });
          }
        } break;
      }
    });

    // -- Stuff that should probably be moved to the back --

    // Listen for changes to the theme files
    this.props.themes.on('change', item => {
      if (item.entryPath === this.props.preferencesData.currentTheme) {
        this.reloadTheme(item.entryPath);
      }
    });
    this.props.themes.on('add',    item => { this.forceUpdate(); });
    this.props.themes.on('remove', item => { this.forceUpdate(); });
    // Listen for changes to lang files, load in used ones
    this.props.langManager.on('list-change', list => { this.setState({ langList: list }); });
    this.props.langManager.on('update',      data => { this.setState({ lang: data     }); });
    // Load Playlists
    this.state.central.playlists.load()
    .catch((err) => {
      this.setState({
        central: Object.assign({}, this.state.central, {
          playlistsDoneLoading: true,
          playlistsFailedLoading: true,
        })
      });
      log(err+'');
      throw err;
    })
    .then(() => {
      this.setState({
        central: Object.assign({}, this.state.central, {
          playlistsDoneLoading: true,
        })
      });
    });
    // Initalize the Game Manager
    sendRequest<PlatformInfo[]>(BackIn.GET_PLATFORMS)
    .then(platforms => {
      const names = platforms.map(p => p.name);
      this.state.gameImages.addImageFolders(names);
      // Update stored platform info
      this.setState({ platforms });
    })
    .catch((errors) => {
      // @TODO Make this errors passing a bit safer? Expecting specially formatted errors seems dangerous.
      errors.forEach((error: Error) => log(error.toString()));
      // Show a popup about the errors
      remote.dialog.showMessageBox({
        type: 'error',
        title: strings.dialog.errorParsingPlatforms,
        message: formatString(strings.dialog.errorParsingPlatformsMessage, String(errors.length)),
        buttons: ['Ok']
      });
      // Flag loading as failed
      this.setState({
        central: Object.assign({}, this.state.central, {
          gamesFailedLoading: true,
        })
      });
    })
    .finally(() => {
      // Flag loading as done
      this.setState({
        central: Object.assign({}, this.state.central, {
          gamesDoneLoading: true,
        })
      });
    });
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
      console.error(error);
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
      console.error(error);
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

  componentDidMount() {
    // Request all log entires
    window.External.log.refreshEntries();
  }

  componentDidUpdate(prevProps: AppProps, prevState: AppState) {
    const { history, location, preferencesData } = this.props;
    const library = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[library];
    // Check if the library changes
    const prevLibrary = getBrowseSubPath(prevProps.location.pathname);
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
                query: {
                  ...view.query,
                  search: this.props.search.text,
                  orderBy: this.state.order.orderBy,
                  orderReverse: this.state.order.orderReverse,
                },
                // Clear cache
                games: {},
                pages: {},
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
                query: {
                  ...view.query,
                  search: this.props.search.text,
                },
                // Clear cache
                games: {},
                pages: {},
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
    const loaded = this.state.loaded[BackInit.GAMES] &&
                   this.state.central.playlistsDoneLoading &&
                   this.state.central.upgrade.doneLoading &&
                   this.state.creditsDoneLoading;
    const libraryPath = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[libraryPath];
    // Props to set to the router
    const routerProps: AppRouterProps = {
      games: view && view.games,
      gamesTotal: view ? view.total : 0,
      playlists: this.state.playlists,
      suggestions: this.state.suggestions,
      platforms: this.state.platforms,
      save: this.onSaveGame,
      launchGame: this.onLaunchGame,
      deleteGame: this.onDeleteGame,
      onRequestGames: this.onRequestGames,

      onDeletePlaylist: this.onDeletePlaylist,
      onSavePlaylist: this.onSavePlaylist,
      onCreatePlaylist: this.onCreatePlaylist,

      central: this.state.central,
      creditsData: this.state.creditsData,
      creditsDoneLoading: this.state.creditsDoneLoading,
      order: this.state.order,
      gameScale: this.state.gameScale,
      gameLayout: this.state.gameLayout,
      gameImages: this.state.gameImages,
      selectedGameId: view && view.selectedGameId,
      selectedPlaylistId: view && view.selectedPlaylistId,
      onSelectGame: this.onSelectGame,
      onSelectPlaylist: this.onSelectPlaylist,
      wasNewGameClicked: this.state.wasNewGameClicked,
      onDownloadTechUpgradeClick: this.onDownloadTechUpgradeClick,
      onDownloadScreenshotsUpgradeClick: this.onDownloadScreenshotsUpgradeClick,
      gameLibrary: libraryPath,
      themeItems: this.props.themes.items,
      reloadTheme: this.reloadTheme,
      languages: this.state.langList,
      updateLocalization: this.updateLanguage,
    };
    // Render
    return (
      <LangContext.Provider value={this.state.lang}>
        {/* Splash screen */}
        <SplashScreen
          gamesLoaded={this.state.loaded[BackInit.GAMES]}
          playlistsLoaded={this.state.central.playlistsDoneLoading}
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
            query: {
              ...view.query,
              orderBy: event.orderBy,
              orderReverse: event.orderReverse,
            },
            // Clear cache
            games: {},
            pages: {},
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
  private onSelectPlaylist = (playlist?: GamePlaylist, route?: string): void => {
    /*
    const { selectedGames, selectedPlaylists } = this.state;
    if (route === undefined) { route = getBrowseSubPath(this.props.location.pathname); }
    this.setState({
      selectedPlaylists: setMapProp(copyMap(selectedPlaylists), route, playlist),
      selectedGames: deleteMapProp(copyMap(selectedGames), route),
    });
    */
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

  /**
   * Apply another theme or clear the current theme.
   * @param themePath Path to the theme to apply (relative to the themes folder).
   *                  If undefined, the current theme will be cleared and no theme will be applied.
   */
  private reloadTheme = (themePath: string | undefined): void => {
    if (themePath) { // (Apply another theme)
      this.props.themes.load(themePath)
      .then((theme) => {
        if (typeof theme !== 'number') { Theme.set(theme); }
        else {
          Theme.clear(Theme.findGlobal());
          log(Theme.toError(theme) || '');
        }
      })
      .catch(console.error);
    } else { // (Clear the current theme)
      Theme.clear(Theme.findGlobal());
    }
  }

  /** Update the combined language container. */
  private updateLanguage = (): void => {
    this.props.langManager.updateContainer();
  }

  onSaveGame = (game: IGameInfo, addApps: IAdditionalApplicationInfo[] | undefined, saveToFile: boolean): void => {
    const library = getBrowseSubPath(this.props.location.pathname);
    window.External.back.send<any, SaveGameData>(BackIn.SAVE_GAME, { game, addApps: addApps || [], library, saveToFile });
  }

  onLaunchGame(gameId: string): void {
    window.External.back.send<LaunchGameData>(BackIn.LAUNCH_GAME, { id: gameId });
  }

  onDeleteGame(gameId: string): void {
    window.External.back.send<any, DeleteGameData>(BackIn.DELETE_GAME, { id: gameId });
  }

  onRequestGames = (offset: number, limit: number): void => {
    const VIEW_PAGE_SIZE = 250;
    const libraryPath = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[libraryPath];

    if (!view) { throw new Error(`Failed to request games. Current view is missing (Library: "${libraryPath}", View: "${view}").`); }

    const pageMin = Math.floor(offset / VIEW_PAGE_SIZE);
    const pageMax = Math.ceil((offset + limit) / VIEW_PAGE_SIZE);

    const pageIndices: number[] = [];
    const pages: ViewPage[] = [];
    for (let page = pageMin; page <= pageMax; page++) {
      if (!view.pages[page]) {
        pageIndices.push(page);
        pages.push({});
      }
    }

    if (pages.length > 0) {
      //console.log(`GET (PAGES: ${pageMin} - ${pageMax} | OFFSET: ${pageMin * VIEW_PAGE_SIZE} | LIMIT: ${(pageMax - pageMin + 1) * VIEW_PAGE_SIZE})`);
      const library = getBrowseSubPath(this.props.location.pathname);
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
            search: this.props.search.text, //view.query.search,
            orderBy: this.state.order.orderBy, //view.query.orderBy,
            orderReverse: this.state.order.orderReverse, //view.query.orderReverse,
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
          [libraryPath]: {
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

  onDeletePlaylist(playlistId: string) {
    // @TODO
  }

  onSavePlaylist(playlistId: string, edit: GamePlaylist) {
    // @TODO
  }

  onCreatePlaylist() {
    // @TODO
  }
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

function log(content: string): void {
  window.External.log.addEntry({
    source: 'Launcher',
    content: content
  });
}
