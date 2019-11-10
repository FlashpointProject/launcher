import { ipcRenderer, remote } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import * as which from 'which';
import * as AppConstants from '../shared/AppConstants';
import { BrowsePageLayout } from '../shared/BrowsePageLayout';
import { IGameInfo } from '../shared/game/interfaces';
import { IObjectMap, WindowIPC } from '../shared/interfaces';
import { LangContainer, LangFile } from '../shared/lang';
import { GameLibraryFileItem } from '../shared/library/types';
import { findDefaultLibrary, findLibraryByRoute, getLibraryItemTitle, getLibraryPlatforms } from '../shared/library/util';
import { memoizeOne } from '../shared/memoize';
import { updatePreferencesData } from '../shared/preferences/util';
import { deepCopy, recursiveReplace, versionNumberToText } from '../shared/Util';
import { formatString } from '../shared/utils/StringFormatter';
import { GameOrderChangeEvent } from './components/GameOrder';
import { SplashScreen } from './components/SplashScreen';
import { TitleBar } from './components/TitleBar';
import { ConnectedFooter } from './containers/ConnectedFooter';
import HeaderContainer from './containers/HeaderContainer';
import { WithLibraryProps } from './containers/withLibrary';
import { WithPreferencesProps } from './containers/withPreferences';
import { CreditsFile } from './credits/CreditsFile';
import { CreditsData } from './credits/types';
import GameManager from './game/GameManager';
import GameManagerPlatform from './game/GameManagerPlatform';
import { GameImageCollection } from './image/GameImageCollection';
import { CentralState, UpgradeStageState } from './interfaces';
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
import { joinLibraryRoute, openConfirmDialog } from './Util';
import { LangContext } from './util/lang';
import { downloadAndInstallUpgrade, performUpgradeStageChecks } from './util/upgrade';

type AppOwnProps = {
  /** Most recent search query. */
  search: SearchQuery;
  /** Theme manager. */
  themes: ThemeManager;
  /** Lang manager. */
  langManager: LangManager;
};

export type AppProps = AppOwnProps & RouteComponentProps & WithPreferencesProps & WithLibraryProps;

export type AppState = {
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
  /** Currently selected game (for each browse tab / library). */
  selectedGames: IObjectMap<IGameInfo>;
  /** Currently selected playlists (for each browse tab / library). */
  selectedPlaylists: IObjectMap<GamePlaylist>;
  /** If the "New Game" button was clicked (silly way of passing the event from the footer the the browse page). */
  wasNewGameClicked: boolean;
  /** Current language container. */
  lang: LangContainer;
  /** Current list of available language files. */
  langList: LangFile[];
};

export class App extends React.Component<AppProps, AppState> {
  private countGamesOfCurrentLibrary = memoizeOne(countGamesOfLibrarysPlatforms);

  constructor(props: AppProps) {
    super(props);
    // Normal constructor stuff
    const preferencesData = this.props.preferencesData;
    const config = window.External.config;
    this.state = {
      central: {
        games: new GameManager(),
        playlists: new GamePlaylistManager(),
        upgrades: [],
        upgradesDoneLoading: false,
        gamesDoneLoading: false,
        gamesFailedLoading: false,
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
      selectedGames: {},
      selectedPlaylists: {},
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
        let stillDownloading = false;
        for (let stage of central.upgrades) {
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
    // Fetch LaunchBox game data from the xml
    this.state.central.games.findPlatforms()
    .then((filenames) => {
      // Prepare images
      const platforms: string[] = filenames.map((platform) => platform.split('.')[0]); // ('Flash.xml' => 'Flash')
      this.state.gameImages.addImageFolders(platforms);
    })
    .then(async () => {
      // Load platform data
      try {
        await this.state.central.games.loadPlatforms();
      } catch (errors) {
        // @TODO Make this errors passing a bit safer? Expecting specially formatted errors seems dangerous.
        errors.forEach((error: Error) => log(error.toString()));
        // Show a popup about the errors
        remote.dialog.showMessageBox({
          type: 'error',
          title: strings.dialog.errorParsingPlatforms,
          message: formatString(strings.dialog.errorParsingPlatformsMessage, String(errors.length)),
          buttons: ['Ok']
        });
        // Throw errors (since this catch was only for logging)
        throw errors;
      }
    })
    .catch(() => {
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
    // Load Upgrades
    const folderPath = window.External.isDev
        ? process.cwd()
        : path.dirname(remote.app.getPath('exe'));
    const upgradeCatch = (error: Error) => {
      console.warn(error);
    };
    Promise.all([UpgradeFile.readFile(folderPath, log), UpgradeFile.readFile(fullJsonFolderPath, log)].map(p => p.catch(upgradeCatch)))
    .then(async (fileData) => {
      // Combine all file data
      let allData: UpgradeStage[] = [];
      fileData.reduce(data => { if (data) { allData = allData.concat(data); } });
      this.setState({
        central: Object.assign({}, this.state.central, {
          upgrades: allData,
          upgradesDoneLoading: true,
        })
      });
      // Do existance checks on all upgrades
      await Promise.all(allData.map(async upgrade => {
        const results = await performUpgradeStageChecks(upgrade, fullFlashpointPath);
        this.setUpgradeStageState(upgrade.id, {
          alreadyInstalled: results.indexOf(false) === -1,
          checksDone: true
        });
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
    const { history, libraryData, location, preferencesData } = this.props;
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
        const defaultLibrary = findDefaultLibrary(libraryData.libraries);
        if (defaultLibrary) { route = defaultLibrary.route; }
      }
      if (!location.pathname.startsWith(Paths.BROWSE)) {
        history.push(joinLibraryRoute(route));
      }
      if (location.pathname.startsWith(Paths.BROWSE)) {
        this.setState({
          wasNewGameClicked: false,
          selectedGames: deleteMapProp(copyMap(this.state.selectedGames), route) // (Deselect the game of the current library)
        });
      }
    }
  }

  render() {
    const loaded = this.state.central.gamesDoneLoading &&
                   this.state.central.playlistsDoneLoading &&
                   this.state.central.upgradesDoneLoading &&
                   this.state.creditsDoneLoading;
    const games = this.state.central.games.collection.games;
    const libraries = this.props.libraryData.libraries;
    const platforms = this.state.central.games.listPlatforms();
    const route = getBrowseSubPath(this.props.location.pathname);
    const library = findLibraryByRoute(libraries, route);
    // Props to set to the router
    const routerProps: AppRouterProps = {
      central: this.state.central,
      creditsData: this.state.creditsData,
      creditsDoneLoading: this.state.creditsDoneLoading,
      order: this.state.order,
      gameScale: this.state.gameScale,
      gameLayout: this.state.gameLayout,
      gameImages: this.state.gameImages,
      selectedGame: this.state.selectedGames[route],
      selectedPlaylist: this.state.selectedPlaylists[route],
      onSelectGame: this.onSelectGame,
      onSelectPlaylist: this.onSelectPlaylist,
      wasNewGameClicked: this.state.wasNewGameClicked,
      onDownloadUpgradeClick: this.onDownloadUpgradeClick,
      gameLibraryRoute: route,
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
          gamesLoaded={this.state.central.gamesDoneLoading}
          playlistsLoaded={this.state.central.playlistsDoneLoading}
          upgradesLoaded={this.state.central.upgradesDoneLoading}
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
              showCount={this.state.central.gamesDoneLoading && !this.state.central.gamesFailedLoading}
              totalCount={games.length}
              currentLabel={library && getLibraryItemTitle(library, this.state.lang.libraries)}
              currentCount={this.countGamesOfCurrentLibrary(platforms, libraries, findLibraryByRoute(libraries, route))}
              onScaleSliderChange={this.onScaleSliderChange} scaleSliderValue={this.state.gameScale}
              onLayoutChange={this.onLayoutSelectorChange} layout={this.state.gameLayout}
              onNewGameClick={this.onNewGameClick} />
          </>
        ) : undefined}
      </LangContext.Provider>
    );
  }

  private onOrderChange = (event: GameOrderChangeEvent): void => {
    this.setState({ order: event });
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

  private onSelectGame = (game?: IGameInfo): void => {
    const route = getBrowseSubPath(this.props.location.pathname);
    this.setState({ selectedGames: setMapProp(copyMap(this.state.selectedGames), route, game) });
  }

  /** Set the selected playlist for a single "browse route" */
  private onSelectPlaylist = (playlist?: GamePlaylist, route?: string): void => {
    const { selectedGames, selectedPlaylists } = this.state;
    if (route === undefined) { route = getBrowseSubPath(this.props.location.pathname); }
    this.setState({
      selectedPlaylists: setMapProp(copyMap(selectedPlaylists), route, playlist),
      selectedGames: deleteMapProp(copyMap(selectedGames), route),
    });
  }

  private onDownloadUpgradeClick = (stage: UpgradeStage) => {
    downloadAndInstallStage(stage, this.setUpgradeStageState);
  }

  private setUpgradeStageState = (id: string, data: Partial<UpgradeStageState>) => {
    const { upgrades } = this.state.central;
    const index = upgrades.findIndex(u => u.id === id);
    if (index != -1) {
      const newUpgrades = deepCopy(upgrades);
      const newStageState = Object.assign({}, upgrades[index].state, data);
      newUpgrades[index].state = newStageState;
      this.setState({
        central: Object.assign({}, this.state.central, {
          upgrades: newUpgrades,
        })
      });
    }
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
}

function downloadAndInstallStage(stage: UpgradeStage, setStageState: (id: string, stage: Partial<UpgradeStageState>) => void) {
  // Check data folder is set
  let flashpointPath = window.External.config.data.flashpointPath;
  let promptRestartWhenFinished = false;
  if (flashpointPath === '') {
    // If folder isn't set, ask to set now
    const res = openConfirmDialog('No Folder Found', 'The Flashpoint folder is not set. Do you want to choose a folder to install to now?');
    if (!res) { return; }
    // Set folder now
    const picks = window.External.showOpenDialogSync({
      title: 'Pick Flashpoint Folder',
      properties: ['openDirectory', 'promptToCreate', 'createDirectory']
    });
    // Make sure folder given exists
    if (picks && picks.length > 0) {
      flashpointPath = picks[0];
      fs.ensureDirSync(flashpointPath);
      // Save picked folder to config
      let newConfig = recursiveReplace(deepCopy(window.External.config.data), {
        flashpointPath: flashpointPath
      });
      window.External.config.save(newConfig);
      promptRestartWhenFinished = true;
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
    // Start download and installation
    let prevProgressUpdate = Date.now();
    const state = downloadAndInstallUpgrade(stage, {
      installPath: path.resolve(flashpointPath),
      downloadFilename: filename
    })
    .on('progress', () => {
      const now = Date.now();
      if (now - prevProgressUpdate > 100) {
        prevProgressUpdate = now;
        switch (state.currentTask) {
          case 'downloading': setStageState(stage.id, { installProgressNote: `Downloading: ${(state.downloadProgress * 100).toFixed(1)}%` }); break;
          case 'extracting':  setStageState(stage.id, { installProgressNote: `Extracting: ${(state.extractProgress * 100).toFixed(1)}%` });   break;
          default:            setStageState(stage.id, { installProgressNote: '...' });                                                        break;
        }
      }
    })
    .once('done', () => {
      // Flag as done installing
      setStageState(stage.id, {
        isInstalling: false,
        isInstallationComplete: true,
      });
      if (promptRestartWhenFinished) {
        const res = openConfirmDialog('Restart Now?', 'This upgrade will not be applied until you restart.\nDo you wish to do this now?');
        if (res) {
          window.External.restart();
        }
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

/** Count the number of games in all platforms that "belongs" to the given library */
function countGamesOfLibrarysPlatforms(platforms: GameManagerPlatform[], libraries: GameLibraryFileItem[], library?: GameLibraryFileItem): number {
  const currentLibraries = library ? getLibraryPlatforms(libraries, platforms, library) : platforms;
  return currentLibraries.reduce(
    (acc, platform) => acc + (platform.collection ? platform.collection.games.length : 0),
    0
  );
}

function copyMap<T>(map: IObjectMap<T>): IObjectMap<T> {
  return Object.assign({}, map);
}

function setMapProp<T>(map: IObjectMap<T>, prop: string, value: T|undefined): IObjectMap<T> {
  map[prop] = value;
  return map;
}

function deleteMapProp<T>(map: IObjectMap<T>, prop: string): IObjectMap<T> {
  if (Object.prototype.hasOwnProperty.call(map, prop)) { delete map[prop]; }
  return map;
}
