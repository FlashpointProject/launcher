import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { TagCategory } from '@database/entity/TagCategory';
import { AddLogData, BackIn, BackInit, BackOut, BrowseChangeData, BrowseViewIndexData, BrowseViewIndexResponse, BrowseViewPageData, BrowseViewPageIndexData, BrowseViewPageIndexResponse, BrowseViewPageResponseData, GetGamesTotalResponseData, GetPlaylistsResponse, GetSuggestionsResponseData, Index, InitEventData, LanguageChangeData, LanguageListChangeData, LaunchGameData, LocaleUpdateData, LogEntryAddedData, PageIndex, PlaylistsChangeData, SaveGameData, SavePlaylistGameData, SearchGamesOpts, ServiceChangeData, TagCategoriesChangeData, ThemeChangeData, ThemeListChangeData, UpdateConfigData } from '@shared/back/types';
import { BrowsePageLayout } from '@shared/BrowsePageLayout';
import { APP_TITLE, VIEW_PAGE_SIZE } from '@shared/constants';
import { parseSearchText } from '@shared/game/GameFilter';
import { GamePropSuggestions, ProcessState, WindowIPC } from '@shared/interfaces';
import { LangContainer, LangFile } from '@shared/lang';
import { getLibraryItemTitle } from '@shared/library/util';
import { memoizeOne } from '@shared/memoize';
import { updatePreferencesData } from '@shared/preferences/util';
import { setTheme } from '@shared/Theme';
import { Theme } from '@shared/ThemeFile';
import { getUpgradeString } from '@shared/upgrade/util';
import { canReadWrite, deepCopy, getFileServerURL, recursiveReplace } from '@shared/Util';
import { debounce } from '@shared/utils/debounce';
import { formatString } from '@shared/utils/StringFormatter';
import { ipcRenderer, remote } from 'electron';
import { AppUpdater, UpdateInfo } from 'electron-updater';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import * as which from 'which';
import { GameOrderChangeEvent } from './components/GameOrder';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';
import { ConnectedFooter } from './containers/ConnectedFooter';
import HeaderContainer from './containers/HeaderContainer';
import { WithPreferencesProps } from './containers/withPreferences';
import { WithTagCategoriesProps } from './containers/withTagCategories';
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

type Views = Record<string, View | undefined>; // views[id] = view
type View = {
  games: GAMES;
  pageRequests: Record<number, boolean>;
  pageIndex?: PageIndex;
  total?: number;
  selectedPlaylistId?: string;
  selectedGameId?: string;
  /** If the cache is dirty and should be discarded. */
  dirtyCache: boolean;
  /** The most recent query used for this view. */
  query: SearchGamesOpts;
}
type ViewPage = {}

type AppOwnProps = {
  /** Most recent search query. */
  search: SearchQuery;
};

export type AppProps = AppOwnProps & RouteComponentProps & WithPreferencesProps & WithTagCategoriesProps;

export type AppState = {
  views: Views;
  libraries: string[];
  playlists: Playlist[];
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

    // Prepare libraries
    const libraries = window.Shared.initialLibraries.sort();
    const views: Record<string, View> = {};
    for (let library of libraries) {
      views[library] = {
        dirtyCache: false,
        games: {},
        pageRequests: {},
        pageIndex: undefined,
        query: {
          filter: {
            searchQuery: undefined
          },
          orderBy: order.orderBy,
          orderReverse: order.orderReverse,
        }
      };
    }

    // Prepare platforms
    const platforms: Record<string, string[]> = {};
    for (let library of libraries) {
      platforms[library] = window.Shared.initialPlatforms[library].slice().sort();
    }

    // Set initial state
    this.state = {
      views: views,
      libraries: libraries,
      playlists: window.Shared.initialPlaylists || [],
      playlistIconCache: {},
      suggestions: {},
      appPaths: {},
      platforms: platforms,
      loaded: {
        0: false,
        1: false,
        2: false,
      },
      themeList: window.Shared.initialThemes,
      gamesTotal: -1,
      localeCode: window.Shared.initialLocaleCode,
      upgrades: [],
      upgradesDoneLoading: false,
      stopRender: false,
      creditsData: undefined,
      creditsDoneLoading: false,
      gameScale: preferencesData.browsePageGameScale,
      gameLayout: preferencesData.browsePageLayout,
      lang: window.Shared.initialLang,
      langList: window.Shared.initialLangList,
      wasNewGameClicked: false,
      updateInfo: undefined,
      order,
    };

    // Initialize app
    this.init();
  }

  init() {
    const strings = this.state.lang;
    const fullFlashpointPath = window.Shared.config.fullFlashpointPath;
    const fullJsonFolderPath = window.Shared.config.fullJsonFolderPath;
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
    ipcRenderer.on(WindowIPC.WINDOW_MOVE, debounce((sender, x: number, y: number, isMaximized: boolean) => {
      if (!isMaximized) {
        updatePreferencesData({ mainWindow: { x: x|0, y: y|0 } });
      }
    }, 100));
    ipcRenderer.on(WindowIPC.WINDOW_RESIZE, debounce((sender, width: number, height: number, isMaximized: boolean) => {
      if (!isMaximized) {
        updatePreferencesData({ mainWindow: { width: width|0, height: height|0 } });
      }
    }, 100));
    ipcRenderer.on(WindowIPC.WINDOW_MAXIMIZE, (sender, isMaximized: boolean) => {
      updatePreferencesData({ mainWindow: { maximized: isMaximized } });
    });

    window.Shared.back.send<InitEventData>(BackIn.INIT_LISTEN, undefined, res => {
      if (!res.data) { throw new Error('INIT_LISTEN response is missing data.'); }
      const nextLoaded = { ...this.state.loaded };
      for (let key of res.data.done) {
        nextLoaded[key] = true;
      }
      this.setState({ loaded: nextLoaded });
    });

    window.Shared.back.send<GetGamesTotalResponseData>(BackIn.GET_GAMES_TOTAL, undefined, res => {
      if (res.data) {
        this.setState({ gamesTotal: res.data });
      }
    });

    window.Shared.back.send<GetSuggestionsResponseData>(BackIn.GET_SUGGESTIONS, undefined, res => {
      if (res.data) {
        this.setState({
          suggestions: res.data.suggestions,
          appPaths: res.data.appPaths,
        });
      }
    });

    window.Shared.back.on('message', res => {
      // console.log('IN', res);
      switch (res.type) {
        case BackOut.INIT_EVENT: {
          const resData: InitEventData = res.data;

          const loaded = { ...this.state.loaded };
          for (let index of resData.done) {
            loaded[index] = true;

            switch (parseInt(index+'', 10)) { // (It is a string, even though TS thinks it is a number)
              case BackInit.PLAYLISTS:
                window.Shared.back.send<GetPlaylistsResponse>(BackIn.GET_PLAYLISTS, undefined, res => {
                  if (res.data) {
                    this.setState({ playlists: res.data });
                    this.cachePlaylistIcons(res.data);
                  }
                });
                break;
            }
          }

          this.setState({ loaded });
        } break;

        case BackOut.LOG_ENTRY_ADDED: {
          const resData: LogEntryAddedData = res.data;
          window.Shared.log.entries[resData.index - window.Shared.log.offset] = resData.entry;
        } break;

        case BackOut.LOCALE_UPDATE: {
          const resData: LocaleUpdateData = res.data;
          this.setState({ localeCode: resData });
        } break;

        case BackOut.BROWSE_VIEW_PAGE_INDEX_RESPONSE: {
          const resData: BrowseViewPageIndexResponse = res.data;
          let view: View | undefined = this.state.views[res.data.library];

          if (view) {
            const views = { ...this.state.views };
            const newView = views[res.data.library] = { ...view };
            if (view.dirtyCache) {
              newView.dirtyCache = false;
              newView.games = {};
              newView.pageRequests = {};
              newView.pageIndex = undefined;
              newView.total = undefined;
            } else {
              newView.pageIndex = resData.index;
            }
            this.setState({ views });
          }
        } break;

        case BackOut.BROWSE_VIEW_PAGE_RESPONSE: {
          const resData: BrowseViewPageResponseData = res.data;

          let view: View | undefined = this.state.views[res.data.library];

          if (view) {
            const views = { ...this.state.views };
            const newView = views[res.data.library] = { ...view };
            if (view.dirtyCache) {
              newView.dirtyCache = false;
              newView.games = {};
              newView.pageRequests = {};
              newView.pageIndex = undefined;
              newView.total = undefined;
            } else {
              newView.games = { ...view.games };
            }
            for (let i = 0; i < resData.games.length; i++) {
              newView.games[resData.offset + i] = resData.games[i];
            }
            if (resData.total !== undefined) { newView.total = resData.total; }
            this.setState({ views });
            this.forceUpdate();
          }
        } break;

        case BackOut.BROWSE_CHANGE: {
          const resData: BrowseChangeData = res.data;
          const newState: Partial<AppState> = {
            gamesTotal: resData.gamesTotal,
          };
          const newLibrary = resData.game ? resData.game.library : undefined;

          if (newLibrary) { // (Clear specific cache)
            const view = this.state.views[newLibrary];
            if (view) {
              newState.views = {
                ...this.state.views,
                [newLibrary]: {
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

          this.setState(newState as any);
        } break;

        case BackOut.SERVICE_CHANGE: {
          const resData: ServiceChangeData = res.data;
          if (resData.id) {
            const service = window.Shared.services.find(item => item.id === resData.id);
            if (service) {
              recursiveReplace(service, resData);
            } else {
              window.Shared.services.push(recursiveReplace({
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

        case BackOut.PLAYLISTS_CHANGE: {
          const resData: PlaylistsChangeData = res.data;
          this.setState({ playlists: resData });
        }

        case BackOut.TAG_CATEGORIES_CHANGE: {
          const resData: TagCategoriesChangeData = res.data;
          this.props.setTagCategories(resData);
        }
      }
    });

    // Cache playlist icons (if they are loaded)
    if (this.state.playlists.length > 0) { this.cachePlaylistIcons(this.state.playlists); }

    // -- Stuff that should probably be moved to the back --

    // Load Upgrades
    const folderPath = window.Shared.isDev
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
      const isValid = await isFlashpointValidCheck(window.Shared.config.data.flashpointPath);
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
    fetch(`${getFileServerURL()}/credits.json`)
    .then(res => res.json())
    .then(async (data) => {
      this.setState({
        creditsData: CreditsFile.parseCreditsData(data),
        creditsDoneLoading: true
      });
    })
    .catch((error) => {
      console.warn(error);
      log(`Failed to load credits.\n${error}`);
      this.setState({ creditsDoneLoading: true });
    });

    // Updater code - DO NOT run in development environment!
    if (!window.Shared.isDev) {
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

    this.props.setTagCategories(window.Shared.initialTagCategories);
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

    if (view) {
      // Check if the playlist selection changed
      if (view.selectedPlaylistId !== (prevView && prevView.selectedPlaylistId) ||
          prevState.playlists     !== this.state.playlists) {
        this.setState({
          views: {
            ...this.state.views,
            [library]: {
              ...view,
              dirtyCache: true,
            }
          }
        }, () => { this.requestSelectedLibrary(library); });
      }
      const prevPlaylist = prevView && prevView.selectedPlaylistId;

      // Check if the search query has changed
      if (prevProps.search.text                           !== this.props.search.text ||
          prevProps.preferencesData.browsePageShowExtreme !== this.props.preferencesData.browsePageShowExtreme ||
          prevState.order.orderBy                         !== this.state.order.orderBy ||
          prevState.order.orderReverse                    !== this.state.order.orderReverse ||
          prevPlaylist                                    !== view.selectedPlaylistId) {
        // Rebuild query
        const query = this.rebuildQuery(view, library);
        // Clear out cache views
        this.setState({
          views: {
            ...this.state.views,
            [library]: {
              ...view,
              dirtyCache: true,
              query: query,
            }
          }
        }, () => { this.requestSelectedLibrary(library); });
      }
    }

    // Fetch games if a different library is selected
    if (library && prevLibrary && library !== prevLibrary) {
      this.requestSelectedLibrary(library);
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
      } else {
        history.push(joinLibraryRoute(route));
      }
    }
  }

  render() {
    const loaded = (
      this.state.upgradesDoneLoading &&
      this.state.creditsDoneLoading &&
      this.state.loaded[BackInit.EXEC]
    );
    const libraryPath = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[libraryPath];
    const playlists = this.filterAndOrderPlaylistsMemo(this.state.playlists, libraryPath);
    // Props to set to the router
    const routerProps: AppRouterProps = {
      games: view && view.games || {},
      requestPages: this.requestPages,
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
      onDeletePlaylist: this.onPlaylistDelete,
      onUpdatePlaylist: this.onPlaylistUpdate,
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
              upgradesLoaded={this.state.upgradesDoneLoading}
              creditsLoaded={this.state.creditsDoneLoading}
              miscLoaded={this.state.loaded[BackInit.EXEC]} />
            {/* Title-bar (if enabled) */}
            { window.Shared.config.data.useCustomTitlebar ? (
              <TitleBar title={`${APP_TITLE} (${remote.app.getVersion()})`} />
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
      }, () => { this.requestSelectedLibrary(library); });
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
  }

  private onToggleRightSidebarClick = (): void => {
    updatePreferencesData({ browsePageShowRightSidebar: !this.props.preferencesData.browsePageShowRightSidebar });
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

  /** Updates the playlists state */
  private updatePlaylists = (playlists: Playlist[], cache: Record<string, string>): void => {
    this.setState({
      playlists: playlists,
      playlistIconCache: cache
    });
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

  private onPlaylistDelete = (playlist: Playlist) => {
    if (playlist) {
      const index = this.state.playlists.findIndex(p => p.id === playlist.id);
      if (index >= 0) {
        const playlists = [ ...this.state.playlists ];
        playlists.splice(index, 1);

        const cache: Record<string, string> = { ...this.state.playlistIconCache };
        const id = this.state.playlists[index].id;
        if (id in cache) { delete cache[id]; }

        this.setState({
          playlists: playlists,
          playlistIconCache: cache
        });
      }
    }
  }

  private onPlaylistUpdate = (playlist: Playlist) => {
    const state: Partial<Pick<AppState, 'playlistIconCache' | 'playlists' | 'views'>> = {};

    // Update or add playlist
    const index = this.state.playlists.findIndex(p => p.id === playlist.id);
    if (index >= 0) {
      state.playlists = [ ...this.state.playlists ];
      state.playlists[index] = playlist;
    } else {
      state.playlists = [ ...this.state.playlists, playlist ];
    }

    // Remove old icon from cache
    if (playlist.id in this.state.playlistIconCache) {
      state.playlistIconCache = { ...this.state.playlistIconCache };
      delete state.playlistIconCache[playlist.id];
      URL.revokeObjectURL(this.state.playlistIconCache[playlist.id]); // Free blob from memory
      console.log(!!this.state.playlistIconCache[playlist.id], !!state.playlistIconCache[playlist.id])
    }

    // Cache new icon
    if (playlist.icon !== undefined) {
      cacheIcon(playlist.icon).then(url => {
        this.setState({
          playlistIconCache: {
            ...this.state.playlistIconCache,
            [playlist.id]: url,
          }
        });
      });
    }

    // Clear view caches (that use this playlist)
    for (let id in this.state.views) {
      const view = this.state.views[id];
      if (view) {
        if (view.selectedPlaylistId === playlist.id) {
          if (!state.views) { state.views = { ...this.state.views }; }
          state.views[id] = {
            ...view,
            dirtyCache: true
          };
        }
      }
    }

    this.setState(
      state as any, // (This is very annoying to make typesafe)
      () => { if (state.views && playlist.library !== undefined) { this.requestSelectedLibrary(playlist.library); } }
    );
  }

  onSaveGame = (game: Game, playlistEntry: PlaylistGame | undefined, saveToFile: boolean): void => {
    window.Shared.back.send<any, SaveGameData>(BackIn.SAVE_GAME, game);
    if (playlistEntry) {
      window.Shared.back.send<any, SavePlaylistGameData>(BackIn.SAVE_PLAYLIST_GAME, playlistEntry);
    }
  }

  onLaunchGame(gameId: string): void {
    window.Shared.back.send<LaunchGameData>(BackIn.LAUNCH_GAME, { id: gameId });
  }

  /** Fetch the selected game of the specified library (or the first page if no game is selected). */
  requestSelectedLibrary(library: string): void {
    const view = this.state.views[library];

    if (!view) {
      log(`Failed to request game index. Current view is missing (Library: "${library}", View: "${view}").`);
      return;
    }

    if (view.selectedGameId === undefined) {
      this.onRequestGames(0, VIEW_PAGE_SIZE);
    } else {
      window.Shared.back.send<BrowseViewIndexResponse, BrowseViewIndexData>(BackIn.BROWSE_VIEW_INDEX, {
        gameId: view.selectedGameId,
        query: view.query
      }, res => {
        if (res.data && res.data.index >= 0) { // (Game found)
          this.onRequestGames(res.data.index, 1);
        } else { // (Game not found)
          this.setState({
            views: {
              ...this.state.views,
              [library]: {
                ...view,
                selectedGameId: undefined,
              }
            }
          }, () => { this.onRequestGames(0, VIEW_PAGE_SIZE); });
        }
      });
    }
  }

  /** Marks a list of pages as requested */
  requestPages = debounce(async (start: number, count: number): Promise<void> => {
    const library = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[library];

    if (view) {
      for (let i = start; i < (start + count); i++) {
        if (!view.pageRequests[i]) {
          if (!view.pageIndex) {
            let query = view.query;
            if (!view.query.filter.searchQuery) {
              query = this.rebuildQuery(view, library);
            }
            window.Shared.back.sendP<BrowseViewPageIndexResponse, BrowseViewPageIndexData>(BackIn.BROWSE_VIEW_PAGE_INDEX, {
              query: query,
              offset: 0,
              library: library,
            }).then((res) => {
              if (res.data) {
                const resData: BrowseViewPageIndexResponse = res.data;
                const lastGame = resData.index[i+1];
                this.onRequestGames(i * VIEW_PAGE_SIZE, VIEW_PAGE_SIZE, lastGame);
              }
            });
            view.pageRequests[i] = true;
            view.pageIndex = {}; // Stop multiple calls
          } else {
            const lastGame = view.pageIndex[i+1];
            if (lastGame) {
              this.onRequestGames(i * VIEW_PAGE_SIZE, VIEW_PAGE_SIZE, lastGame);
              view.pageRequests[i] = true;
            }
          }
          this.setState({
            views: {
              ...this.state.views,
              view
            }
          });
        }
      }
    }
  }, 10);

  onRequestGames = (offset: number, limit: number, index?: Index): void => {
    const library = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[library];

    console.log(`${offset} off - ${limit} lim`);

    if (!view) {
      log(`Failed to request games. Current view is missing (Library: "${library}", View: "${view}").`);
      return;
    }

    let query = view.query;
    if (!query.filter.searchQuery) {
      // Search query can't be empty, rebuild it
      query = this.rebuildQuery(view, library);
    }

    window.Shared.back.send<any, BrowseViewPageData>(
      BackIn.BROWSE_VIEW_PAGE,
      {
        offset: offset,
        limit: limit,
        library: library,
        query: query,
        index: index,
        getTotal: !view.total || view.dirtyCache
      }
    );
  }

  onQuickSearch = (search: string): void => {
    const library = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[library];

    if (!view) {
      log(`Failed to quick search. Current view is missing (Library: "${library}", View: "${view}").`);
      return;
    }


    // Rebuild query
    view.query = this.rebuildQuery(view, library);

    // Stash the query
    this.setState({
      views: {
        [library]: view
      }
    });

    // @TODO Find a good way of doing snap to selected

    // No point finding the game id if it doesn't even exist
    // if (view.selectedGameId) {
    //   window.Shared.back.send<BrowseViewIndexResponse, BrowseViewIndexData>(BackIn.QUICK_SEARCH, {
    //     query: query,
    //     gameId: view.selectedGameId
    //   }, res => {
    //     const view = this.state.views[library];
    //     if (res.data && view) {
    //       // Fetch the page that the game is on
    //       if (res.data.index !== undefined) {
    //         this.onRequestGames(res.data.index, VIEW_PAGE_SIZE);
    //       }
    //     }
    //   });
    // }
  }

  cachePlaylistIcons(playlists: Playlist[]): void {
    Promise.all(playlists.map(p => (async () => {
      if (p.icon) { return cacheIcon(p.icon); }
    })()))
    .then(urls => {
      const cache: Record<string, string> = {};
      for (let i = 0; i < playlists.length; i++) {
        const url = urls[i];
        if (url) { cache[playlists[i].id] = url; }
      }
      this.setState({ playlistIconCache: cache });
    });
  }

  filterAndOrderPlaylistsMemo = memoizeOne((playlists: Playlist[], library: string) => {
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

  private rebuildQuery = (view: View, library: string): SearchGamesOpts => {
    const searchQuery = parseSearchText(this.props.search.text);
    searchQuery.whitelist.push({ field: 'library', value: library });
    if (!this.props.preferencesData.browsePageShowExtreme) { searchQuery.whitelist.push({ field: 'extreme', value: false }); }
    if (!window.Shared.config.data.showBrokenGames)        { searchQuery.whitelist.push({ field: 'broken', value: false });  }
    const query: SearchGamesOpts = {
      filter: {
        searchQuery: searchQuery,
        playlistId: view.selectedPlaylistId
      },
      orderBy: this.state.order.orderBy,
      orderReverse: this.state.order.orderReverse
    };
    return query;
  }
}

async function downloadAndInstallStage(stage: UpgradeStage, setStageState: (id: string, stage: Partial<UpgradeStageState>) => void, strings: LangContainer) {
  // Check data folder is set
  let flashpointPath = window.Shared.config.data.flashpointPath;
  const isValid = await isFlashpointValidCheck(flashpointPath);
  if (!isValid) {
    let verifiedPath = false;
    let chosenPath: (string | undefined);
    while (verifiedPath !== true) {
      // If folder isn't set, ask to set now
      const res = await openConfirmDialog(strings.dialog.flashpointPathInvalid, strings.dialog.flashpointPathNotFound);
      if (!res) { return; }
      // Set folder now
      const chosenPaths = window.Shared.showOpenDialogSync({
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
      window.Shared.back.send<any, UpdateConfigData>(BackIn.UPDATE_CONFIG, {
        flashpointPath: flashpointPath,
      }, () => { /* window.Shared.restart(); */ });
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
        window.Shared.restart();
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
  window.Shared.back.send<any, AddLogData>(BackIn.ADD_LOG, {
    source: 'Launcher',
    content: content,
  });
}