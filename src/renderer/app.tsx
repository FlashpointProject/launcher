import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import * as remote from '@electron/remote';
import { BackIn, BackInit, BackOut } from '@shared/back/types';
import { APP_TITLE, VIEW_PAGE_SIZE } from '@shared/constants';
import { IService, ProcessState, WindowIPC } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { memoizeOne } from '@shared/memoize';
import { updatePreferencesData } from '@shared/preferences/util';
import { setTheme } from '@shared/Theme';
import { getUpgradeString } from '@shared/upgrade/util';
import { canReadWrite, deepCopy, getFileServerURL, recursiveReplace, sizeToString } from '@shared/Util';
import { arrayShallowStrictEquals } from '@shared/utils/compare';
import { debounce } from '@shared/utils/debounce';
import { formatString } from '@shared/utils/StringFormatter';
import { ipcRenderer } from 'electron';
import { AppUpdater } from 'electron-updater';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import * as which from 'which';
import { FloatingContainer } from './components/FloatingContainer';
import { GameOrderChangeEvent } from './components/GameOrder';
import { MetaEditExporter, MetaEditExporterConfirmData } from './components/MetaEditExporter';
import { placeholderProgressData, ProgressBar } from './components/ProgressComponents';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';
import { ConnectedFooter } from './containers/ConnectedFooter';
import HeaderContainer from './containers/HeaderContainer';
import { WithMainStateProps } from './containers/withMainState';
import { WithPreferencesProps } from './containers/withPreferences';
import { WithTagCategoriesProps } from './containers/withTagCategories';
import { CreditsFile } from './credits/CreditsFile';
import { UpdateView, UpgradeStageState } from './interfaces';
import { Paths } from './Paths';
import { AppRouter, AppRouterProps } from './router';
import { MainActionType, RequestState } from './store/main/enums';
import { RANDOM_GAME_ROW_COUNT } from './store/main/reducer';
import { MainState } from './store/main/types';
import { SearchQuery } from './store/search';
import { UpgradeStage } from './upgrade/types';
import { UpgradeFile } from './upgrade/UpgradeFile';
import { getBrowseSubPath, isFlashpointValidCheck, joinLibraryRoute, openConfirmDialog } from './Util';
import { LangContext } from './util/lang';
import { checkUpgradeStateInstalled, checkUpgradeStateUpdated, downloadAndInstallUpgrade } from './util/upgrade';

const autoUpdater: AppUpdater = remote.require('electron-updater').autoUpdater;

type AppOwnProps = {
  /** Most recent search query. */
  search: SearchQuery;
};

export type AppProps = AppOwnProps & RouteComponentProps & WithPreferencesProps & WithTagCategoriesProps & WithMainStateProps;

export class App extends React.Component<AppProps> {
  constructor(props: AppProps) {
    super(props);

    // Initialize app
    this.init();
  }

  init() {
    const strings = this.props.main.lang;
    const fullFlashpointPath = window.Shared.config.fullFlashpointPath;
    const fullJsonFolderPath = window.Shared.config.fullJsonFolderPath;
    // Warn the user when closing the launcher WHILE downloading or installing an upgrade
    (() => {
      let askBeforeClosing = true;
      window.onbeforeunload = (event: BeforeUnloadEvent) => {
        const { upgrades } = this.props.main;
        let stillDownloading = false;
        for (const stage of upgrades) {
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
        // Cap minimum size
        if (width < 300) {
          width = 300;
        }
        if (height < 300) {
          height = 300;
        }
        updatePreferencesData({ mainWindow: { width: width|0, height: height|0 } });
      }
    }, 100));
    ipcRenderer.on(WindowIPC.WINDOW_MAXIMIZE, (sender, isMaximized: boolean) => {
      updatePreferencesData({ mainWindow: { maximized: isMaximized } });
    });

    window.Shared.back.request(BackIn.INIT_LISTEN)
    .then(data => {
      if (!data) { throw new Error('INIT_LISTEN response is missing data.'); }
      this.props.dispatchMain({
        type: MainActionType.ADD_LOADED,
        loaded: data.done,
      });
    });

    window.Shared.back.request(BackIn.GET_GAMES_TOTAL)
    .then(data => {
      if (data) {
        this.props.dispatchMain({
          type: MainActionType.SET_GAMES_TOTAL,
          total: data,
        });
      }
    });

    window.Shared.back.request(BackIn.GET_SUGGESTIONS)
    .then(data => {
      if (data) {
        this.props.dispatchMain({
          type: MainActionType.SET_SUGGESTIONS,
          suggestions: data.suggestions,
          appPaths: data.appPaths,
        });
      }
    });

    // Register API handlers

    // console.log('IN', res);
    window.Shared.back.register(BackOut.INIT_EVENT, (event, data) => {
      for (const index of data.done) {
        switch (parseInt(index+'', 10)) { // (It is a string, even though TS thinks it is a number)
          case BackInit.PLAYLISTS:
            window.Shared.back.request(BackIn.GET_PLAYLISTS).then(data => {
              if (data) {
                this.props.setMainState({ playlists: data });
                this.cachePlaylistIcons(data);
              }
            });
            break;
        }
      }

      this.props.dispatchMain({
        type: MainActionType.ADD_LOADED,
        loaded: data.done,
      });
    });

    window.Shared.back.register(BackOut.INIT_EVENT, (event, data) => {
      for (const index of data.done) {
        switch (parseInt(index+'', 10)) { // (It is a string, even though TS thinks it is a number)
          case BackInit.PLAYLISTS:
            window.Shared.back.request(BackIn.GET_PLAYLISTS)
            .then(data => {
              if (data) {
                this.props.setMainState({ playlists: data });
                this.cachePlaylistIcons(data);
              }
            });
            break;
        }
      }

      this.props.dispatchMain({
        type: MainActionType.ADD_LOADED,
        loaded: data.done,
      });
    });

    window.Shared.back.register(BackOut.LOG_ENTRY_ADDED, (event, entry, index) => {
      window.Shared.log.entries[index - window.Shared.log.offset] = entry;
    });

    window.Shared.back.register(BackOut.LOCALE_UPDATE, (event, data) => {
      this.props.dispatchMain({
        type: MainActionType.SET_LOCALE,
        localeCode: data,
      });
    });

    window.Shared.back.register(BackOut.SERVICE_CHANGE, (event, data) => {
      if (data.id) {
        const newServices = [...this.props.main.services];
        const service = newServices.find(item => item.id === data.id);
        if (service) {
          recursiveReplace(service, data);
        } else {
          newServices.push(recursiveReplace({
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
          }, data));
        }
        this.props.setMainState({ services: newServices });
      } else { throw new Error('Service update did not reference a service.'); }
    });

    window.Shared.back.register(BackOut.SERVICE_REMOVED, (event, id) => {
      const newServices = [...this.props.main.services];
      const index = newServices.findIndex(s => s.id === id);
      if (index > -1) {
        newServices.splice(index, 1);
        this.props.setMainState({ services: newServices });
      }
    });

    window.Shared.back.register(BackOut.LANGUAGE_CHANGE, (event, data) => {
      this.props.dispatchMain({
        type: MainActionType.SET_LANGUAGE,
        lang: data,
      });
    });

    window.Shared.back.register(BackOut.LANGUAGE_LIST_CHANGE, (event, data) => {
      this.props.dispatchMain({
        type: MainActionType.SET_LANGUAGE_LIST,
        langList: data,
      });
    });

    window.Shared.back.register(BackOut.THEME_CHANGE, (event, theme) => {
      if (theme.id === this.props.preferencesData.currentTheme) { setTheme(theme); }
    });

    window.Shared.back.register(BackOut.THEME_LIST_CHANGE, (event, data) => {
      this.props.dispatchMain({
        type: MainActionType.SET_THEME_LIST,
        themeList: data,
      });
    });

    window.Shared.back.register(BackOut.PLAYLISTS_CHANGE, (event, data) => {
      this.props.dispatchMain({
        type: MainActionType.SET_PLAYLISTS,
        playlists: data,
      });
      this.cachePlaylistIcons(data);
    });

    window.Shared.back.register(BackOut.UPDATE_PREFERENCES_RESPONSE, (event, data) => {
      window.Shared.preferences.data = data;
      if (window.Shared.preferences.onUpdate) {
        window.Shared.preferences.onUpdate();
      }
    });

    window.Shared.back.register(BackOut.UPDATE_EXT_CONFIG_DATA, (event, data) => {
      this.props.setMainState({ extConfig: data });
    });

    window.Shared.back.register(BackOut.TAG_CATEGORIES_CHANGE, (event, data) => {
      this.props.setTagCategories(data);
    });

    window.Shared.back.register(BackOut.DEV_CONSOLE_CHANGE, (event, text) => {
      this.props.setMainState({ devConsole: text });
    });

    window.Shared.back.register(BackOut.OPEN_ALERT, (event, text) => {
      alert(text);
    });

    window.Shared.back.register(BackOut.SET_PLACEHOLDER_DOWNLOAD_DETAILS, (event, details) => {
      const { downloadSize } = details;
      this.props.setMainState({ downloadSize });
    });

    window.Shared.back.register(BackOut.SET_PLACEHOLDER_DOWNLOAD_PERCENT, (event, percent) => {
      if (percent === 100) {
        this.props.setMainState({ downloadVerifying: true, downloadPercent: percent });
      } else {
        this.props.setMainState({ downloadPercent: percent });
      }
    });

    window.Shared.back.register(BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG, (event) => {
      this.props.setMainState({ downloadOpen: true, downloadVerifying: false, downloadPercent: 0 });
    });

    window.Shared.back.register(BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG, (event) => {
      this.props.setMainState({ downloadOpen: false, downloadPercent: 0 });
    });

    // Cache playlist icons (if they are loaded)
    if (this.props.main.playlists.length > 0) { this.cachePlaylistIcons(this.props.main.playlists); }

    // -- Stuff that should probably be moved to the back --

    // Load Upgrades
    const folderPath = window.Shared.isDev
      ? process.cwd()
      : path.dirname(remote.app.getPath('exe'));
    const upgradeCatch = (error: Error) => { console.warn(error); };
    const launcherLogFunc = (message: string) => {
      log.warn('Launcher', message);
    };
    Promise.all([UpgradeFile.readFile(folderPath, launcherLogFunc), UpgradeFile.readFile(fullJsonFolderPath, launcherLogFunc)].map(p => p.catch(upgradeCatch)))
    .then(async (fileData) => {
      // Combine all file data
      let allData: UpgradeStage[] = [];
      for (const data of fileData) {
        if (data) {
          allData = allData.concat(data);
        }
      }
      this.props.dispatchMain({
        type: MainActionType.SET_UPGRADES,
        upgrades: allData,
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
      this.props.dispatchMain({
        type: MainActionType.SET_CREDITS,
        creditsData: CreditsFile.parseCreditsData(data),
      });
    })
    .catch((error) => {
      console.warn(error);
      log.warn('Launcher', `Failed to load credits.\n${error}`);
      this.props.dispatchMain({ type: MainActionType.SET_CREDITS });
    });

    // Updater code - DO NOT run in development environment!
    if (!window.Shared.isDev) {
      autoUpdater.autoDownload = false;
      autoUpdater.on('error', (error: Error) => {
        console.log(error);
      });
      autoUpdater.on('update-available', (info) => {
        log.info('Launcher', `Update Available - ${info.version}`);
        console.log(info);
        this.props.dispatchMain({
          type: MainActionType.SET_UPDATE_INFO,
          updateInfo: info,
        });
      });
      autoUpdater.on('update-downloaded', onUpdateDownloaded);
      if (window.Shared.config.data.updatesEnabled) {
        autoUpdater.checkForUpdates()
        .catch((error) => { log.error('Launcher', `Error Fetching Update Info - ${error.message}`); });
        log.info('Launcher', 'Checking for updates...');
      } else {
        log.info('Launcher', 'Update check disabled, skipping...');
      }
    }

    // Check for Wine and PHP on Linux/Mac
    if (process.platform !== 'win32') {
      which('php', function(err: Error | null) {
        if (err) {
          log.warn('Launcher', 'Warning: PHP not found in path, may cause unexpected behaviour.');
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

  componentDidMount() {
    // Call first batch of random games
    if (this.props.main.randomGames.length < RANDOM_GAME_ROW_COUNT) { this.rollRandomGames(true); }
  }

  componentDidUpdate(prevProps: AppProps) {
    const { history, location, preferencesData } = this.props;
    const library = getBrowseSubPath(this.props.location.pathname);
    const view = this.props.main.views[library];

    // Check if theme changed
    if (preferencesData.currentTheme !== prevProps.preferencesData.currentTheme) {
      const theme = this.props.main.themeList.find(t => t.id === preferencesData.currentTheme);
      setTheme(theme);
    }

    // Check if logo set changed
    if (preferencesData.currentLogoSet !== prevProps.preferencesData.currentLogoSet) {
      this.props.dispatchMain({
        type: MainActionType.INCREMENT_LOGO_VERSION
      });
    }

    // Check if playlists need to be updated based on extreme filtering
    if (preferencesData.browsePageShowExtreme !== prevProps.preferencesData.browsePageShowExtreme) {
      window.Shared.back.request(BackIn.GET_PLAYLISTS)
      .then(data => {
        if (data) {
          this.props.setMainState({ playlists: data });
          this.cachePlaylistIcons(data);
        }
      });
    }

    // Check if renderer finished initializing
    if (isInitDone(this.props.main) && !isInitDone(prevProps.main)) {
      // Pre-request all libraries
      for (const library of this.props.main.libraries) {
        this.setViewQuery(library);
      }
    }

    // Reset random games if the filters change
    // @TODO: Is this really the best way to compare array contents? I guess it works
    if (
      this.props.preferencesData.browsePageShowExtreme !== prevProps.preferencesData.browsePageShowExtreme ||
      !arrayShallowStrictEquals(this.props.preferencesData.excludedRandomLibraries, prevProps.preferencesData.excludedRandomLibraries) ||
      JSON.stringify(prevProps.preferencesData.tagFilters) !== JSON.stringify(this.props.preferencesData.tagFilters)) {
      this.props.dispatchMain({
        type: MainActionType.CLEAR_RANDOM_GAMES
      });
      this.props.dispatchMain({
        type: MainActionType.REQUEST_RANDOM_GAMES
      });
      window.Shared.back.request(BackIn.RANDOM_GAMES, {
        count: RANDOM_GAME_ROW_COUNT * 10,
        broken: this.props.preferencesData.showBrokenGames,
        excludedLibraries: this.props.preferencesData.excludedRandomLibraries,
        tagFilters: this.props.preferencesData.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !this.props.preferencesData.browsePageShowExtreme))
      })
      .then((data) => {
        this.props.dispatchMain({
          type: MainActionType.RESPONSE_RANDOM_GAMES,
          games: data || [],
        });
      })
      .catch((error) => {
        log.error('Launcher', `Error fetching random games - ${error}`);
      });
    }

    if (view) {
      // Check if any parameters for the search query has changed (they don't match the current view's)
      if (view.query.text                   !== this.props.search.text ||
          view.query.extreme                !== this.props.preferencesData.browsePageShowExtreme ||
          view.query.orderBy                !== this.props.preferencesData.gamesOrderBy ||
          view.query.orderReverse           !== this.props.preferencesData.gamesOrder ||
          prevProps.main.playlists          !== this.props.main.playlists ||
          view.tagFilters                   !== this.props.preferencesData.tagFilters ||
          view.query.searchLimit            !== this.props.preferencesData.searchLimit) {
        this.setViewQuery(library);
      }
      // Fetch pages
      else if (view.metaState === RequestState.RECEIVED) {
        let pages: number[] | undefined;

        for (const index in view.pageState) {
          if (view.pageState[index] === RequestState.WAITING) {
            if (!pages) { pages = []; }
            pages.push(+index);
          }
        }

        if (pages && pages.length > 0) {
          // Request pages
          window.Shared.back.request(BackIn.BROWSE_VIEW_PAGE, {
            ranges: pages.map(index => ({
              start: index * VIEW_PAGE_SIZE,
              length: VIEW_PAGE_SIZE,
              index: view.meta && view.meta.pageKeyset[index + 1], // Page keyset indices are one-indexed (start at 1 instead of 0)
            })),
            library: library,
            query: view.query,
            shallow: true,
          })
          .then((data) => {
            if (data) {
              this.props.dispatchMain({
                type: MainActionType.ADD_VIEW_PAGES,
                library: library,
                queryId: view.queryId,
                ranges: data.ranges,
              });
            } else {
              console.error('BROWSE_VIEW_PAGE response contains no data.');
            }
          });

          // Flag pages as requested
          this.props.dispatchMain({
            type: MainActionType.REQUEST_VIEW_PAGES,
            library: library,
            queryId: view.queryId,
            pages: pages,
          });
        }
      }
    }

    for (const l in this.props.main.views) {
      const v = this.props.main.views[l];
      // Check if the meta has not yet been requested
      if (v && v.metaState === RequestState.WAITING) {
        // Request meta
        window.Shared.back.request(BackIn.BROWSE_VIEW_KEYSET, l, v.query)
        .then((data) => {
          if (data) {
            this.props.dispatchMain({
              type: MainActionType.SET_VIEW_META,
              library: l,
              queryId: v.queryId,
              keyset: data.keyset,
              total: data.total,
            });
          }
        })
        .catch((error) => {
          log.error('Launcher', `Error getting browse view keyset - ${error}`);
        });

        // Flag meta as requested
        this.props.dispatchMain({
          type: MainActionType.REQUEST_VIEW_META,
          library: l,
          queryId: v.queryId,
        });
      }
    }

    // Update preference "lastSelectedLibrary"
    const gameLibrary = getBrowseSubPath(location.pathname);
    if (location.pathname.startsWith(Paths.BROWSE) &&
        preferencesData.lastSelectedLibrary !== gameLibrary) {
      updatePreferencesData({ lastSelectedLibrary: gameLibrary });
    }

    // Create a new game
    if (this.props.main.wasNewGameClicked) {
      const route = preferencesData.lastSelectedLibrary || preferencesData.defaultLibrary || '';

      if (location.pathname.startsWith(Paths.BROWSE)) {
        this.props.dispatchMain({ type: MainActionType.CLICK_NEW_GAME_END });
        // Deselect the current game
        const view = this.props.main.views[route];
        if (view && view.selectedGameId !== undefined) {
          this.props.dispatchMain({
            type: MainActionType.SET_VIEW_SELECTED_GAME,
            library: route,
            gameId: undefined,
          });
        }
      } else {
        history.push(joinLibraryRoute(route));
      }
    }
  }

  render() {
    const loaded = isInitDone(this.props.main);
    const libraryPath = getBrowseSubPath(this.props.location.pathname);
    const view = this.props.main.views[libraryPath];
    const playlists = this.filterAndOrderPlaylistsMemo(this.props.main.playlists, libraryPath);

    // Props to set to the router
    const routerProps: AppRouterProps = {
      games: view && view.games || {},
      randomGames: this.props.main.randomGames,
      rollRandomGames: this.rollRandomGames,
      updateView: this.updateView,
      gamesTotal: view && view.total || 0,
      playlists: playlists,
      suggestions: this.props.main.suggestions,
      appPaths: this.props.main.appPaths,
      platforms: this.props.main.platforms,
      platformsFlat: this.flattenPlatformsMemo(this.props.main.platforms),
      playlistIconCache: this.props.main.playlistIconCache,
      onSaveGame: this.onSaveGame,
      onDeleteGame: this.onDeleteGame,
      onLaunchGame: this.onLaunchGame,
      onQuickSearch: this.onQuickSearch,
      onOpenExportMetaEdit: this.onOpenExportMetaEdit,
      libraries: this.props.main.libraries,
      serverNames: this.props.main.serverNames,
      mad4fpEnabled: this.props.main.mad4fpEnabled,
      localeCode: this.props.main.localeCode,
      devConsole: this.props.main.devConsole,
      upgrades: this.props.main.upgrades,
      creditsData: this.props.main.creditsData,
      creditsDoneLoading: this.props.main.creditsDoneLoading,
      selectedGameId: view && view.selectedGameId,
      gameRunning: view ? this.checkGameRunningMemo(view.selectedGameId, this.props.main.services) : false,
      selectedPlaylistId: view && view.query.filter.playlistId,
      onSelectGame: this.onSelectGame,
      onDeletePlaylist: this.onPlaylistDelete,
      onUpdatePlaylist: this.onUpdatePlaylist,
      onSelectPlaylist: this.onSelectPlaylist,
      wasNewGameClicked: this.props.main.wasNewGameClicked,
      onDownloadUpgradeClick: this.onDownloadUpgradeClick,
      gameLibrary: libraryPath,
      themeList: this.props.main.themeList,
      languages: this.props.main.langList,
      updateInfo: this.props.main.updateInfo,
      autoUpdater: autoUpdater,
      extensions: this.props.main.extensions,
      devScripts: this.props.main.devScripts,
      contextButtons: this.props.main.contextButtons,
      logoSets: this.props.main.logoSets,
      extConfigs: this.props.main.extConfigs,
      extConfig: this.props.main.extConfig,
      logoVersion: this.props.main.logoVersion,
      services: this.props.main.services,
      updateFeedMarkdown: window.Shared.initialUpdateFeedMarkdown,
    };

    // Render
    return (
      <LangContext.Provider value={this.props.main.lang}>
        { !this.props.main.stopRender ? (
          <>
            {/* Splash screen */}
            <SplashScreen
              gamesLoaded={this.props.main.gamesDoneLoading}
              upgradesLoaded={this.props.main.upgradesDoneLoading}
              creditsLoaded={this.props.main.creditsDoneLoading}
              miscLoaded={this.props.main.loaded[BackInit.EXEC]} />
            {/* Title-bar (if enabled) */}
            { window.Shared.config.data.useCustomTitlebar ?
              window.Shared.customVersion ? (
                <TitleBar title={window.Shared.customVersion} />
              ) : (
                <TitleBar title={`${APP_TITLE} (${remote.app.getVersion()})`} />
              ) : undefined }
            {/* "Content" */}
            { loaded ? (
              <>
                {/* Header */}
                <HeaderContainer
                  libraries={this.props.main.libraries}
                  onOrderChange={this.onOrderChange}
                  onToggleLeftSidebarClick={this.onToggleLeftSidebarClick}
                  onToggleRightSidebarClick={this.onToggleRightSidebarClick}
                  orderBy={this.props.preferencesData.gamesOrderBy}
                  orderReverse={this.props.preferencesData.gamesOrder} />
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
                <ConnectedFooter />
                {/* Meta Edit Popup */}
                { this.props.main.metaEditExporterOpen ? (
                  <MetaEditExporter
                    gameId={this.props.main.metaEditExporterGameId}
                    onCancel={this.onCancelExportMetaEdit}
                    onConfirm={this.onConfirmExportMetaEdit} />
                ) : undefined }
              </>
            ) : undefined }
          </>
        ) : undefined }
        { this.props.main.downloadOpen && (
          <FloatingContainer>
            { this.props.main.downloadVerifying ? (
              <>
                <div className='placeholder-download-bar--title'>
                  {this.props.main.lang.dialog.verifyingGame}
                </div>
                <div>{this.props.main.lang.dialog.aFewMinutes}</div>
              </>
            ) : (
              <>
                <div className='placeholder-download-bar--title'>
                  {this.props.main.lang.dialog.downloadingGame}
                </div>
                <div>{`${sizeToString(this.props.main.downloadSize * (this.props.main.downloadPercent / 100))} / ${sizeToString(this.props.main.downloadSize)}`}</div>
              </>
            )}
            { this.props.main.downloadVerifying ? <></> : (
              <ProgressBar
                wrapperClass='placeholder-download-bar__wrapper'
                progressData={{
                  ...placeholderProgressData,
                  percentDone: this.props.main.downloadPercent,
                  usePercentDone: true
                }}
              />
            )}
          </FloatingContainer>
        )}
      </LangContext.Provider>
    );
  }

  private onOrderChange = (event: GameOrderChangeEvent): void => {
    updatePreferencesData({
      gamesOrderBy: event.orderBy,
      gamesOrder: event.orderReverse,
    });
  }

  private onToggleLeftSidebarClick = (): void => {
    updatePreferencesData({ browsePageShowLeftSidebar: !this.props.preferencesData.browsePageShowLeftSidebar });
  }

  private onToggleRightSidebarClick = (): void => {
    updatePreferencesData({ browsePageShowRightSidebar: !this.props.preferencesData.browsePageShowRightSidebar });
  }

  private onSelectGame = (gameId?: string): void => {
    const library = getBrowseSubPath(this.props.location.pathname);
    const view = this.props.main.views[library];
    if (view) {
      this.props.dispatchMain({
        type: MainActionType.SET_VIEW_SELECTED_GAME,
        library: library,
        gameId: gameId,
      });
    }
  }

  /** Set the selected playlist for a single "browse route" */
  private onSelectPlaylist = (library: string, playlistId: string | undefined): void => {
    this.setViewQuery(library, playlistId);
  }

  private onDownloadUpgradeClick = (stage: UpgradeStage, strings: LangContainer) => {
    downloadAndInstallStage(stage, this.setUpgradeStageState, strings);
  }

  private setUpgradeStageState = (id: string, data: Partial<UpgradeStageState>) => {
    const { upgrades } = this.props.main;
    const index = upgrades.findIndex(u => u.id === id);
    if (index !== -1) {
      const newUpgrades = deepCopy(upgrades);
      const newStageState = Object.assign({}, upgrades[index].state, data);
      newUpgrades[index].state = newStageState;
      this.props.dispatchMain({
        type: MainActionType.SET_UPGRADES,
        upgrades: newUpgrades,
      });
    }
  }

  private onPlaylistDelete = (playlist: Playlist) => {
    if (playlist) {
      const index = this.props.main.playlists.findIndex(p => p.id === playlist.id);
      if (index >= 0) {
        const playlists = [ ...this.props.main.playlists ];
        playlists.splice(index, 1);

        const cache: Record<string, string> = { ...this.props.main.playlistIconCache };
        const id = this.props.main.playlists[index].id;
        if (id in cache) { delete cache[id]; }

        this.props.setMainState({
          playlists: playlists,
          playlistIconCache: cache
        });
      }
    }
  }

  private onUpdatePlaylist = (playlist: Playlist) => {
    const state: Partial<Pick<MainState, 'playlistIconCache' | 'playlists' | 'views'>> = {};

    // Update or add playlist
    const index = this.props.main.playlists.findIndex(p => p.id === playlist.id);
    if (index >= 0) {
      state.playlists = [ ...this.props.main.playlists ];
      state.playlists[index] = playlist;
    } else {
      state.playlists = [ ...this.props.main.playlists, playlist ];
    }

    // Remove old icon from cache
    if (playlist.id in this.props.main.playlistIconCache) {
      state.playlistIconCache = { ...this.props.main.playlistIconCache };
      delete state.playlistIconCache[playlist.id];
      URL.revokeObjectURL(this.props.main.playlistIconCache[playlist.id]); // Free blob from memory
    }

    // Cache new icon
    if (playlist.icon !== undefined) {
      cacheIcon(playlist.icon).then(url => {
        this.props.setMainState({
          playlistIconCache: {
            ...this.props.main.playlistIconCache,
            [playlist.id]: url,
          }
        });
      });
    }

    // Clear view caches (that use this playlist)
    for (const library in this.props.main.views) {
      const view = this.props.main.views[library];
      if (view && (view.query.filter.playlistId === playlist.id)) {
        this.setViewQuery(library);
      }
    }

    this.props.setMainState(state as any); // (This is very annoying to make typesafe)
  }

  onSaveGame = async (game: Game, playlistEntry?: PlaylistGame): Promise<Game | undefined> => {
    const data = await window.Shared.back.request(BackIn.SAVE_GAME, game);
    if (playlistEntry) {
      window.Shared.back.send(BackIn.SAVE_PLAYLIST_GAME, playlistEntry);
    }
    this.setViewQuery(game.library);
    return data.game;
  }

  onDeleteGame = (gameId: string): void => {
    const strings = this.props.main.lang;
    const library = getBrowseSubPath(this.props.location.pathname);
    window.Shared.back.request(BackIn.DELETE_GAME, gameId)
    .then(() => { this.setViewQuery(library); })
    .catch((error) => {
      log.error('Launcher', `Error deleting game: ${error}`);
      alert(strings.dialog.unableToDeleteGame + '\n\n' + error);
    });
  }

  onLaunchGame(gameId: string): void {
    window.Shared.back.send(BackIn.LAUNCH_GAME, gameId);
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
      this.props.setMainState({ playlistIconCache: cache });
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
    this.props.dispatchMain({ type: MainActionType.STOP_RENDER });
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

  private checkGameRunningMemo = memoizeOne((gameId: string | undefined, services: IService[]) => {
    return gameId ? !!services.find(s => s.id === `game.${gameId}`) : false;
  });

  /**
   * Set the query of a view.
   * Note: If there is only one argument (counted by length) then the playlistId will remain the same.
   */
  setViewQuery = (function(this: App, library: string = getBrowseSubPath(this.props.location.pathname), playlistId?: string): void {
    this.props.dispatchMain({
      type: MainActionType.SET_VIEW_QUERY,
      library: library,
      searchText: this.props.search.text,
      showExtreme: this.props.preferencesData.browsePageShowExtreme,
      orderBy: this.props.preferencesData.gamesOrderBy,
      orderReverse: this.props.preferencesData.gamesOrder,
      searchLimit: this.props.preferencesData.searchLimit,
      playlistId: (arguments.length >= 2)
        ? playlistId
        : null,
      tagFilters: this.props.preferencesData.tagFilters
    });
  }).bind(this);

  updateView: UpdateView = (start, count) => {
    this.props.dispatchMain({
      type: MainActionType.SET_VIEW_BOUNDRIES,
      library: getBrowseSubPath(this.props.location.pathname),
      start: start,
      count: count,
    });
  }

  onOpenExportMetaEdit = (gameId: string): void => {
    this.props.dispatchMain({
      type: MainActionType.OPEN_META_EXPORTER,
      gameId: gameId,
    });
  }

  onCancelExportMetaEdit = (): void => {
    this.props.dispatchMain({ type: MainActionType.CLOSE_META_EXPORTER });
  }

  onConfirmExportMetaEdit = (data: MetaEditExporterConfirmData): void => {
    this.props.dispatchMain({ type: MainActionType.CLOSE_META_EXPORTER });
    window.Shared.back.send(BackIn.EXPORT_META_EDIT, data.id, data.properties);
  }

  rollRandomGames = (first?: boolean) => {
    const { randomGames, requestingRandomGames } = this.props.main;

    // Shift in new games from the queue
    if (first !== true) {
      this.props.dispatchMain({ type: MainActionType.SHIFT_RANDOM_GAMES });
    }

    // Request more games to the queue
    if (randomGames.length <= (RANDOM_GAME_ROW_COUNT * 5) && !requestingRandomGames) {
      this.props.dispatchMain({ type: MainActionType.REQUEST_RANDOM_GAMES });

      window.Shared.back.request(BackIn.RANDOM_GAMES, {
        count: RANDOM_GAME_ROW_COUNT * 10,
        broken: this.props.preferencesData.showBrokenGames,
        excludedLibraries: this.props.preferencesData.excludedRandomLibraries,
        tagFilters: this.props.preferencesData.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !this.props.preferencesData.browsePageShowExtreme))
      })
      .then((data) => {
        this.props.dispatchMain({
          type: MainActionType.RESPONSE_RANDOM_GAMES,
          games: data || [],
        });
      });
    }
  };
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
      window.Shared.back.request(BackIn.UPDATE_CONFIG, {
        flashpointPath: flashpointPath,
      })
      .then(() => { /* window.Shared.restart(); */ });
    }
  }
  // Flag as installing
  setStageState(stage.id, {
    isInstalling: true,
    installProgressNote: '...',
  });
  // Grab filename from url

  for (const source of stage.sources) {
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
      log.error('Launcher', `Error installing '${stage.title}' - ${error.message}`);
      console.error(error);
    })
    .on('warn', console.warn);
  }
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

function isInitDone(state: MainState): boolean {
  return (
    state.gamesDoneLoading &&
    state.upgradesDoneLoading &&
    state.creditsDoneLoading &&
    state.loaded[BackInit.EXEC]
  );
}
