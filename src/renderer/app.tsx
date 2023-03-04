import { Game } from '@database/entity/Game';
import * as remote from '@electron/remote';
import { BackIn, BackInit, BackOut } from '@shared/back/types';
import { APP_TITLE, VIEW_PAGE_SIZE } from '@shared/constants';
import { CustomIPC, IService, ProcessState, WindowIPC } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { memoizeOne } from '@shared/memoize';
import { updatePreferencesData } from '@shared/preferences/util';
import { setTheme } from '@shared/Theme';
import { getFileServerURL, recursiveReplace, sizeToString } from '@shared/Util';
import { arrayShallowStrictEquals } from '@shared/utils/compare';
import { debounce } from '@shared/utils/debounce';
import { clipboard, ipcRenderer, Menu, MenuItemConstructorOptions } from 'electron';
import { AppUpdater } from 'electron-updater';
import { DialogField, DialogState, Playlist, PlaylistGame } from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Dispatch } from 'redux';
import uuid = require('uuid');
import * as which from 'which';
import { FloatingContainer } from './components/FloatingContainer';
import { GameOrderChangeEvent } from './components/GameOrder';
import { InputField } from './components/InputField';
import { MetaEditExporter, MetaEditExporterConfirmData } from './components/MetaEditExporter';
import { OpenIcon } from './components/OpenIcon';
import { placeholderProgressData, ProgressBar } from './components/ProgressComponents';
import { ResizableSidebar, SidebarResizeEvent } from './components/ResizableSidebar';
import { SimpleButton } from './components/SimpleButton';
import { SplashScreen } from './components/SplashScreen';
import { TaskBar } from './components/TaskBar';
import { TitleBar } from './components/TitleBar';
import { ConnectedFooter } from './containers/ConnectedFooter';
import { ConnectedRightBrowseSidebar } from './containers/ConnectedRightBrowseSidebar';
import HeaderContainer from './containers/HeaderContainer';
import { WithCurateStateProps } from './containers/withCurateState';
import { WithMainStateProps } from './containers/withMainState';
import { WithPreferencesProps } from './containers/withPreferences';
import { WithTagCategoriesProps } from './containers/withTagCategories';
import { WithTasksProps } from './containers/withTasks';
import { CreditsFile } from './credits/CreditsFile';
import { UpdateView } from './interfaces';
import { Paths } from './Paths';
import { AppRouter, AppRouterProps } from './router';
import { CurateActionType } from './store/curate/enums';
import { CurateAction } from './store/curate/types';
import { MainActionType, RequestState } from './store/main/enums';
import { RANDOM_GAME_ROW_COUNT } from './store/main/reducer';
import { MainAction, MainState } from './store/main/types';
import { SearchQuery } from './store/search';
import { getBrowseSubPath, getGamePath, joinLibraryRoute } from './Util';
import { LangContext } from './util/lang';
import { queueOne } from './util/queue';

// Hide the right sidebar if the page is inside these paths
const hiddenRightSidebarPages = [Paths.ABOUT, Paths.CURATE, Paths.CONFIG, Paths.MANUAL, Paths.LOGS, Paths.TAGS, Paths.CATEGORIES];

const autoUpdater: AppUpdater = remote.require('electron-updater').autoUpdater;

type AppOwnProps = {
  /** Most recent search query. */
  search: SearchQuery;
};

export type AppProps = AppOwnProps & RouteComponentProps & WithPreferencesProps & WithTagCategoriesProps & WithMainStateProps & WithTasksProps & WithCurateStateProps;

export class App extends React.Component<AppProps> {
  appRef: React.RefObject<HTMLDivElement>;

  constructor(props: AppProps) {
    super(props);

    this.appRef = React.createRef();

    // Initialize app
    this.init();
  }

  registerIpcListeners() {
    const handleProtocol = (url: string) => {
      const parts = url.split('/');
      log.debug('Launcher', 'Handling Protocol - ' + url);
      if (parts.length > 2) {
      // remove "flashpoint:" and "" elements
        parts.splice(0, 2);
        switch (parts[0]) {
          case 'open': {
            if (parts.length >= 2) {
              // Open game in sidebar
              window.Shared.back.request(BackIn.GET_GAME, parts[1])
              .then(game => {
                if (game) {
                  this.props.setMainState({
                    currentGame: game,
                    selectedGameId: game.id,
                    selectedPlaylistId: undefined,
                    currentPlaylist: undefined,
                    currentPlaylistEntry: undefined
                  });
                } else { log.error('Launcher', `Failed to get game. Game is undefined (GameID: "${parts[1]}").`); }
              });
            }
            break;
          }
          case 'run': {
            if (parts.length >= 2) {
              window.Shared.back.request(BackIn.GET_GAME, parts[1])
              .then(async (game) => {
                if (game) {
                // Open game in sidebar
                  this.props.setMainState({
                    currentGame: game,
                    selectedGameId: game.id,
                    selectedPlaylistId: undefined,
                    currentPlaylist: undefined,
                    currentPlaylistEntry: undefined
                  });
                  // Launch game
                  await this.onGameLaunch(game.id);
                  // Update game data (install state)
                  if (game && game.activeDataId) {
                    window.Shared.back.request(BackIn.GET_GAME_DATA, game.activeDataId)
                    .then((gameData) => {
                      if (gameData) {
                        log.debug('TEST', JSON.stringify(gameData, undefined, 2));
                        this.props.dispatchMain({
                          type: MainActionType.FORCE_UPDATE_GAME_DATA,
                          gameData
                        });
                      }
                    });
                  }
                } else { log.error('Launcher', `Failed to get game. Game is undefined (GameID: "${parts[1]}").`); }
              });
            }
            break;
          }
          default:
            ipcRenderer.invoke(CustomIPC.SHOW_SAVE_DIALOG, { title: 'Protocol Error', message: `Unsupported action "${parts[0]}"` });
            break;
        }
      }
    };
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
    ipcRenderer.on(WindowIPC.PROTOCOL, (sender, url: string) => {
      handleProtocol(url);
    });
    // Displays main proc output
    ipcRenderer.on(WindowIPC.MAIN_OUTPUT, (sender, output: string) => {
      this.props.setMainState({
        mainOutput: output
      });
    });

    // if (window.Shared.url) {
    //   handleProtocol(window.Shared.url);
    // }
  }

  registerWebsocketListeners() {
    window.Shared.back.register(BackOut.INIT_EVENT, (event, data) => {
      for (const index of data.done) {
        switch (+index) { // Conversion to number, type safe bug
          case BackInit.DATABASE: {
            window.Shared.back.request(BackIn.GET_PLAYLISTS)
            .then(data => {
              if (data) {
                this.props.setMainState({ playlists: data });
                this.cachePlaylistIcons(data);
              }
              this.props.dispatchMain({
                type: MainActionType.ADD_LOADED,
                loaded: [BackInit.PLAYLISTS],
              });
            });
            window.Shared.back.request(BackIn.GET_RENDERER_LOADED_DATA)
            .then(data => {
              this.props.dispatchMain({
                type: MainActionType.SET_STATE,
                payload: {
                  ...data
                }
              });
              this.props.dispatchMain({
                type: MainActionType.SETUP_VIEWS,
                preferencesData: { ...this.props.preferencesData }
              });
              this.props.setTagCategories(data.tagCategories);
            })
            .then(async () => {
              const data = await window.Shared.back.request(BackIn.GET_GAMES_TOTAL);
              if (data) {
                this.props.dispatchMain({
                  type: MainActionType.SET_GAMES_TOTAL,
                  total: data,
                });
              }
            })
            .then(() => {
              if (this.props.main.randomGames.length < RANDOM_GAME_ROW_COUNT) { this.rollRandomGames(true); }
            })
            .then(() => {
              this.props.dispatchMain({
                type: MainActionType.ADD_LOADED,
                loaded: [index],
              });
            });
            break;
          }
          case BackInit.CURATE: {
            window.Shared.back.request(BackIn.CURATE_GET_LIST)
            .then(curations => {
              (this.props.dispatchMain as any as Dispatch<CurateAction>)({
                type: CurateActionType.SET_ALL_CURATIONS,
                curations: curations,
              });
              this.props.dispatchMain({
                type: MainActionType.ADD_LOADED,
                loaded: [index],
              });
            });
            break;
          }
          case BackInit.EXTENSIONS: {
            window.Shared.back.request(BackIn.GET_RENDERER_EXTENSION_INFO)
            .then(data => {
              this.props.dispatchMain({
                type: MainActionType.SET_STATE,
                payload: {
                  ...data
                }
              });
              this.props.dispatchMain({
                type: MainActionType.ADD_LOADED,
                loaded: [index],
              });
            });
            break;
          }
          default: {
            this.props.dispatchMain({
              type: MainActionType.ADD_LOADED,
              loaded: [index],
            });
          }
        }
      }
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

    window.Shared.back.register(BackOut.UPDATE_COMPONENT_STATUSES, (event, statuses) => {
      this.props.setMainState({
        componentStatuses: statuses
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

    window.Shared.back.register(BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG, () => {
      this.props.setMainState({ downloadOpen: true, downloadVerifying: false, downloadPercent: 0 });
    });

    window.Shared.back.register(BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG, () => {
      this.props.setMainState({ downloadOpen: false, downloadPercent: 0 });
    });

    window.Shared.back.register(BackOut.CURATE_CONTENTS_CHANGE, (event, folder, contents) => {
      (this.props.dispatchMain as any as Dispatch<CurateAction>)({
        type: CurateActionType.SET_CONTENTS,
        folder,
        contents
      });
    });

    window.Shared.back.register(BackOut.CURATE_LIST_CHANGE, (event, added, removed) => {
      (this.props.dispatchMain as any as Dispatch<CurateAction>)({
        type: CurateActionType.APPLY_DELTA,
        added,
        removed,
      });
    });

    window.Shared.back.register(BackOut.CURATE_SELECT_LOCK, (event, folder, locked) => {
      (this.props.dispatchMain as any as Dispatch<CurateAction>)({
        type: CurateActionType.SET_LOCK,
        folders: [folder],
        locked,
      });
    });

    window.Shared.back.register(BackOut.CURATE_SELECT_CURATIONS, (event, folders) => {
      const selectable = folders.filter(f => this.props.curate.curations.findIndex(c => c.folder === f) !== -1);
      (this.props.dispatchMain as any as Dispatch<CurateAction>)({
        type: CurateActionType.SET_SELECTED_CURATIONS,
        folders: selectable
      });
    });

    window.Shared.back.register(BackOut.UPDATE_TASK, (event, taskId, taskData) => {
      // I don't know why length works with 1, don't change it
      if (!this.props.main.taskBarOpen && this.props.tasks.length === 1) {
        // Show task bar for first task added
        this.props.setMainState({ taskBarOpen: true });
      }
      this.props.setTask(taskId, taskData);
    });

    window.Shared.back.register(BackOut.CREATE_TASK, (event, task) => {
      // I don't know why length works with 1, don't change it
      if (!this.props.main.taskBarOpen && this.props.tasks.length === 1) {
        // Show task bar for first task added
        this.props.setMainState({ taskBarOpen: true });
      }
      this.props.addTask(task);
    });

    window.Shared.back.register(BackOut.FOCUS_WINDOW, () => {
      window.focus();
    });

    window.Shared.back.register(BackOut.NEW_DIALOG, (event, dialog, code) => {
      const d: DialogState = {
        ...dialog,
        id: uuid()
      };
      this.props.dispatchMain({
        type: MainActionType.NEW_DIALOG,
        dialog: d
      });
      window.Shared.back.send(BackIn.NEW_DIALOG_RESPONSE, d.id, code);
    });

    window.Shared.back.register(BackOut.CANCEL_DIALOG, (event, dialogId) => {
      this.props.dispatchMain({
        type: MainActionType.CANCEL_DIALOG,
        dialogId
      });
    });
  }

  init() {
    const strings = this.props.main.lang;

    window.Shared.back.onStateChange = (state) => {
      this.props.setMainState({
        socketOpen: state
      });
    };

    // Warn the user when closing the launcher WHILE downloading or installing an upgrade
    (() => {
      let askBeforeClosing = true;
      window.onbeforeunload = (event: BeforeUnloadEvent) => {
        if (this.props.main.quitting) {
          return;
        }
        event.returnValue = false;
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

    this.registerIpcListeners();
    this.registerWebsocketListeners();

    window.Shared.back.request(BackIn.INIT_LISTEN)
    .then(data => {
      if (!data) { throw new Error('INIT_LISTEN response is missing data.'); }
      this.props.dispatchMain({
        type: MainActionType.ADD_LOADED,
        loaded: data.done,
      });
    });

    // Cache playlist icons (if they are loaded)
    // if (this.props.main.playlists.length > 0) { this.cachePlaylistIcons(this.props.main.playlists); }

    // -- Stuff that should probably be moved to the back --

    // Load Upgrades
    // const folderPath = window.Shared.isDev
    //   ? process.cwd()
    //   : path.dirname(remote.app.getPath('exe'));
    // const upgradeCatch = (error: Error) => { console.warn(error); };
    // const launcherLogFunc = (message: string) => {
    //   log.warn('Launcher', message);
    // };
    // Promise.all([UpgradeFile.readFile(folderPath, launcherLogFunc), UpgradeFile.readFile(fullJsonFolderPath, launcherLogFunc)].map(p => p.catch(upgradeCatch)))
    // .then(async (fileData) => {
    //   // Combine all file data
    //   let allData: UpgradeStage[] = [];
    //   for (const data of fileData) {
    //     if (data) {
    //       allData = allData.concat(data);
    //     }
    //   }
    //   this.props.dispatchMain({
    //     type: MainActionType.SET_UPGRADES,
    //     upgrades: allData,
    //   });
    //   const isValid = await isFlashpointValidCheck(window.Shared.config.data.flashpointPath);
    //   // Notify of downloading initial data (if available)
    //   if (!isValid && allData.length > 0) {
    //     remote.dialog.showMessageBox({
    //       type: 'info',
    //       title: strings.dialog.dataRequired,
    //       message: strings.dialog.dataRequiredDesc,
    //       buttons: [strings.misc.yes, strings.misc.no]
    //     })
    //     .then((res) => {
    //       if (res.response === 0) {
    //         this.onDownloadUpgradeClick(allData[0], strings);
    //       }
    //     });
    //   }
    //   // Do existance checks on all upgrades
    //   await Promise.all(allData.map(async upgrade => {
    //     const baseFolder = fullFlashpointPath;
    //     // Perform install checks
    //     const installed = await checkUpgradeStateInstalled(upgrade, baseFolder);
    //     this.setUpgradeStageState(upgrade.id, {
    //       alreadyInstalled: installed,
    //       checksDone: true
    //     });
    //     // If installed, check for updates
    //     if (installed) {
    //       const upToDate = await checkUpgradeStateUpdated(upgrade, baseFolder);
    //       this.setUpgradeStageState(upgrade.id, {
    //         upToDate: upToDate
    //       });
    //     }
    //   }));
    // });

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

    // Check for PHP on Linux
    if (process.platform === 'linux') {
      which('php', function(err: Error | null) {
        if (err) {
          log.warn('Launcher', 'Warning: PHP not found in path, may cause unexpected behaviour.');
          ipcRenderer.invoke(CustomIPC.SHOW_MESSAGE_BOX, {
            type: 'error',
            title: strings.dialog.programNotFound,
            message: strings.dialog.phpNotFound,
            buttons: ['Ok']
          });
        }
      });
    }

    // this.props.setTagCategories(window.Shared.initialTagCategories);
  }

  componentDidMount() {
    // Call first batch of random games
    // if (this.props.main.randomGames.length < RANDOM_GAME_ROW_COUNT) { this.rollRandomGames(true); }
  }

  componentDidUpdate(prevProps: AppProps) {
    if (this.props.main.loadedAll.isOpen) {
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
          JSON.stringify(view.tagFilters)   !== JSON.stringify(this.props.preferencesData.tagFilters) ||
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

      // Check for selected game changes

      // Check if it started or ended editing
      if (this.props.main.isEditingGame != prevProps.main.isEditingGame) {
        this.updateCurrentGame(this.props.main.selectedGameId, this.props.main.selectedPlaylistId);
      }
      // Update current game and add-apps if the selected game changes
      if (this.props.main.selectedGameId && this.props.main.selectedGameId !== prevProps.main.selectedGameId) {
        this.updateCurrentGame(this.props.main.selectedGameId, this.props.main.selectedPlaylistId);
        this.props.setMainState({ isEditingGame: false });
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
              type: MainActionType.SET_SELECTED_GAME,
              library: route,
              gameId: undefined,
            });
          }
        } else {
          history.push(joinLibraryRoute(route));
        }
      }
    }
  }

  getGameBrowserDivWidth(): number {
    if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
    if (!this.appRef.current) { throw new Error('"game-browser" div is missing.'); }
    return parseInt(document.defaultView.getComputedStyle(this.appRef.current).width || '', 10);
  }

  onRightSidebarResize = (event: SidebarResizeEvent): void => {
    const maxWidth = (this.getGameBrowserDivWidth() - this.props.preferencesData.browsePageLeftSidebarWidth) - 5;
    const targetWidth = event.startWidth + event.startX - event.event.clientX;
    updatePreferencesData({
      browsePageRightSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  };

  onGameLaunch = async (gameId: string): Promise<void> => {
    log.debug('Launcher', 'Launching Game - ' + gameId);
    this.props.dispatchMain({
      type: MainActionType.BUSY_GAME,
      gameId
    });
    await window.Shared.back.request(BackIn.LAUNCH_GAME, gameId)
    .finally(() => {
      this.props.dispatchMain({
        type: MainActionType.UNBUSY_GAME,
        gameId
      });
    });
  };

  onDeleteSelectedGame = async (): Promise<void> => {
    // Delete the game
    if (this.props.main.selectedGameId) {
      this.onDeleteGame(this.props.main.selectedGameId);
    }
    // Deselect the game
    this.onSelectGame(undefined);
    // Reset the state related to the selected game
    this.props.setMainState({
      currentGame: undefined,
      selectedGameId: undefined,
      currentPlaylistEntry: undefined,
      isEditingGame: false
    });
    // Focus the game grid/list
    // this.focusGameGridOrList();
  };

  onEditGame = (game: Partial<Game>) => {
    log.debug('Launcher', `Editing: ${JSON.stringify(game)}`);
    if (this.props.main.currentGame) {
      const newGame = new Game();
      Object.assign(newGame, {...this.props.main.currentGame, ...game});
      newGame.updateTagsStr();
      this.props.setMainState({
        currentGame: newGame
      });
    }
  };

  onSaveEditClick = async (): Promise<void> => {
    if (!this.props.main.currentGame) {
      console.error('Can\'t save game. "currentGame" is missing.');
      return;
    }
    const game = await this.onSaveGame(this.props.main.currentGame, this.props.main.currentPlaylistEntry);
    this.props.setMainState({
      currentGame: game == null ? undefined : game,
      isEditingGame: false
    });
    // this.focusGameGridOrList();
  };

  onDiscardEditClick = (): void => {
    this.props.setMainState({
      isEditingGame: false,
      currentGame: this.props.main.currentGame,
    });
    // this.focusGameGridOrList();
  };

  onStartEditClick = (): void => {
    if (this.props.preferencesData.enableEditing) {
      this.props.setMainState({ isEditingGame: true });
    }
  };

  onEditPlaylistNotes = (text: string): void => {
    if (this.props.main.currentPlaylistEntry) {
      this.props.setMainState({
        currentPlaylistEntry: {
          ...this.props.main.currentPlaylistEntry,
          notes: text
        }
      });
    }
  };

  onUpdateActiveGameData = (activeDataOnDisk: boolean, activeDataId?: number): void => {
    if (this.props.main.currentGame) {
      const newGame = new Game();
      Object.assign(newGame, {...this.props.main.currentGame, activeDataOnDisk, activeDataId });
      window.Shared.back.request(BackIn.SAVE_GAME, newGame)
      .then(() => {
        if (this.props.main.currentGame) {
          const newGame = new Game();
          Object.assign(newGame, {...this.props.main.currentGame, activeDataOnDisk, activeDataId });
          this.props.setMainState({ currentGame: newGame });
        }
      });
    }
  };

  onRemoveSelectedGameFromPlaylist = async (): Promise<void> => {
    // Remove game from playlist
    if (this.props.main.currentGame) {
      if (this.props.main.selectedPlaylistId) {
        await window.Shared.back.request(BackIn.DELETE_PLAYLIST_GAME, this.props.main.selectedPlaylistId, this.props.main.currentGame.id);
      } else { logError('No playlist is selected'); }
    } else { logError('No game is selected'); }

    // Deselect the game
    this.onSelectGame(undefined);

    // Reset the state related to the selected game
    this.props.setMainState({
      currentGame: undefined,
      currentPlaylistEntry: undefined,
      isEditingGame: false
    });

    if (this.props.main.selectedPlaylistId) {
      this.onUpdatePlaylistById(this.props.main.selectedPlaylistId);
    }

    function logError(text: string) {
      console.error('Unable to remove game from selected playlist - ' + text);
    }
  };

  /** Deselect without clearing search (Right sidebar will search itself) */
  onRightSidebarDeselectPlaylist = (): void => {
    this.onSelectPlaylist(getBrowseSubPath(this.props.location.pathname), null);
  };

  /** Replace the "current game" with the selected game (in the appropriate circumstances). */
  updateCurrentGame = queueOne(async (gameId?: string, playlistId?: string): Promise<void> => {
    // Find the selected game in the selected playlist
    if (gameId) {
      let gamePlaylistEntry: PlaylistGame | null;

      if (playlistId) {
        gamePlaylistEntry = await window.Shared.back.request(BackIn.GET_PLAYLIST_GAME, playlistId, gameId);
      }

      // Update game
      window.Shared.back.request(BackIn.GET_GAME, gameId)
      .then(game => {
        if (game) {
          this.props.setMainState({
            currentGame: game,
            currentPlaylistEntry: gamePlaylistEntry == null ? undefined : gamePlaylistEntry
          });
        } else { console.log(`Failed to get game. Game is undefined (GameID: "${gameId}").`); }
      });
    }
  });

  private onGameContextMenuMemo = memoizeOne((playlists: Playlist[], strings: LangContainer, selectedPlaylistId?: string) => {
    return (gameId: string) => {
      let contextButtons: MenuItemConstructorOptions[] = [
        {
          label: strings.menu.addToFavorites,
          enabled: playlists.filter(p => p.title.includes('Favorites')).length > 0,
          click: () => {
            const playlistId = playlists.filter(p => p.title.includes('Favorites'))[0].id;
            window.Shared.back.send(BackIn.ADD_PLAYLIST_GAME, playlistId, gameId);
          }
        },
        {
          type: 'submenu',
          label: strings.menu.addToPlaylist,
          enabled: playlists.length > 0,
          submenu: UniquePlaylistMenuFactory(playlists,
            strings,
            (playlistId) => window.Shared.back.send(BackIn.ADD_PLAYLIST_GAME, playlistId, gameId),
            selectedPlaylistId)
        }, {
        /* File Location */
          label: strings.menu.openFileLocation,
          enabled: !window.Shared.isBackRemote, // (Local "back" only)
          click: () => {
            window.Shared.back.request(BackIn.GET_GAME, gameId)
            .then(async (game) => {
              if (game) {
                const gamePath = await getGamePath(game, window.Shared.config.fullFlashpointPath, window.Shared.preferences.data.htdocsFolderPath, window.Shared.preferences.data.dataPacksFolderPath);
                try {
                  if (gamePath) {
                    await fs.promises.stat(gamePath);
                    remote.shell.showItemInFolder(gamePath);
                  } else {
                    const opts: Electron.MessageBoxOptions = {
                      type: 'warning',
                      message: 'GameData has not been downloaded yet, cannot open the file location!',
                      buttons: ['Ok'],
                    };
                    ipcRenderer.invoke(CustomIPC.SHOW_MESSAGE_BOX, opts);
                    return;
                  }
                } catch (error: any) {
                  const opts: Electron.MessageBoxOptions = {
                    type: 'warning',
                    message: '',
                    buttons: ['Ok'],
                  };
                  if (error.code === 'ENOENT') {
                    opts.title = this.context.dialog.fileNotFound;
                    opts.message = (
                      'Failed to find the game file.\n'+
                    'If you are using Flashpoint Infinity, make sure you download the game first.\n'
                    );
                  } else {
                    opts.title = 'Unexpected error';
                    opts.message = (
                      'Failed to check the game file.\n'+
                    'If you see this, please report it back to us (a screenshot would be great)!\n\n'+
                    `Error: ${error}\n`
                    );
                  }
                  opts.message += `Path: "${gamePath}"\n\nNote: If the path is too long, some portion will be replaced with three dots ("...").`;
                  ipcRenderer.invoke(CustomIPC.SHOW_MESSAGE_BOX, opts);
                }
              }
            });
          },
        }, {
        /* Copy Game UUID */
          label: strings.menu.copyGameUUID,
          enabled: true,
          click : () => {
            clipboard.writeText(gameId);
          }
        }, { type: 'separator' }];

      // Add editing mode fields
      if (this.props.preferencesData.enableEditing) {
        const editingButtons: MenuItemConstructorOptions[] = [
          {
            /* Duplicate Meta */
            label: strings.menu.duplicateMetaOnly,
            enabled: this.props.preferencesData.enableEditing,
            click: () => { window.Shared.back.request(BackIn.DUPLICATE_GAME, gameId, false); },
          }, {
            /* Duplicate Meta & Images */
            label: strings.menu.duplicateMetaAndImages, // ("&&" will be shown as "&")
            enabled: this.props.preferencesData.enableEditing,
            click: () => { window.Shared.back.request(BackIn.DUPLICATE_GAME, gameId, true); },
          }, {
            /* Load as a curation */
            label: strings.menu.makeCurationFromGame,
            enabled: this.props.preferencesData.enableEditing,
            click: () => {
              window.Shared.back.request(BackIn.CURATE_FROM_GAME, gameId)
              .then((folder) => {
                if (folder) {
                  // Select the new curation
                  this.props.dispatchCurate({
                    type: CurateActionType.SET_CURRENT_CURATION,
                    folder
                  });
                  // Redirect to Curate once it's been made
                  this.props.history.push(Paths.CURATE);
                } else {
                  ipcRenderer.invoke(CustomIPC.SHOW_MESSAGE_BOX, {
                    title: 'Failed to create curation',
                    message: 'Failed to create curation from this game. No error provided.'
                  });
                }
              })
              .catch((err: any) => {
                ipcRenderer.invoke(CustomIPC.SHOW_MESSAGE_BOX, {
                  title: 'Failed to create curation',
                  message: `Failed to create curation from this game.\nError: ${err.toString()}`
                });
              });
            }
          }, { type: 'separator' }, {
            /* Export Meta */
            label: strings.menu.exportMetaOnly,
            enabled: !window.Shared.isBackRemote, // (Local "back" only)
            click: () => {
              const filePath = remote.dialog.showSaveDialogSync({
                title: strings.dialog.selectFileToExportMeta,
                defaultPath: 'meta.yaml',
                filters: [{
                  name: 'Meta file',
                  extensions: ['yaml'],
                }]
              });
              if (filePath) { window.Shared.back.request(BackIn.EXPORT_GAME, gameId, filePath, true); }
            },
          }, {
            /* Export Meta & Images */
            label: strings.menu.exportMetaAndImages, // ("&&" will be shown as "&")
            enabled: !window.Shared.isBackRemote, // (Local "back" only)
            click: () => {
              const filePaths = window.Shared.showOpenDialogSync({
                title: strings.dialog.selectFolderToExportMetaAndImages,
                properties: ['promptToCreate', 'openDirectory']
              });
              if (filePaths && filePaths.length > 0) {
                window.Shared.back.request(BackIn.EXPORT_GAME, gameId, filePaths[0], false);
              }
            },
          }, {
            /* Export Partial Meta */
            label: strings.menu.exportMetaEdit, // ("&&" will be shown as "&")
            enabled: !window.Shared.isBackRemote, // (Local "back" only)
            click: () => {
              this.onOpenExportMetaEdit(gameId);
            },
          }, {  type: 'separator' }
        ];
        contextButtons = contextButtons.concat(editingButtons);
      }

      // Add extension contexts
      for (const contribution of this.props.main.contextButtons) {
        for (const contextButton of contribution.value) {
          if (contextButton.context === 'game') {
            contextButtons.push({
              label: contextButton.name,
              click: () => {
                window.Shared.back.request(BackIn.GET_GAME, gameId)
                .then((game) => {
                  window.Shared.back.request(BackIn.RUN_COMMAND, contextButton.command, [game]);
                });
              }
            });
          }
        }
      }

      return (
        openContextMenu(contextButtons)
      );
    };
  });

  copyCrashLog = () => {
    clipboard.writeText(this.props.main.mainOutput || '');
  };

  render() {
    const libraryPath = getBrowseSubPath(this.props.location.pathname);
    const view = this.props.main.views[libraryPath];
    const playlists = this.filterAndOrderPlaylistsMemo(this.props.main.playlists, libraryPath);
    const extremeTags = this.props.preferencesData.tagFilters.filter(t => !t.enabled && t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);

    // Props to set to the router
    const routerProps: AppRouterProps = {
      gotdList: this.props.main.gotdList,
      games: view && view.games || {},
      randomGames: this.props.main.randomGames,
      rollRandomGames: this.rollRandomGames,
      updateView: this.updateView,
      gamesTotal: this.props.main.gamesTotal,
      viewGamesTotal: view && view.total,
      allPlaylists: this.props.main.playlists,
      playlists: playlists,
      suggestions: this.props.main.suggestions,
      appPaths: this.props.main.appPaths,
      platforms: this.props.main.platforms,
      platformsFlat: this.flattenPlatformsMemo(this.props.main.platforms),
      playlistIconCache: this.props.main.playlistIconCache,
      onGameContextMenu: this.onGameContextMenuMemo(this.props.main.playlists, this.props.main.lang, this.props.main.selectedPlaylistId),
      onSaveGame: this.onSaveGame,
      onDeleteGame: this.onDeleteGame,
      onLaunchGame: this.onGameLaunch,
      onOpenExportMetaEdit: this.onOpenExportMetaEdit,
      libraries: this.props.main.libraries,
      serverNames: this.props.main.serverNames,
      mad4fpEnabled: this.props.main.mad4fpEnabled,
      localeCode: this.props.main.localeCode,
      devConsole: this.props.main.devConsole,
      creditsData: this.props.main.creditsData,
      creditsDoneLoading: this.props.main.creditsDoneLoading,
      selectedGameId: this.props.main.selectedGameId,
      gameRunning: this.checkGameRunningMemo(this.props.main.selectedGameId, this.props.main.services),
      selectedPlaylistId: this.props.main.selectedPlaylistId,
      onSelectGame: this.onSelectGame,
      onDeletePlaylist: this.onPlaylistDelete,
      onUpdatePlaylist: this.onUpdatePlaylist,
      onSelectPlaylist: this.onSelectPlaylist,
      wasNewGameClicked: this.props.main.wasNewGameClicked,
      gameLibrary: libraryPath,
      themeList: this.props.main.themeList,
      languages: this.props.main.langList,
      updateInfo: this.props.main.updateInfo,
      autoUpdater: autoUpdater,
      extensions: this.props.main.extensions,
      devScripts: this.props.main.devScripts,
      contextButtons: this.props.main.contextButtons,
      curationTemplates: this.props.main.curationTemplates,
      logoSets: this.props.main.logoSets,
      extConfigs: this.props.main.extConfigs,
      extConfig: this.props.main.extConfig,
      logoVersion: this.props.main.logoVersion,
      services: this.props.main.services,
      manualUrl: this.props.preferencesData.onlineManual || pathToFileUrl(path.join(window.Shared.config.fullFlashpointPath, this.props.preferencesData.offlineManual)),
      updateFeedMarkdown: this.props.main.updateFeedMarkdown,
      componentStatuses: this.props.main.componentStatuses,
      openFlashpointManager: this.openFlashpointManager,
    };

    // Render
    return (
      <LangContext.Provider value={this.props.main.lang}>
        { !this.props.main.stopRender ? (
          <>
            {/* Backend Crash Log and Report */}
            { !this.props.main.socketOpen && !this.props.main.mainOutput && (
              <FloatingContainer>
                <div className='main-output-header'>Disconnected from Backend</div>
                <div>Reconnecting...</div>
              </FloatingContainer>
            )}
            { this.props.main.mainOutput && (
              <FloatingContainer>
                <div className='main-output-header'>Backend Crash Log</div>
                <div className='main-output-content'>{this.props.main.mainOutput}</div>
                <div className='main-output-buttons'>
                  <SimpleButton
                    value={'Copy Crash Log'}
                    onClick={this.copyCrashLog}/>
                  <SimpleButton
                    value={'Restart Launcher'}
                    onClick={() => {
                      this.props.setMainState({
                        quitting: true
                      });
                      window.Shared.restart();
                    }}/>
                </div>
              </FloatingContainer>
            )}
            {/* First Open Dialog */}
            { this.props.main.openDialogs.length > 0 && (
              renderDialogMemo(this.props.main.openDialogs[0], this.props.dispatchMain)
            )}
            {/* Splash screen */}
            <SplashScreen
              quitting={this.props.main.quitting}
              loadedAll={this.props.main.loadedAll.isOpen}
              loaded={this.props.main.loaded} />
            {/* Title-bar (if enabled) */}
            { window.Shared.config.data.useCustomTitlebar ?
              window.Shared.customVersion ? (
                <TitleBar title={window.Shared.customVersion} />
              ) : (
                <TitleBar title={`${APP_TITLE} (${remote.app.getVersion()})`} />
              ) : undefined }
            {/* "Content" */}
            { this.props.main.loadedAll.isOpen ? (
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
                <div className='main'
                  ref={this.appRef} >
                  <AppRouter { ...routerProps } />
                  <noscript className='nojs'>
                    <div style={{textAlign:'center'}}>
                      This website requires JavaScript to be enabled.
                    </div>
                  </noscript>
                  { this.props.main.currentGame && !hiddenRightSidebarPages.reduce((prev, cur) => prev || this.props.history.location.pathname.startsWith(cur), false) && (
                    <ResizableSidebar
                      hide={this.props.preferencesData.browsePageShowRightSidebar}
                      divider='before'
                      width={this.props.preferencesData.browsePageRightSidebarWidth}
                      onResize={this.onRightSidebarResize}>
                      <ConnectedRightBrowseSidebar
                        logoVersion={this.props.main.logoVersion}
                        currentGame={this.props.main.currentGame}
                        isExtreme={this.props.main.currentGame ? this.props.main.currentGame.tags.reduce<boolean>((prev, next) => extremeTags.includes(next.primaryAlias.name), false) : false}
                        gameRunning={routerProps.gameRunning}
                        currentPlaylistEntry={this.props.main.currentPlaylistEntry}
                        currentLibrary={routerProps.gameLibrary}
                        onGameLaunch={this.onGameLaunch}
                        onDeleteSelectedGame={this.onDeleteSelectedGame}
                        onRemoveSelectedGameFromPlaylist={this.onRemoveSelectedGameFromPlaylist}
                        onDeselectPlaylist={this.onRightSidebarDeselectPlaylist}
                        onEditPlaylistNotes={this.onEditPlaylistNotes}
                        isEditing={this.props.main.isEditingGame}
                        isNewGame={false} /* Deprecated */
                        onEditGame={this.onEditGame}
                        onUpdateActiveGameData={this.onUpdateActiveGameData}
                        onEditClick={this.onStartEditClick}
                        onDiscardClick={this.onDiscardEditClick}
                        onSaveGame={this.onSaveEditClick}
                        tagCategories={this.props.tagCategories}
                        suggestions={this.props.main.suggestions}
                        busyGames={this.props.main.busyGames}
                        onOpenExportMetaEdit={this.onOpenExportMetaEdit} />
                    </ResizableSidebar>
                  )}
                </div>
                {/* Tasks - @TODO Find a better way to hide it than behind enableEditing */}
                { this.props.preferencesData.enableEditing && this.props.tasks.length > 0 && (
                  <TaskBar
                    open={this.props.main.taskBarOpen}
                    onToggleOpen={this.onToggleTaskBarOpen} />
                )}
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
  };

  private onToggleLeftSidebarClick = (): void => {
    updatePreferencesData({ browsePageShowLeftSidebar: !this.props.preferencesData.browsePageShowLeftSidebar });
  };

  private onToggleRightSidebarClick = (): void => {
    updatePreferencesData({ browsePageShowRightSidebar: !this.props.preferencesData.browsePageShowRightSidebar });
  };

  private onSelectGame = (gameId?: string): void => {
    this.props.dispatchMain({
      type: MainActionType.SET_SELECTED_GAME,
      gameId: gameId,
    });
  };

  /**
   * Set the selected playlist for a single "browse route"
   *
   * @param library Library view to set the view for
   * @param playlistId Playlist ID to load into the view
   */
  private onSelectPlaylist = (library: string, playlistId: string | null): void => {
    if (playlistId == null) {
      this.setViewQuery(library, null);
    } else {
      const playlist = this.props.main.playlists.find(p => p.id === playlistId);
      this.setViewQuery(library, playlist);
    }
  };

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
  };

  private onUpdatePlaylistById = (playlistId: string) => {
    const playlist = this.props.main.playlists.find(p => p.id === playlistId);
    if (playlist) {
      this.onUpdatePlaylist(playlist);
    }
  };

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
      this.setViewQuery(library, playlist);
    }

    this.props.setMainState(state as any); // (This is very annoying to make typesafe)
  };

  onSaveGame = async (game: Game, playlistEntry?: PlaylistGame): Promise<Game | null> => {
    const data = await window.Shared.back.request(BackIn.SAVE_GAME, game);
    if (playlistEntry) {
      window.Shared.back.send(BackIn.SAVE_PLAYLIST_GAME, this.props.main.selectedPlaylistId || '', playlistEntry);
    }
    this.setViewQuery(game.library);
    return data.game;
  };

  onDeleteGame = (gameId: string): void => {
    const strings = this.props.main.lang;
    const library = getBrowseSubPath(this.props.location.pathname);
    window.Shared.back.request(BackIn.DELETE_GAME, gameId)
    .then(() => { this.setViewQuery(library); })
    .catch((error) => {
      log.error('Launcher', `Error deleting game: ${error}`);
      alert(strings.dialog.unableToDeleteGame + '\n\n' + error);
    });
  };
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
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      })
    );
  });

  private unmountBeforeClose = (): void => {
    setTimeout(() => {
      window.Shared.back.allowDeath();
      this.props.setMainState({
        quitting: true
      });
      window.Shared.back.request(BackIn.QUIT)
      .finally(() => {
        window.close();
      });
    }, 100);
  };

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
   *
   * @param library Library view to set the query for (default to current view)
   * @param playlist Playlist to search
   */
  setViewQuery = (function(this: App, library: string = getBrowseSubPath(this.props.location.pathname), playlist?: Playlist | null): void {
    this.props.dispatchMain({
      type: MainActionType.SET_VIEW_QUERY,
      library: library,
      searchText: this.props.search.text,
      showExtreme: this.props.preferencesData.browsePageShowExtreme,
      orderBy: this.props.preferencesData.gamesOrderBy,
      orderReverse: this.props.preferencesData.gamesOrder,
      searchLimit: this.props.preferencesData.searchLimit,
      playlist: playlist,
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
  };

  onOpenExportMetaEdit = (gameId: string): void => {
    this.props.dispatchMain({
      type: MainActionType.OPEN_META_EXPORTER,
      gameId: gameId,
    });
  };

  onCancelExportMetaEdit = (): void => {
    this.props.dispatchMain({ type: MainActionType.CLOSE_META_EXPORTER });
  };

  onConfirmExportMetaEdit = (data: MetaEditExporterConfirmData): void => {
    this.props.dispatchMain({ type: MainActionType.CLOSE_META_EXPORTER });
    window.Shared.back.send(BackIn.EXPORT_META_EDIT, data.id, data.properties);
  };

  onToggleTaskBarOpen = (): void => {
    this.props.setMainState({ taskBarOpen: !this.props.main.taskBarOpen });
  };

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

  openFlashpointManager = () => {
    this.props.setMainState({
      quitting: true
    });
    window.Shared.back.send(BackIn.OPEN_FLASHPOINT_MANAGER);
  };
}

async function cacheIcon(icon: string): Promise<string> {
  const r = await fetch(icon);
  const blob = await r.blob();
  return `url(${URL.createObjectURL(blob)})`;
}

function onUpdateDownloaded() {
  ipcRenderer.invoke(CustomIPC.SHOW_MESSAGE_BOX, {
    title: 'Installing Update',
    message: 'The Launcher will restart to install the update now.',
    buttons: ['OK']
  }).then(() => {
    console.log('update cb returned');
    console.trace();
    setImmediate(() => autoUpdater.quitAndInstall());
  });
}

function openContextMenu(template: MenuItemConstructorOptions[]): Menu {
  const menu = remote.Menu.buildFromTemplate(template);
  menu.popup({ window: remote.getCurrentWindow() });
  return menu;
}

type MenuItemLibrary = MenuItemConstructorOptions & {
  library: string;
}

function pathToFileUrl(p: string) {
  try {
    return `file:///${path.resolve(p)}`;
  } catch {
    return '';
  }
}

function UniquePlaylistMenuFactory(playlists: Playlist[], strings: LangContainer, onClick: (playlistId: string) => any, selectedPlaylistId?: string): MenuItemConstructorOptions[] {
  const grouped: Array<MenuItemLibrary> = [];
  for (const p of playlists.filter(p => p.id != selectedPlaylistId)) {
    let group = grouped.find(g => g.library === p.library);
    if (!group) {
      group = {
        type: 'submenu',
        library: p.library,
        enabled: true,
        label: strings.libraries[p.library] || p.library,
        submenu: []
      };
      grouped.push(group);
    }
    if (group.submenu && Array.isArray(group.submenu)) {
      group.submenu.push({
        label: p.title || 'No Title',
        enabled: true,
        click: () => onClick(p.id)
      });
    }
  }
  return grouped;
}

function renderDialogMemo(dialog: DialogState, dispatch: Dispatch<MainAction>): JSX.Element {
  return (
    <FloatingContainer>
      <>
        { dialog.userCanCancel && (
          <div className='dialog-cancel-button' onClick={() => {
            dispatch({
              type: MainActionType.CANCEL_DIALOG,
              dialogId: dialog.id
            });
          }}>
            <OpenIcon icon='x'/>
          </div>
        )}
        <div className={`dialog-message ${dialog.largeMessage ? 'dialog-message--large' : ''}`}>{ dialog.message }</div>
        { dialog.fields?.map(f => {
          return (
            <div key={f.name} className='dialog-field'>
              <div className='dialog-field-message'>{ f.message }</div>
              <div className='dialog-field-input'>{renderDialogField(dialog.id, f, dispatch)}</div>
            </div>
          );
        })}
        <div className='dialog-buttons-container'>
          { dialog.buttons.map((b, idx) => {
            return (
              <SimpleButton
                key={b}
                onClick={() => {
                  dispatch({
                    type: MainActionType.RESOLVE_DIALOG,
                    dialogId: dialog.id,
                    button: idx
                  });
                }}
                value={b}/>
            );
          })}
        </div>
      </>
    </FloatingContainer>
  );
}

function renderDialogField(dialogId: string, field: DialogField, dispatch: Dispatch<MainAction>): JSX.Element {
  switch (field.type) {
    case 'string': {
      return (
        <InputField
          onChange={(event) => {
            dispatch({
              type: MainActionType.UPDATE_DIALOG_FIELD,
              dialogId,
              field: {
                ...field,
                value: event.currentTarget.value
              }
            });
          }}
          text={field.value}
          editable={!field.locked}
          placeholder={field.placeholder} />
      );
    }
    default: {
      return (
        <div>Unsupported Field Type</div>
      );
    }
  }
}
