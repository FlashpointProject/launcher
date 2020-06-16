import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { AddLogData, BackIn, BackInit, BackOut, BrowseViewKeysetData, BrowseViewKeysetResponse, BrowseViewPageData, BrowseViewPageResponseData, DeleteGameData, ExportMetaEditData, GetGamesTotalResponseData, GetPlaylistsResponse, GetSuggestionsResponseData, InitEventData, LanguageChangeData, LanguageListChangeData, LaunchGameData, LocaleUpdateData, LogEntryAddedData, PageKeyset, PlaylistsChangeData, SaveGameData, SavePlaylistGameData, SearchGamesOpts, ServiceChangeData, TagCategoriesChangeData, ThemeChangeData, ThemeListChangeData, UpdateConfigData } from '@shared/back/types';
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
import { MetaEditExporter, MetaEditExporterConfirmData } from './components/MetaEditExporter';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';
import { ConnectedFooter } from './containers/ConnectedFooter';
import HeaderContainer from './containers/HeaderContainer';
import { WithPreferencesProps } from './containers/withPreferences';
import { WithTagCategoriesProps } from './containers/withTagCategories';
import { CreditsFile } from './credits/CreditsFile';
import { CreditsData } from './credits/types';
import { UpdateView, UpgradeStageState, ViewGameSet } from './interfaces';
import { Paths } from './Paths';
import { AppRouter, AppRouterProps } from './router';
import { SearchQuery } from './store/search';
import { UpgradeStage } from './upgrade/types';
import { UpgradeFile } from './upgrade/UpgradeFile';
import { isFlashpointValidCheck, joinLibraryRoute, openConfirmDialog } from './Util';
import { LangContext } from './util/lang';
import { checkUpgradeStateInstalled, checkUpgradeStateUpdated, downloadAndInstallUpgrade } from './util/upgrade';

const autoUpdater: AppUpdater = remote.require('electron-updater').autoUpdater;

type View = {
  /** The most recent query used for this view. */
  query: SearchGamesOpts;
  /** Flags of which pages have already been requested (undefined until fetched, then true). */
  pageRequests: Partial<Record<number, true>>;
  /** Most recent meta. */
  meta?: {
    /** Total number of results in the query. */
    total: number;
    /** Page keyset of the results. */
    pageKeyset: PageKeyset;
  };
  /** Games to display. */
  games: ViewGameSet;
  /** If a new meta has been applied but the games of the old query are still present (this means the games should be discarded the next time a game page is received). */
  isDirty: boolean;
  /** Total number of results in the query of the most recent game page response. */
  total?: number;
  /** ID of the selected playlist. */
  selectedPlaylistId?: string;
  /** ID of the selected game. */
  selectedGameId?: string;
  /** Most recent "start" page index that has been viewed. */
  lastStart: number;
  /** Most recent "count" of pages that has been viewed. */
  lastCount: number;
}

type AppOwnProps = {
  /** Most recent search query. */
  search: SearchQuery;
};

export type AppProps = AppOwnProps & RouteComponentProps & WithPreferencesProps & WithTagCategoriesProps;

export type AppState = {
  views: Record<string, View | undefined>; // views[id] = view
  libraries: string[];
  serverNames: string[];
  mad4fpEnabled: boolean;
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
  /** If the "Meta Edit Popup" is open. */
  metaEditExporterOpen: boolean;
  /** ID of the game used in the "Meta Edit Popup". */
  metaEditExporterGameId: string;
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
    const serverNames = window.Shared.initialServerNames.sort();
    const mad4fpEnabled = window.Shared.initialMad4fpEnabled;
    const views: Record<string, View> = {};
    for (let library of libraries) {
      views[library] = {
        query: this.rebuildQuery(library, undefined, order),
        pageRequests: {},
        meta: undefined,
        games: {},
        isDirty: false,
        total: undefined,
        selectedPlaylistId: undefined,
        selectedGameId: undefined,
        lastStart: 0,
        lastCount: 0,
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
      serverNames: serverNames,
      mad4fpEnabled: mad4fpEnabled,
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
      metaEditExporterOpen: false,
      metaEditExporterGameId: '',
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
      if (window.Shared.config.data.updatesEnabled) {
        autoUpdater.checkForUpdates()
        .catch((error) => { log(`Error Fetching Update Info - ${error.message}`); });
      }
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

    // Check if renderer finished initializing
    if (isInitDone(this.state) && !isInitDone(prevState)) {
      // Pre-request all libraries
      for (let library of this.state.libraries) {
        this.requestMeta(library);
      }
    }

    if (view) {
      const prevPlaylist = prevView && prevView.selectedPlaylistId;

      // Check if the search query has changed
      if (prevProps.search.text                           !== this.props.search.text ||
          prevProps.preferencesData.browsePageShowExtreme !== this.props.preferencesData.browsePageShowExtreme ||
          prevState.order.orderBy                         !== this.state.order.orderBy ||
          prevState.order.orderReverse                    !== this.state.order.orderReverse ||
          prevPlaylist                                    !== view.selectedPlaylistId) {
        this.setState({
          views: {
            ...this.state.views,
            [library]: {
              ...view,
              query: this.rebuildQuery(library, view.selectedPlaylistId, this.state.order),
            },
          },
        }, () => { this.requestMeta(library); });
      }
      // Check if the playlist selection changed
      else if (view.selectedPlaylistId !== prevPlaylist ||
               prevState.playlists     !== this.state.playlists) {
        this.requestMeta(library);
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
      const route = preferencesData.lastSelectedLibrary || preferencesData.defaultLibrary || '';

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
    const loaded = isInitDone(this.state);
    const libraryPath = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[libraryPath];
    const playlists = this.filterAndOrderPlaylistsMemo(this.state.playlists, libraryPath);

    // Props to set to the router
    const routerProps: AppRouterProps = {
      games: view && view.games || {},
      updateView: this.updateView,
      gamesTotal: view && view.total || 0,
      playlists: playlists,
      suggestions: this.state.suggestions,
      appPaths: this.state.appPaths,
      platforms: this.state.platforms,
      platformsFlat: this.flattenPlatformsMemo(this.state.platforms),
      playlistIconCache: this.state.playlistIconCache,
      onSaveGame: this.onSaveGame,
      onDeleteGame: this.onDeleteGame,
      onLaunchGame: this.onLaunchGame,
      onQuickSearch: this.onQuickSearch,
      onOpenExportMetaEdit: this.onOpenExportMetaEdit,
      libraries: this.state.libraries,
      serverNames: this.state.serverNames,
      mad4fpEnabled: this.state.mad4fpEnabled,
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
      onUpdatePlaylist: this.onUpdatePlaylist,
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
                  currentCount={view && view.total || 0}
                  onScaleSliderChange={this.onScaleSliderChange} scaleSliderValue={this.state.gameScale}
                  onLayoutChange={this.onLayoutSelectorChange} layout={this.state.gameLayout}
                  onNewGameClick={this.onNewGameClick} />
                {/* Meta Edit Popup */}
                { this.state.metaEditExporterOpen ? (
                  <MetaEditExporter
                    gameId={this.state.metaEditExporterGameId}
                    onCancel={this.onCancelExportMetaEdit}
                    onConfirm={this.onConfirmExportMetaEdit} />
                ) : undefined }
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
            query: {
              ...view.query,
              orderBy: event.orderBy,
              orderReverse: event.orderReverse,
            },
          }
        }
      }, () => { this.requestMeta(library); });
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

  private onUpdatePlaylist = (playlist: Playlist) => {
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
    for (let library in this.state.views) {
      const view = this.state.views[library];
      if (view && (view.selectedPlaylistId === playlist.id)) {
        this.requestMeta(library);
      }
    }

    this.setState(
      state as any, // (This is very annoying to make typesafe)
      () => { if (state.views && playlist.library !== undefined) { this.requestGames(playlist.library); } }
    );
  }

  onSaveGame = (game: Game, playlistEntry?: PlaylistGame): void => {
    window.Shared.back.sendP<any, SaveGameData>(BackIn.SAVE_GAME, game)
    .then(async () => {
      if (playlistEntry) {
        await window.Shared.back.sendP<unknown, SavePlaylistGameData>(BackIn.SAVE_PLAYLIST_GAME, playlistEntry);
      }
    })
    .then(() => { this.requestMeta(game.library); });
  }

  onDeleteGame = (gameId: string): void => {
    const library = getBrowseSubPath(this.props.location.pathname);
    window.Shared.back.sendP<unknown, DeleteGameData>(BackIn.DELETE_GAME, { id: gameId })
    .then(() => { this.requestMeta(library); });
  }

  onLaunchGame(gameId: string): void {
    window.Shared.back.send<LaunchGameData>(BackIn.LAUNCH_GAME, { id: gameId });
  }

  onQuickSearch = (search: string): void => {
    // @TODO
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

  private rebuildQuery(library: string, selectedPlaylistId: string | undefined, order: GameOrderChangeEvent): SearchGamesOpts {
    const searchQuery = parseSearchText(this.props.search.text);
    searchQuery.whitelist.push({ field: 'library', value: library });
    if (!this.props.preferencesData.browsePageShowExtreme) { searchQuery.whitelist.push({ field: 'extreme', value: false }); }
    if (!window.Shared.config.data.showBrokenGames)        { searchQuery.whitelist.push({ field: 'broken',  value: false }); }

    return {
      filter: {
        searchQuery: searchQuery,
        playlistId: selectedPlaylistId,
      },
      orderBy: order.orderBy,
      orderReverse: order.orderReverse,
    };
  }

  requestGames(library: string): void {
    const view = this.state.views[library];

    // console.log(`requestGames("${library}")`);

    if (view) {
      if (view.meta) {
        const pages: number[] = [];

        for (let i = 0; i < view.lastCount; i++) {
          const index = view.lastStart + i;
          if (!view.pageRequests[index]) {
            pages.push(index);
          }
        }

        if (pages.length > 0) {
          // Request pages
          window.Shared.back.sendP<BrowseViewPageResponseData<boolean>, BrowseViewPageData>(BackIn.BROWSE_VIEW_PAGE, {
            ranges: pages.map(index => ({
              start: index * VIEW_PAGE_SIZE,
              length: VIEW_PAGE_SIZE,
              index: view.meta && view.meta.pageKeyset[index + 1], // Page keyset indices are one-indexed (start at 1 instead of 0)
            })),
            library: library,
            query: view.query,
            shallow: true,
          }).then((res) => {
            if (res.data) {
              const view = this.state.views[library];
              if (view && view.meta) {
                const newGames = (view.isDirty) ? {} : { ...view.games };

                for (let range of res.data.ranges) {
                  const length = Math.min(range.games.length, view.meta.total);
                  for (let i = 0; i < length; i++) {
                    newGames[range.start + i] = range.games[i];
                  }
                }

                this.setState({
                  views: {
                    ...this.state.views,
                    [library]: {
                      ...view,
                      games: newGames,
                      isDirty: false,
                      total: view.meta.total, // Update dirty total
                    }
                  }
                });
              } else {
                console.error('Failed to apply game page response. View or view meta has been removed since the request was made.');
              }
            } else {
              console.error('BROWSE_VIEW_PAGE response contains no data.');
            }
          });

          // Flag pages as requested
          const newPageRequests = { ...view.pageRequests };
          for (let i = 0; i < pages.length; i++) {
            newPageRequests[pages[i]] = true;
          }

          this.setState({
            views: {
              ...this.state.views,
              [library]: {
                ...view,
                pageRequests: newPageRequests,
              }
            }
          });
        }
      } else {
        // Note: This is probably unnecessary since the meta is already requested for all libraries on startup, but better safe than sorry
        this.requestMeta(library);
      }
    }
  }

  /** Request the meta of a view and then apply it. */
  requestMeta = async (library: string = getBrowseSubPath(this.props.location.pathname)): Promise<void> => {
    const view = this.state.views[library];

    // console.log(`requestMeta("${library}")`, view);

    if (view) {
      window.Shared.back.sendP<BrowseViewKeysetResponse, BrowseViewKeysetData>(BackIn.BROWSE_VIEW_KEYSET, {
        query: view.query,
        library: library,
      }).then((res) => {
        if (res.data) {
          const view = this.state.views[library];

          if (view) {
            this.setState({
              views: {
                ...this.state.views,
                [library]: {
                  ...view,
                  meta: {
                    pageKeyset: res.data.keyset,
                    total: res.data.total,
                  },
                  // Dirty games
                  isDirty: true,
                  pageRequests: {},
                  // Update total (for the first reponse only)
                  total: (view.total === undefined)
                    ? res.data.total
                    : view.total,
                }
              }
            });
          }

          this.requestGames(library);
        }
      });
    }
  }

  updateView: UpdateView = (start, count) => {
    const library = getBrowseSubPath(this.props.location.pathname);
    const view = this.state.views[library];

    // console.log(`updateView(${start}, ${count})`, library, view);

    if (view && (view.lastStart !== start || view.lastCount !== count)) {
      this.setState({
        views: {
          ...this.state.views,
          [library]: {
            ...view,
            lastStart: start,
            lastCount: count,
          },
        },
      }, () => { this.requestGames(library); });
    }
  }

  onOpenExportMetaEdit = (gameId: string): void => {
    this.setState({
      metaEditExporterOpen: true,
      metaEditExporterGameId: gameId,
    });
  }

  onCancelExportMetaEdit = (): void => {
    this.setState({ metaEditExporterOpen: false });
  }

  onConfirmExportMetaEdit = (data: MetaEditExporterConfirmData): void => {
    this.setState({ metaEditExporterOpen: false });
    window.Shared.back.sendP<any, ExportMetaEditData>(BackIn.EXPORT_META_EDIT, {
      id: data.id,
      properties: data.properties,
    });
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

function isInitDone(state: AppState): boolean {
  return (
    state.upgradesDoneLoading &&
    state.creditsDoneLoading &&
    state.loaded[BackInit.EXEC]
  );
}

function log(content: string): void {
  window.Shared.back.send<any, AddLogData>(BackIn.ADD_LOG, {
    source: 'Launcher',
    content: content,
  });
}
