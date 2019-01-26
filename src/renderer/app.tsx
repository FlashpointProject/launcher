import { IpcMessageEvent, ipcRenderer, remote } from 'electron';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import * as AppConstants from '../shared/AppConstants';
import { BrowsePageLayout } from '../shared/BrowsePageLayout';
import { IGameInfo } from '../shared/game/interfaces';
import { IObjectMap } from '../shared/interfaces';
import { IGameOrderChangeEvent } from './components/GameOrder';
import { TitleBar } from './components/TitleBar';
import { ConnectedFooter } from './containers/ConnectedFooter';
import HeaderContainer from './containers/HeaderContainer';
import { WithLibraryProps } from './containers/withLibrary';
import { WithPreferencesProps } from './containers/withPreferences';
import GameManager from './game/GameManager';
import { GameImageCollection } from './image/GameImageCollection';
import { ICentralState, UpgradeStageState, UpgradeState } from './interfaces';
import { Paths } from './Paths';
import { GamePlaylistManager } from './playlist/GamePlaylistManager';
import { IGamePlaylist } from './playlist/interfaces';
import { AppRouter, IAppRouterProps } from './router';
import { SearchQuery } from './store/search';
import { IUpgradeStage, performUpgradeStageChecks, readUpgradeFile } from './upgrade/upgrade';
import { downloadAndInstallUpgrade } from './util/upgrade';

interface IAppOwnProps {
  search: SearchQuery;
}

export type IAppProps = IAppOwnProps & RouteComponentProps & WithPreferencesProps & WithLibraryProps;

export interface IAppState {
  central: ICentralState;
  order?: IGameOrderChangeEvent;
  /** Scale of games at the browse page */
  gameScale: number;
  /** Layout of the browse page */
  gameLayout: BrowsePageLayout;
  /** Currently selected game (for each browse tab / library) */
  selectedGames: IObjectMap<IGameInfo>;
  /** Currently selected playlists (for each browse tab / library) */
  selectedPlaylists: IObjectMap<IGamePlaylist>;
  /** If the "New Game" button was clicked (silly way of passing the event from the footer the the browse page) */
  wasNewGameClicked: boolean;
}

export class App extends React.Component<IAppProps, IAppState> {
  constructor(props: IAppProps) {
    super(props);
    // Normal constructor stuff
    const preferencesData = this.props.preferencesData;
    const config = window.External.config;
    this.state = {
      central: {
        games: new GameManager(),
        gameImages: new GameImageCollection(config.fullFlashpointPath),
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
        gamesDoneLoading: false,
        gamesFailedLoading: false,
        playlistsDoneLoading: false,
        playlistsFailedLoading: false,
      },
      gameScale: preferencesData.browsePageGameScale,
      gameLayout: preferencesData.browsePageLayout,
      selectedGames: {},
      selectedPlaylists: {},
      wasNewGameClicked: false,
    };
    // Initialize app
    this.init();
  }

  init() {
    const fullFlashpointPath = window.External.config.fullFlashpointPath;
    // Warn the user when closing the launcher WHILE downloading or installing an upgrade
    (() => {
      let askBeforeClosing = true;
      window.onbeforeunload = event => {
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
          }, response => {
            if (response === 0) {
              askBeforeClosing = false;
              remote.getCurrentWindow().close();
            }
          });
        }
      };
    })();
    // Listen for the window to move or resize (and update the preferences when it does)
    ipcRenderer.on('window-move', (sender: IpcMessageEvent, x: number, y: number, isMaximized: boolean) => {
      if (!isMaximized) {
        const mw = this.props.preferencesData.mainWindow;
        mw.x = x | 0;
        mw.y = y | 0;
      }
    });
    ipcRenderer.on('window-resize', (sender: IpcMessageEvent, width: number, height: number, isMaximized: boolean) => {
      if (!isMaximized) {
        const mw = this.props.preferencesData.mainWindow;
        mw.width  = width  | 0;
        mw.height = height | 0;
      }
    });
    ipcRenderer.on('window-maximize', (sender: IpcMessageEvent, isMaximized: boolean) => {
      this.props.preferencesData.mainWindow.maximized = isMaximized;
    });
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
      this.state.central.gameImages.addImageFolders(platforms);
      // Load and parse platform XMLs
      this.state.central.games.loadPlatforms()
      .then(() => {
        this.setState({
          central: Object.assign({}, this.state.central, {
            gamesDoneLoading: true,
          })
        });
      })
      .catch((error) => {
        console.error(error);
        this.setState({
          central: Object.assign({}, this.state.central, {
            gamesDoneLoading: true,
            gamesFailedLoading: true,
          })
        });
      });
    })
    .catch((error) => {
      log(error+'');
      this.setState({
        central: Object.assign({}, this.state.central, {
          gamesDoneLoading: true,
          gamesFailedLoading: true,
        })
      });
    });
    //
    readUpgradeFile(fullFlashpointPath)
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
  }

  componentDidMount() {
    // Request all log entires
    window.External.log.refreshEntries();
  }

  componentDidUpdate(prevProps: IAppProps, prevState: IAppState) {
    if (prevState.wasNewGameClicked) {
      this.setState({ wasNewGameClicked: false });
    }
    // Update preference "lastSelectedLibrary"
    const gameLibraryRoute = getBrowseSubPath(this.props.location.pathname);
    if (this.props.location.pathname.startsWith(Paths.BROWSE) &&
        this.props.preferencesData.lastSelectedLibrary !== gameLibraryRoute) {
      this.props.updatePreferences({ lastSelectedLibrary: gameLibraryRoute });
    }
  }

  render() {
    const route = getBrowseSubPath(this.props.location.pathname);
    // Get game count (or undefined if no games are yet found)
    let gameCount: number|undefined;
    if (this.state.central.gamesDoneLoading) {
      gameCount = this.state.central.games.collection.games.length;
    }
    // Props to set to the router
    const routerProps: IAppRouterProps = {
      central: this.state.central,
      order: this.state.order,
      gameScale: this.state.gameScale,
      gameLayout: this.state.gameLayout,
      selectedGame: this.state.selectedGames[route],
      selectedPlaylist: this.state.selectedPlaylists[route],
      onSelectGame: this.onSelectGame,
      onSelectPlaylist: this.onSelectPlaylist,
      wasNewGameClicked: this.state.wasNewGameClicked,
      onDownloadTechUpgradeClick: this.onDownloadTechUpgradeClick,
      onDownloadScreenshotsUpgradeClick: this.onDownloadScreenshotsUpgradeClick,
      gameLibraryRoute: route,
    };
    // Render
    return (
      <>
        {/* "TitleBar" stuff */}
        { window.External.config.data.useCustomTitlebar ? (
          <TitleBar title={`${AppConstants.appTitle} (${AppConstants.appVersionString})`} />
        ) : undefined }
        {/* "Header" stuff */}
        <HeaderContainer onOrderChange={this.onOrderChange}
                         onToggleLeftSidebarClick={this.onToggleLeftSidebarClick}
                         onToggleRightSidebarClick={this.onToggleRightSidebarClick} />
        {/* "Main" / "Content" stuff */}
        <div className='main'>
          <AppRouter {...routerProps} />
          <noscript className='nojs'>
            <div style={{textAlign:'center'}}>
              This website requires JavaScript to be enabled.
            </div>
          </noscript>
        </div>
        {/* "Footer" stuff */}
        <ConnectedFooter gameCount={gameCount}
                         onScaleSliderChange={this.onScaleSliderChange} scaleSliderValue={this.state.gameScale}
                         onLayoutChange={this.onLayoutSelectorChange} layout={this.state.gameLayout}
                         onNewGameClick={this.onNewGameClick} />
      </>
    );
  }

  private onOrderChange = (event: IGameOrderChangeEvent): void => {
    this.setState({ order: event });
  }

  private onScaleSliderChange = (value: number): void => {
    this.setState({ gameScale: value });
    // Update Preferences Data (this is to make it get saved on disk)
    this.props.updatePreferences({ browsePageGameScale: value });
  }

  private onLayoutSelectorChange = (value: BrowsePageLayout): void => {
    this.setState({ gameLayout: value });
    // Update Preferences Data (this is to make it get saved on disk)
    this.props.updatePreferences({ browsePageLayout: value });
  }

  private onNewGameClick = (): void => {
    const route = getBrowseSubPath(this.props.location.pathname);
    this.setState({
      wasNewGameClicked: true,
      selectedGames: deleteMapProp(copyMap(this.state.selectedGames), route)
    });
  }

  private onToggleLeftSidebarClick = (): void => {
    this.props.updatePreferences({ browsePageShowLeftSidebar: !this.props.preferencesData.browsePageShowLeftSidebar });
    this.forceUpdate();
  }

  private onToggleRightSidebarClick = (): void => {
    this.props.updatePreferences({ browsePageShowRightSidebar: !this.props.preferencesData.browsePageShowRightSidebar });
    this.forceUpdate();
  }

  private onSelectGame = (game?: IGameInfo): void => {
    const route = getBrowseSubPath(this.props.location.pathname);
    this.setState({ selectedGames: setMapProp(copyMap(this.state.selectedGames), route, game) });
  }

  private onSelectPlaylist = (playlist?: IGamePlaylist): void => {
    const { selectedGames, selectedPlaylists } = this.state;
    const route = getBrowseSubPath(this.props.location.pathname);
    this.setState({
      selectedPlaylists: setMapProp(copyMap(selectedPlaylists), route, playlist),
      selectedGames: deleteMapProp(copyMap(selectedGames), route),
    });
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
}

function downloadAndInstallStage(stage: IUpgradeStage, filename: string, setStageState: (stage: Partial<UpgradeStageState>) => void) {
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
