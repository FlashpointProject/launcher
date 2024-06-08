import * as remote from '@electron/remote';
import { BackIn, BackInit, BackOut, FetchedGameInfo, FpfssUser } from '@shared/back/types';
import { APP_TITLE, LOGOS, SCREENSHOTS, VIEW_PAGE_SIZE } from '@shared/constants';
import { CustomIPC, IService, ProcessState, WindowIPC } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { memoizeOne } from '@shared/memoize';
import { updatePreferencesData } from '@shared/preferences/util';
import { setTheme } from '@shared/Theme';
import { getFileServerURL, mapFpfssGameToLocal, mapLocalToFpfssGame, recursiveReplace, sizeToString } from '@shared/Util';
import { arrayShallowStrictEquals } from '@shared/utils/compare';
import { debounce } from '@shared/utils/debounce';
import axios from 'axios';
import { clipboard, ipcRenderer, Menu, MenuItemConstructorOptions } from 'electron';
import { CurationFpfssInfo, DialogField, DialogState, Game, Playlist, PlaylistGame, RequestGameRange } from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Dispatch } from 'redux';
import { FloatingContainer } from './components/FloatingContainer';
import { ConnectedFpfssEditGame } from './components/FpfssEditGame';
import { GameOrderChangeEvent } from './components/GameOrder';
import { InputField } from './components/InputField';
import { MetaEditExporter, MetaEditExporterConfirmData } from './components/MetaEditExporter';
import { OpenIcon } from './components/OpenIcon';
import { newCurateTask } from './components/pages/CuratePage';
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
import { fpfssLogin } from './fpfss';
import { UpdateView } from './interfaces';
import { Paths } from './Paths';
import { AppRouter, AppRouterProps } from './router';
import { CurateActionType } from './store/curate/enums';
import { CurateAction } from './store/curate/types';
import { MainActionType, RequestState } from './store/main/enums';
import { RANDOM_GAME_ROW_COUNT } from './store/main/reducer';
import { MainAction, MainState } from './store/main/types';
import { SearchQuery } from './store/search';
import { getBrowseSubPath, getGameImagePath, getGameImageURL, getGamePath, joinLibraryRoute } from './Util';
import { LangContext } from './util/lang';
import { queueOne } from './util/queue';
import uuid = require('uuid');
import { ProgressData } from './context/ProgressContext';
import { IWithShortcut } from 'react-keybind';
import { newGame } from '@shared/utils/misc';

// Hide the right sidebar if the page is inside these paths
const hiddenRightSidebarPages = [Paths.ABOUT, Paths.CURATE, Paths.CONFIG, Paths.MANUAL, Paths.LOGS, Paths.TAGS, Paths.CATEGORIES];

type AppOwnProps = {
  /** Most recent search query. */
  search: SearchQuery;
};

export type AppProps = AppOwnProps & RouteComponentProps & WithPreferencesProps & WithTagCategoriesProps & WithMainStateProps & WithTasksProps & WithCurateStateProps & IWithShortcut;

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
              .then(fetchedInfo => {
                if (fetchedInfo) {
                  this.props.setMainState({
                    currentGameInfo: fetchedInfo,
                    selectedGameId: fetchedInfo.game.id,
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
              .then(async (fetchedInfo) => {
                if (fetchedInfo) {
                  // Open game in sidebar
                  this.props.setMainState({
                    currentGameInfo: fetchedInfo,
                    selectedGameId: fetchedInfo.game.id,
                    selectedPlaylistId: undefined,
                    currentPlaylist: undefined,
                    currentPlaylistEntry: undefined
                  });
                  // Launch game
                  const game = fetchedInfo.game;
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
          // FPFSS related protocol actions
          case 'fpfss': {
            if (parts.length < 3) {
              alert('Invalid Protocol: ' + url);
            } else {
              switch (parts[1]) {
                case 'open_curation': {
                  if (parts.length > 4) {
                    this.performFpfssAction(async (user) => {
                      const fpfssInfo: CurationFpfssInfo = {
                        id: parts[4]
                      };
                      // Build url
                      const url = `${this.props.preferencesData.fpfssBaseUrl}/${parts.slice(2).join('/')}`;
                      // Generate task
                      const newTask = newCurateTask('Importing FPFSS Submission...', 'Importing...', this.props.addTask);
                      // Import
                      await window.Shared.back.request(BackIn.FPFSS_OPEN_CURATION, fpfssInfo, url, user.accessToken, newTask.id)
                      .catch((err) => {
                        newTask.error = err;
                        newTask.finished = true;
                        this.props.setTask(newTask.id, newTask);
                        throw err;
                      });
                    });
                  }
                  break;
                }
                case 'edit_game': {
                  const url = `${this.props.preferencesData.fpfssBaseUrl}/${parts.slice(2).join('/')}`;
                  this.openFpfssEditGame(url);
                  break;
                }
                default:
                  alert('Invalid FPFSS action: ' + parts[1]);
                  break;
              }
            }
            break;
          }
          case 'playlist': {
            if (parts.length > 2 && parts[1] === 'add') {
              // Parse query string
              if (parts[2].startsWith('?url=')) {
                const url = decodeURIComponent(parts[2].slice(5));
                // Download playlist and load
                window.Shared.back.request(BackIn.DOWNLOAD_PLAYLIST, url)
                .then((playlist) => {
                  if (playlist) {
                    alert(`Downloaded playlist: ${playlist.title}`);
                  } else {
                    alert(`Failed to download playlist: ${url}`);
                  }
                })
                .catch((error) => {
                  alert(`Error downloading playlist: ${error}`);
                });
              }
            }
            break;
          }
          default:
            ipcRenderer.invoke(CustomIPC.SHOW_MESSAGE_BOX, { title: 'Protocol Error', message: `Unsupported action "${parts[0]}"` });
            break;
        }
      }
    };
    // Listen for the window to move or resize (and update the preferences when it does)
    ipcRenderer.on(WindowIPC.WINDOW_MOVE, debounce((sender, x: number, y: number, isMaximized: boolean) => {
      if (!isMaximized) {
        updatePreferencesData({ mainWindow: { x: x | 0, y: y | 0 } });
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
        updatePreferencesData({ mainWindow: { width: width | 0, height: height | 0 } });
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

  onDatabaseLoaded() {
    console.log('db load');
    window.Shared.back.request(BackIn.GET_PLAYLISTS)
    .then(data => {
      console.log('got playlists');
      if (data) {
        this.props.dispatchMain({
          type: MainActionType.ADD_LOADED,
          loaded: [BackInit.PLAYLISTS],
        });
        this.props.setMainState({ playlists: data });
        this.cachePlaylistIcons(data);
      } else {
        console.error('wtf no get_playlists data');
      }
    });
    window.Shared.back.request(BackIn.GET_RENDERER_LOADED_DATA)
    .then(data => {
      for (const entry of Object.entries(data.shortcuts)) {
        const command = entry[0];
        const shortcuts = entry[1];
        const commandName = command.split(':').slice(1).join(':');
        if (this.props.shortcut && this.props.shortcut.registerShortcut && this.props.shortcut.unregisterShortcut) {
          try {
            this.props.shortcut.unregisterShortcut(shortcuts);
          } catch { /** ignore any errors from unregister check */ }
          this.props.shortcut.registerShortcut(() => {
            window.Shared.back.send(BackIn.RUN_COMMAND, commandName, []);
          }, shortcuts, command, 'Extension Shortcut');
        } else {
          log.error('Launcher', `Failed to register shortcut for ${command}, shortcut context missing?`);
        }
      }
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
    .then(() => {
      this.props.dispatchMain({
        type: MainActionType.ADD_LOADED,
        loaded: [BackInit.DATABASE],
      });
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
      if (this.props.main.randomGames.length < RANDOM_GAME_ROW_COUNT) {
        this.rollRandomGames(true);
      }
    })
    .then(() => {
      if (this.props.preferencesData.gameMetadataSources.length > 0) {
        window.Shared.back.request(BackIn.PRE_UPDATE_INFO, this.props.preferencesData.gameMetadataSources[0])
        .then((total) => {
          this.props.dispatchMain({
            type: MainActionType.UPDATE_UPDATE_INFO,
            total
          });
        });
      }
    });
  }

  onCurateLoad() {
    window.Shared.back.request(BackIn.CURATE_GET_LIST)
    .then(curations => {
      (this.props.dispatchMain as any as Dispatch<CurateAction>)({
        type: CurateActionType.SET_ALL_CURATIONS,
        curations: curations,
      });
      this.props.dispatchMain({
        type: MainActionType.ADD_LOADED,
        loaded: [BackInit.CURATE],
      });
    });
  }

  onExtensionsLoad() {
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
        loaded: [BackInit.EXTENSIONS],
      });
    });
  }

  registerWebsocketListeners() {
    window.Shared.back.register(BackOut.INIT_EVENT, (event, data) => {
      for (const index of data.done) {
        console.log('new ' + index);
        switch (+index) { // DO NOT REMOVE - Fails to convert to enum without explicitint conversion
          case BackInit.DATABASE: {
            this.onDatabaseLoaded();
            break;
          }
          case BackInit.CURATE: {
            this.onCurateLoad();
            break;
          }
          case BackInit.EXTENSIONS: {
            this.onExtensionsLoad();
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
        // Check if game just stopped, update to reflect time played changes if so
        if (this.props.main.currentGameInfo && data.state === ProcessState.STOPPED) {
          if (data.id.startsWith('game.') && data.id.length > 5) {
            const id = data.id.slice(5);
            if (id === this.props.main.currentGameInfo.game.id) {
              // Reload game in sidebar
              window.Shared.back.request(BackIn.GET_GAME, this.props.main.currentGameInfo.game.id)
              .then((fetchedInfo) => {
                if (fetchedInfo && this.props.main.selectedGameId === fetchedInfo.game.id) {
                  this.props.setMainState({ currentGameInfo: fetchedInfo });
                }
              })
              .catch(() => {
                /** Game does not exist */
              });
            }
          }
        }
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

    window.Shared.back.register(BackOut.SET_VIEW_SEARCH_STATUS, (event, viewId, status) => {
      this.props.dispatchMain({
        type: MainActionType.SET_VIEW_SEARCH_STATUS,
        viewIdentifier: viewId,
        searchStatus: status,
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

    window.Shared.back.register(BackOut.UPDATE_DIALOG_MESSAGE, (event, message, dialogId) => {
      this.props.dispatchMain({
        type: MainActionType.UPDATE_DIALOG_MESSAGE,
        dialogId,
        message
      });
    });

    window.Shared.back.register(BackOut.UPDATE_DIALOG_FIELD_VALUE, (event, dialogId, name, value) => {
      this.props.dispatchMain({
        type: MainActionType.UPDATE_DIALOG_FIELD_VALUE,
        dialogId,
        name,
        value
      });
    });

    window.Shared.back.register(BackOut.CANCEL_DIALOG, (event, dialogId) => {
      this.props.dispatchMain({
        type: MainActionType.CANCEL_DIALOG,
        dialogId
      });
    });

    window.Shared.back.register(BackOut.UPDATE_GOTD, (event, gotd) => {
      this.props.setMainState({
        gotdList: gotd
      });
    });

    window.Shared.back.register(BackOut.UPDATE_FEED, (event, feed) => {
      this.props.setMainState({
        updateFeedMarkdown: feed
      });
    });

    window.Shared.back.register(BackOut.UPDATE_PLATFORM_APP_PATHS, (event, paths) => {
      this.props.setMainState({
        platformAppPaths: paths
      });
    });

    window.Shared.back.register(BackOut.POST_SYNC_CHANGES, (event, libraries, suggestions, platformAppPaths, cats, total) => {
      this.props.dispatchMain({
        type: MainActionType.POST_FPFSS_SYNC,
        libraries,
        suggestions,
        preferencesData: this.props.preferencesData,
        platformAppPaths,
        total,
      });
      this.props.setTagCategories(cats);
    });

    window.Shared.back.register(BackOut.SHORTCUT_REGISTER_COMMAND, (event, command, shortcuts) => {
      const commandName = command.split(':').slice(1).join(':');
      if (this.props.shortcut && this.props.shortcut.registerShortcut && this.props.shortcut.unregisterShortcut) {
        try {
          this.props.shortcut.unregisterShortcut(shortcuts);
        } catch { /** ignore any errors from unregister check */ }
        this.props.shortcut.registerShortcut(() => {
          window.Shared.back.send(BackIn.RUN_COMMAND, commandName, []);
        }, shortcuts, command, 'Extension Shortcut');
      } else {
        log.error('Launcher', `Failed to register shortcut for ${command}, shortcut context missing?`);
      }
    });

    window.Shared.back.register(BackOut.SHORTCUT_UNREGISTER, (event, shortcuts) => {
      if (this.props.shortcut && this.props.shortcut.unregisterShortcut) {
        this.props.shortcut.unregisterShortcut(shortcuts);
      } else {
        log.error('Launcher', `Failed to register shortcut for ${shortcuts}, shortcut context missing?`);
      }
    });
  }


  init() {
    window.Shared.back.onStateChange = (state) => {
      this.props.setMainState({
        socketOpen: state
      });
    };

    // Load FPFSS user info and check that profile works
    (() => {
      const userBase64 = localStorage.getItem('fpfss_user');
      if (userBase64) {
        const user = JSON.parse(Buffer.from(userBase64, 'base64').toString('utf-8')) as FpfssUser;
        // Test profile uri
        const profileUrl = `${window.Shared.preferences.data.fpfssBaseUrl}/api/profile`;
        axios.get(profileUrl, {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`
          }
        })
        .then((res) => {
          // Success, use most recent info and save to storage and state
          user.username = res.data['Username'];
          user.avatarUrl = res.data['AvatarURL'];
          user.roles = res.data['Roles'];
          const newUserBase64 = Buffer.from(JSON.stringify(user, null, 0)).toString('base64');
          localStorage.setItem('fpfss_user', newUserBase64);
          this.props.dispatchMain({
            type: MainActionType.SET_FPFSS_USER,
            user
          });
        })
        .catch(() => {
          // Failed auth
          localStorage.removeItem('fpfss_user');
        });
      }
    })();

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
            message: 'All progress on downloading or installing the upgrade will be lost.\n' +
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
      for (const index of data.done) {
        console.log('found ' + index);
        switch (+index) { // DO NOT REMOVE - Fails to convert to enum without explicitint conversion
          case BackInit.DATABASE: {
            this.onDatabaseLoaded();
            break;
          }
          case BackInit.CURATE: {
            this.onCurateLoad();
            break;
          }
          case BackInit.EXTENSIONS: {
            this.onExtensionsLoad();
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

    // this.props.setTagCategories(window.Shared.initialTagCategories);
  }

  componentDidMount() {
    // Call first batch of random games
    // if (this.props.main.randomGames.length < RANDOM_GAME_ROW_COUNT) { this.rollRandomGames(true); }
  }

  componentDidUpdate(prevProps: AppProps) {
    if (this.props.main.loadedAll.isOpen) {
      let selectedPlaylistId = this.props.main.selectedPlaylistId;
      const { history, location, preferencesData } = this.props;
      const library = getBrowseSubPath(this.props.location.pathname);
      const view = this.props.main.views[library];

      // Force update certain variables if the view index has changed
      if (getBrowseSubPath(prevProps.location.pathname) !== library) {
        this.props.dispatchMain({
          type: MainActionType.VIEW_INDEX_CHANGED,
          index: library
        });
        // Update the selected playlist id for the rest of the logic
        const view = this.props.main.views[library];
        if (view) {
          if (view.query.playlistId !== selectedPlaylistId) {
            selectedPlaylistId = view.query.playlistId;
          }
        }
      }

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
          excludedLibraries: this.props.preferencesData.excludedRandomLibraries,
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
        // Prevent order changes from updating playlist search results
        let orderUpdate = false;
        if (
          view.query.orderBy !== this.props.preferencesData.gamesOrderBy ||
          view.query.orderReverse !== this.props.preferencesData.gamesOrder
        ) {
          orderUpdate = true;
        }
        if (!!view.query.playlistId || selectedPlaylistId) {
          orderUpdate = false;
        }

        // Check if any parameters for the search query has changed (they don't match the current view's)
        if (view.query.text !== this.props.search.text ||
          view.query.extreme !== this.props.preferencesData.browsePageShowExtreme ||
          orderUpdate ||
          JSON.stringify(view.tagFilters) !== JSON.stringify(this.props.preferencesData.tagFilters)
        ) {
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
            // Request needed pages
            window.Shared.back.request(BackIn.BROWSE_VIEW_PAGE, {
              ranges: pages.map<RequestGameRange>(index => {
                console.log(`requesting games {${index * VIEW_PAGE_SIZE}} to ${(index * VIEW_PAGE_SIZE) + VIEW_PAGE_SIZE}`);
                return {
                  start: index * VIEW_PAGE_SIZE,
                  length: VIEW_PAGE_SIZE,
                  index: index > 0 ? view.meta && view.meta.pageKeyset[index - 1] : undefined, // Page keyset indices are one-indexed (start at 1 instead of 0)
                };
              }),
              viewIdentifier: library,
              query: view.query,
              shallow: true,
            })
            .then((data) => {
              if (data) {
                this.props.dispatchMain({
                  type: MainActionType.ADD_VIEW_PAGES,
                  viewIdentifier: library,
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
              viewIdentifier: library,
              queryId: view.queryId,
              pages: pages,
            });
          }
        }
      }

      // Check if the meta has not yet been requested
      if (view && view.metaState === RequestState.WAITING) {
        // Request the first page
        this.props.dispatchMain({
          type: MainActionType.REQUEST_VIEW_FIRST_PAGE,
          viewIdentifier: library,
          queryId: view.queryId
        });
      }

      // Check for selected game changes

      // Check if it started or ended editing
      if (this.props.main.isEditingGame != prevProps.main.isEditingGame) {
        this.updateCurrentGame(this.props.main.selectedGameId, selectedPlaylistId);
      }
      // Update current game and add-apps if the selected game changes
      if (this.props.main.selectedGameId && this.props.main.selectedGameId !== prevProps.main.selectedGameId) {
        this.updateCurrentGame(this.props.main.selectedGameId, selectedPlaylistId);
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
    .catch((error) => {
      log.error('Launcher', `Failed to launch game - ${gameId} - ERROR: ${error}`);
    })
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
      currentGameInfo: undefined,
      selectedGameId: undefined,
      currentPlaylistEntry: undefined,
      isEditingGame: false
    });
    // Focus the game grid/list
    // this.focusGameGridOrList();
  };

  onEditGame = (game: Partial<Game>) => {
    log.debug('Launcher', `Editing: ${JSON.stringify(game)}`);
    if (this.props.main.currentGameInfo) {
      const ng = newGame();
      Object.assign(ng, { ...this.props.main.currentGameInfo.game, ...game });
      this.props.setMainState({
        currentGameInfo: {
          game: ng,
          activeConfig: this.props.main.currentGameInfo.activeConfig,
          configs: [...this.props.main.currentGameInfo.configs]
        }
      });
    }
  };

  onSaveEditClick = async (): Promise<void> => {
    if (!this.props.main.currentGameInfo) {
      console.error('Can\'t save game. "currentGame" is missing.');
      return;
    }
    const game = await this.onSaveGame(this.props.main.currentGameInfo, this.props.main.currentPlaylistEntry);
    this.props.setMainState({
      currentGameInfo: game == null ? undefined : game,
      isEditingGame: false
    });
    // this.focusGameGridOrList();
  };

  onDiscardEditClick = (): void => {
    this.props.setMainState({
      isEditingGame: false,
      currentGameInfo: this.props.main.currentGameInfo,
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
    if (this.props.main.currentGameInfo) {
      const ng = newGame();
      Object.assign(newGame, { ...this.props.main.currentGameInfo.game, activeDataOnDisk, activeDataId });
      window.Shared.back.request(BackIn.SAVE_GAME, {
        game: ng,
        activeConfig: this.props.main.currentGameInfo.activeConfig,
        configs: [...this.props.main.currentGameInfo.configs],
      })
      .then(() => {
        if (this.props.main.currentGameInfo) {
          const ng = newGame();
          Object.assign(ng, { ...this.props.main.currentGameInfo.game, activeDataOnDisk, activeDataId });
          this.props.setMainState({
            currentGameInfo: {
              ...this.props.main.currentGameInfo,
              game: ng,
            }
          });
        }
      });
    }
  };

  onRemoveSelectedGameFromPlaylist = async (): Promise<void> => {
    // Remove game from playlist
    if (this.props.main.currentGameInfo) {
      if (this.props.main.selectedPlaylistId) {
        await window.Shared.back.request(BackIn.DELETE_PLAYLIST_GAME, this.props.main.selectedPlaylistId, this.props.main.currentGameInfo.game.id);
      } else { logError('No playlist is selected'); }
    } else { logError('No game is selected'); }

    // Deselect the game
    this.onSelectGame(undefined);

    // Reset the state related to the selected game
    this.props.setMainState({
      currentGameInfo: undefined,
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
      .then(fetchedInfo => {
        if (fetchedInfo) {
          this.props.setMainState({
            currentGameInfo: fetchedInfo,
            currentPlaylistEntry: gamePlaylistEntry == null ? undefined : gamePlaylistEntry
          });
        } else { console.log(`Failed to get game. Game is undefined (GameID: "${gameId}").`); }
      });
    }
  });

  private onGameContextMenuMemo = memoizeOne((playlists: Playlist[], strings: LangContainer, selectedPlaylistId?: string) => {
    return (gameId: string) => {
      const fpfssButtons: MenuItemConstructorOptions[] = this.props.preferencesData.fpfssBaseUrl ? [
        {
          /* Edit via FPFSS */
          label: strings.browse.editFpfssGame,
          enabled: this.props.preferencesData.enableEditing,
          click: () => {
            this.onFpfssEditGame(gameId);
          }
        },
        {
          /* Show on FPFSS */
          label: strings.browse.showOnFpfss,
          enabled: this.props.preferencesData.enableEditing,
          click: () => {
            remote.shell.openExternal(`${this.props.preferencesData.fpfssBaseUrl}/web/game/${gameId}`);
          }
        }
      ] : [];

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
          /* Copy Shortcut URL */
          label: strings.menu.copyShortcutURL,
          enabled: true,
          click: () => {
            clipboard.writeText(`flashpoint://run/${gameId}`);
          }
        },
        {
          /* Copy Game UUID */
          label: strings.menu.copyGameUUID,
          enabled: true,
          click: () => {
            clipboard.writeText(gameId);
          }
        }, { type: 'separator'}, {
          /* File Location */
          label: strings.menu.openFileLocation,
          enabled: !window.Shared.isBackRemote, // (Local "back" only)
          click: () => {
            window.Shared.back.request(BackIn.GET_GAME, gameId)
            .then(async (fetchedInfo) => {
              if (fetchedInfo) {
                const gamePath = await getGamePath(fetchedInfo.game, window.Shared.config.fullFlashpointPath, window.Shared.preferences.data.htdocsFolderPath, window.Shared.preferences.data.dataPacksFolderPath);
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
                      'Failed to find the game file.\n' +
                        'If you are using Flashpoint Infinity, make sure you download the game first.\n'
                    );
                  } else {
                    opts.title = 'Unexpected error';
                    opts.message = (
                      'Failed to check the game file.\n' +
                        'If you see this, please report it back to us (a screenshot would be great)!\n\n' +
                        `Error: ${error}\n`
                    );
                  }
                  opts.message += `Path: "${gamePath}"\n\nNote: If the path is too long, some portion will be replaced with three dots ("...").`;
                  ipcRenderer.invoke(CustomIPC.SHOW_MESSAGE_BOX, opts);
                }
              }
            });
          },
        },
        {
          /* Logo Location */
          label: strings.menu.openLogoLocation,
          enabled: !window.Shared.isBackRemote, // (Local "back" only)
          click: () => {
            const logoPath = getGameImagePath(LOGOS, gameId);
            fs.promises.access(logoPath, fs.constants.R_OK)
            .then(() => {
              /* Downloaded, open */
              remote.shell.showItemInFolder(logoPath);
            }).catch(() => {
              /* Not downloaded, try and force it */
              fetch(getGameImageURL(LOGOS, gameId))
              .then(() => {
                remote.shell.showItemInFolder(logoPath);
              });
            });
          }
        },
        {
          /* Screenshot Location */
          label: strings.menu.openScreenshotLocation,
          enabled: !window.Shared.isBackRemote, // (Local "back" only)
          click: () => {
            const logoPath = getGameImagePath(SCREENSHOTS, gameId);
            fs.promises.access(logoPath, fs.constants.R_OK)
            .then(() => {
              /* Downloaded, open */
              remote.shell.showItemInFolder(logoPath);
            }).catch(() => {
              /* Not downloaded, try and force it */
              fetch(getGameImageURL(SCREENSHOTS, gameId))
              .then(() => {
                remote.shell.showItemInFolder(logoPath);
              });
            });
          }
        }, { type: 'separator' }, {
          /* Clear Playtime Tracking */
          label: strings.config.clearPlaytimeTracking,
          enabled: !window.Shared.isBackRemote, // (Local "back" only)
          click: () => {
            window.Shared.back.send(BackIn.CLEAR_PLAYTIME_TRACKING_BY_ID, gameId);
          }
        }];

      // Add editing mode fields
      if (this.props.preferencesData.enableEditing) {
        const editingButtons: MenuItemConstructorOptions[] = [
          {
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
          }, ...fpfssButtons, { type: 'separator' }
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
                .then((fetchedInfo) => {
                  const game = fetchedInfo?.game;
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

  onMovePlaylistGame = async (sourceIdx: number, destIdx: number) => {
    if (this.props.main.selectedPlaylistId && (sourceIdx !== destIdx)) {
      // Send swap to backend, reflect on frontend immediately
      const library = getBrowseSubPath(this.props.location.pathname);
      this.props.dispatchMain({
        type: MainActionType.RAISE_PLAYLIST_GAME,
        sourceIdx,
        destIdx,
        library
      });
    }
  };

  copyCrashLog = () => {
    clipboard.writeText(this.props.main.mainOutput || '');
  };

  render() {
    const libraryPath = getBrowseSubPath(this.props.location.pathname);
    const view = this.props.main.views[libraryPath];
    const playlists = this.filterAndOrderPlaylistsMemo(this.props.main.playlists, libraryPath);
    const extremeTags = this.props.preferencesData.tagFilters.filter(t => t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);

    // Props to set to the router
    const routerProps: AppRouterProps = {
      onMovePlaylistGame: this.onMovePlaylistGame,
      fpfssUser: this.props.main.fpfss.user,
      gotdList: this.props.main.gotdList,
      games: view && view.games || {},
      randomGames: this.props.main.randomGames,
      rollRandomGames: this.rollRandomGames,
      updateView: this.updateView,
      metaState: view?.metaState,
      gamesTotal: this.props.main.gamesTotal,
      viewGamesTotal: view && view.total,
      allPlaylists: this.props.main.playlists,
      playlists: playlists,
      suggestions: this.props.main.suggestions,
      appPaths: this.props.main.appPaths,
      platforms: this.props.main.suggestions.platforms,
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
      searchStatus: view ? view.searchStatus : null,
    };

    // Render
    return (
      <LangContext.Provider value={this.props.main.lang}>
        {!this.props.main.stopRender ? (
          <>
            {/* Backend Crash Log and Report */}
            {!this.props.main.socketOpen && !this.props.main.mainOutput && (
              <FloatingContainer>
                <div className='main-output-header'>Disconnected from Backend</div>
                <div>Reconnecting...</div>
              </FloatingContainer>
            )}
            {this.props.main.mainOutput && (
              <FloatingContainer>
                <div className='main-output-header'>Backend Crash Log</div>
                <div className='main-output-content'>{this.props.main.mainOutput}</div>
                <div className='main-output-buttons'>
                  <SimpleButton
                    value={'Copy Crash Log'}
                    onClick={this.copyCrashLog} />
                  <SimpleButton
                    value={'Restart Launcher'}
                    onClick={() => {
                      this.props.setMainState({
                        quitting: true
                      });
                      window.Shared.restart();
                    }} />
                </div>
              </FloatingContainer>
            )}
            {/* First Open Dialog */}
            {this.props.main.openDialogs.length > 0 && (
              renderDialogMemo(this.props.main.openDialogs[0], this.props.dispatchMain)
            )}
            {/** Fancy FPFSS edit */}
            {this.props.main.fpfss.editingGameInfo && (
              <FloatingContainer floatingClassName='fpfss-edit-container'>
                <ConnectedFpfssEditGame
                  logoVersion={this.props.main.logoVersion}
                  gameRunning={false}
                  currentGameInfo={this.props.main.fpfss.editingGameInfo}
                  currentLibrary={this.props.main.fpfss.editingGameInfo.game.library}
                  onGameLaunch={async () => alert('Cannot launch game during FPFSS edit')}
                  onDeleteSelectedGame={() => {/** unused */ }}
                  onDeselectPlaylist={() => {/** unused */ }}
                  onEditPlaylistNotes={() => {/** unused */ }}
                  isEditing={true}
                  isExtreme={false}
                  isNewGame={false}
                  suggestions={this.props.main.suggestions}
                  tagCategories={this.props.tagCategories}
                  busyGames={[]}
                  onEditClick={() => {/** unused */ }}
                  onDiscardClick={this.onCancelFpfssEditGame}
                  onSaveGame={this.onSaveFpfssEditGame}
                  onForceSaveGame={this.onForceSaveGame}
                  onOpenExportMetaEdit={() => {/** unused */ }}
                  onEditGame={this.onApplyFpfssEditGame}
                  onFpfssEditGame={this.onFpfssEditGame}
                  onUpdateActiveGameData={(disk, id) => id && this.onApplyFpfssEditGameData(id)} />
              </FloatingContainer>
            )}
            {/* Splash screen */}
            <SplashScreen
              quitting={this.props.main.quitting}
              loadedAll={this.props.main.loadedAll.isOpen}
              loaded={this.props.main.loaded} />
            {/* Title-bar (if enabled) */}
            {window.Shared.config.data.useCustomTitlebar ?
              window.Shared.customVersion ? (
                <TitleBar title={window.Shared.customVersion} />
              ) : (
                <TitleBar title={`${APP_TITLE} (${remote.app.getVersion()})`} />
              ) : undefined}
            {/* "Content" */}
            {this.props.main.loadedAll.isOpen ? (
              <>
                {/* Header */}
                <HeaderContainer
                  logoutUser={this.logoutUser}
                  user={this.props.main.fpfss.user}
                  libraries={this.props.main.libraries}
                  onOrderChange={this.onOrderChange}
                  onToggleLeftSidebarClick={this.onToggleLeftSidebarClick}
                  onToggleRightSidebarClick={this.onToggleRightSidebarClick}
                  orderBy={this.props.preferencesData.gamesOrderBy}
                  orderReverse={this.props.preferencesData.gamesOrder}
                  logoVersion={this.props.main.logoVersion} />
                {/* Main */}
                <div className='main'
                  ref={this.appRef} >
                  <AppRouter {...routerProps} />
                  <noscript className='nojs'>
                    <div style={{ textAlign: 'center' }}>
                      This website requires JavaScript to be enabled.
                    </div>
                  </noscript>
                  {this.props.main.currentGameInfo && !hiddenRightSidebarPages.reduce((prev, cur) => prev || this.props.history.location.pathname.startsWith(cur), false) && (
                    <ResizableSidebar
                      show={this.props.preferencesData.browsePageShowRightSidebar}
                      divider='before'
                      width={this.props.preferencesData.browsePageRightSidebarWidth}
                      onResize={this.onRightSidebarResize}>
                      <ConnectedRightBrowseSidebar
                        logoVersion={this.props.main.logoVersion}
                        currentGameInfo={this.props.main.currentGameInfo}
                        isExtreme={this.props.main.currentGameInfo ? this.props.main.currentGameInfo.game.tags.reduce<boolean>((prev, next) => extremeTags.includes(next) || prev, false) : false}
                        gameRunning={routerProps.gameRunning}
                        currentPlaylistEntry={this.props.main.currentPlaylistEntry}
                        currentLibrary={routerProps.gameLibrary}
                        onGameLaunch={this.onGameLaunch}
                        onDeleteSelectedGame={this.onDeleteSelectedGame}
                        onRemoveSelectedGameFromPlaylist={this.onRemoveSelectedGameFromPlaylist}
                        onDeselectPlaylist={this.onRightSidebarDeselectPlaylist}
                        onEditPlaylistNotes={this.onEditPlaylistNotes}
                        isEditing={this.props.main.isEditingGame && this.props.preferencesData.enableEditing}
                        isNewGame={false} /* Deprecated */
                        onEditGame={this.onEditGame}
                        onUpdateActiveGameData={this.onUpdateActiveGameData}
                        onEditClick={this.onStartEditClick}
                        onDiscardClick={this.onDiscardEditClick}
                        onSaveGame={this.onSaveEditClick}
                        onForceSaveGame={this.onForceSaveGame}
                        tagCategories={this.props.tagCategories}
                        suggestions={this.props.main.suggestions}
                        busyGames={this.props.main.busyGames}
                        onFpfssEditGame={this.onFpfssEditGame}
                        onOpenExportMetaEdit={this.onOpenExportMetaEdit} />
                    </ResizableSidebar>
                  )}
                </div>
                {/* Tasks - @TODO Find a better way to hide it than behind enableEditing */}
                {this.props.preferencesData.enableEditing && this.props.tasks.length > 0 && (
                  <TaskBar
                    open={this.props.main.taskBarOpen}
                    onToggleOpen={this.onToggleTaskBarOpen} />
                )}
                {/* Footer */}
                <ConnectedFooter />
                {/* Meta Edit Popup */}
                {this.props.main.metaEditExporterOpen ? (
                  <MetaEditExporter
                    gameId={this.props.main.metaEditExporterGameId}
                    onCancel={this.onCancelExportMetaEdit}
                    onConfirm={this.onConfirmExportMetaEdit} />
                ) : undefined}
              </>
            ) : undefined}
          </>
        ) : undefined}
        {this.props.main.downloadOpen && (
          <FloatingContainer>
            {this.props.main.downloadVerifying ? (
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
            {this.props.main.downloadVerifying ? <></> : (
              <ProgressBar
                wrapperClass='placeholder-download-bar__wrapper'
                progressData={{
                  ...placeholderProgressData,
                  percentDone: this.props.main.downloadPercent,
                  usePercentDone: true
                }}
              />
            )}
            <SimpleButton
              className='cancel-download-button'
              value={this.props.main.lang.dialog.cancel}
              onClick={() => window.Shared.back.send(BackIn.CANCEL_DOWNLOAD)} />
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
        const playlists = [...this.props.main.playlists];
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
      state.playlists = [...this.props.main.playlists];
      state.playlists[index] = playlist;
    } else {
      state.playlists = [...this.props.main.playlists, playlist];
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

  onSaveGame = async (info: FetchedGameInfo, playlistEntry?: PlaylistGame): Promise<FetchedGameInfo | null> => {
    const data = await window.Shared.back.request(BackIn.SAVE_GAME, info);
    if (playlistEntry) {
      window.Shared.back.send(BackIn.SAVE_PLAYLIST_GAME, this.props.main.selectedPlaylistId || '', playlistEntry);
    }
    this.setViewQuery(info.game.library);
    return data.fetchedInfo;
  };

  // Deliberately avoids validating saved changes before updating frontend
  onForceSaveGame = async (info: FetchedGameInfo): Promise<void> => {
    if (this.props.main.currentGameInfo) {
      this.props.setMainState({
        currentGameInfo: info
      });
      // Save without immediate frontend update
      window.Shared.back.request(BackIn.SAVE_GAME, info)
      .then((newInfo) => {
        if (newInfo.fetchedInfo) {
          this.props.setMainState({
            currentGameInfo: newInfo.fetchedInfo
          });
        }
      });
    }
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

  async cachePlaylistIcons(playlists: Playlist[]) {
    return Promise.all(playlists.map(p => (async () => {
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
  setViewQuery = (function (this: App, library: string = getBrowseSubPath(this.props.location.pathname), playlist?: Playlist | null): void {
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
      viewIdentifier: getBrowseSubPath(this.props.location.pathname),
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
        excludedLibraries: this.props.preferencesData.excludedRandomLibraries,
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

  logoutUser = () => {
    // @TODO actually logout to invalid server side
    this.props.dispatchMain({
      type: MainActionType.SET_FPFSS_USER,
      user: null
    });
    localStorage.removeItem('fpfss_user');
  };

  fetchFpfssGame = async (url: string) => {
    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.props.main.fpfss.user?.accessToken}`
        }
      });
      const game = mapFpfssGameToLocal(res.data);
      const fetchedInfo: FetchedGameInfo = {
        game,
        activeConfig: null,
        configs: []
      };
      console.log(game);
      this.props.dispatchMain({
        type: MainActionType.SET_FPFSS_GAME,
        fetchedInfo,
      });
    } catch (err) {
      alert(`Error loading FPFSS game: ${err}`);
    }
  };

  openFpfssEditGame = (url: string) => {
    // Force a tags update
    if (this.props.preferencesData.gameMetadataSources.length === 0) {
      alert('No metadata sources in preferences.json, aborting remote edit');
      return;
    }
    const source = this.props.preferencesData.gameMetadataSources[0];
    window.Shared.back.request(BackIn.SYNC_TAGGED, source)
    .then(() => {
      // Edit game in-launcher then send it back to server
      this.performFpfssAction((user) => {
        if (this.props.main.fpfss.editingGameInfo) {
          alert('Game edit already open');
        } else {
          // Download Game metadata and add to state
          this.fetchFpfssGame(url);
        }
      });
    })
    .catch((err) => {
      alert(`Failed to update tags: ${err}`);
    });
  };

  onCancelFpfssEditGame = () => {
    // Just clear the state
    this.props.dispatchMain({
      type: MainActionType.SET_FPFSS_GAME,
      fetchedInfo: null
    });
  };

  onSaveFpfssEditGame = async () => {
    const localGameInfo = this.props.main.fpfss.editingGameInfo;
    if (localGameInfo && this.props.main.fpfss.user) {
      const game = mapLocalToFpfssGame(localGameInfo.game);
      this.props.dispatchMain({
        type: MainActionType.SET_FPFSS_GAME,
        fetchedInfo: null
      });
      const url = `${this.props.preferencesData.fpfssBaseUrl}/api/game/${game.id}`;

      console.log(JSON.stringify(game));
      // Post changes
      await axios.post(url, game, {
        headers: {
          Authorization: `Bearer ${this.props.main.fpfss.user?.accessToken}`
        }
      })
      .then(() => {
        alert('Success');
      }).catch((err) => {
        alert('Error submitting game changes: ' + err);
      });
    }
  };

  onFpfssEditGame = (gameId: string) => {
    if (this.props.preferencesData.gameMetadataSources.length > 0) {
      const url = `${this.props.preferencesData.gameMetadataSources[0].baseUrl}/api/game/${gameId}`;
      this.openFpfssEditGame(url);
    }
  };

  onApplyFpfssEditGame = (game: Partial<Game>) => {
    this.props.dispatchMain({
      type: MainActionType.APPLY_DELTA_FPFSS_GAME,
      game
    });
  };

  onApplyFpfssEditGameData(id: number) {
    this.props.dispatchMain({
      type: MainActionType.APPLY_DELTA_FPFSS_GAME,
      game: {
        activeDataId: id
      }
    });
  }

  async performFpfssAction(cb: (user: FpfssUser) => any) {
    let user = this.props.main.fpfss.user;
    if (!user) {
      // Logged out, try login
      user = await fpfssLogin(this.props.dispatchMain, this.props.main.dialogResEvent)
      .catch((err) => {
        if (err !== 'User Cancelled') {
          alert(err);
        }
      }) as FpfssUser | null; // Weird void from inferred typing?
      if (user) {
        // Store in main state
        this.props.dispatchMain({
          type: MainActionType.SET_FPFSS_USER,
          user
        });
        // Store in localstorage
        const userBase64 = Buffer.from(JSON.stringify(user, null, 0)).toString('base64');
        localStorage.setItem('fpfss_user', userBase64);
      }
    }

    if (user) {
      // User exists, carry on to callback
      let retries = 0;
      while (retries <= 1) {
        retries += 1;
        try {
          await cb(user);
          break;
        } catch (err) {
          log.error('Launcher', `[FPFSS] Failed to execute action - ${err}`);
          if (retries <= 1) {
            // Reauth if the action failed
            log.info('Launcher', '[FPFSS] Attempting reauth');
            user = await fpfssLogin(this.props.dispatchMain, this.props.main.dialogResEvent)
            .catch((err) => {
              if (err !== 'User Cancelled') {
                alert(err);
              }
            }) as FpfssUser | null;
            if (!user) {
              break;
            }
          }
        }
      }
    }
  }
}

async function cacheIcon(icon: string): Promise<string> {
  const r = await fetch(icon);
  const blob = await r.blob();
  return `url(${URL.createObjectURL(blob)})`;
}

export function openContextMenu(template: MenuItemConstructorOptions[]): Menu {
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
        {dialog.userCanCancel && (
          <div className='dialog-cancel-button' onClick={() => {
            dispatch({
              type: MainActionType.CANCEL_DIALOG,
              dialogId: dialog.id
            });
          }}>
            <OpenIcon icon='x' />
          </div>
        )}
        <div className={`dialog-message ${dialog.largeMessage ? 'dialog-message--large' : ''}`}>{dialog.message}</div>
        {dialog.fields?.map(f => {
          return (
            <div key={f.name} className='dialog-field'>
              {f.message && (<div className='dialog-field-message'>{f.message}</div>)}
              <div className='dialog-field-input'>{renderDialogField(dialog.id, f, dispatch)}</div>
            </div>
          );
        })}
        <div className='dialog-buttons-container'>
          {dialog.buttons.map((b, idx) => {
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
                value={b} />
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
              type: MainActionType.UPDATE_DIALOG_FIELD_VALUE,
              dialogId,
              name: field.name,
              value: event.currentTarget.value
            });
          }}
          text={field.value}
          editable={!field.locked}
          placeholder={field.placeholder} />
      );
    }
    case 'progress': {
      // Wrap in progress data
      const data: ProgressData = {
        key: '',
        itemCount: 0,
        totalItems: 0,
        percentDone: field.value,
        usePercentDone: true,
        isDone: false
      };
      return (
        <ProgressBar
          progressData={data} />
      );
    }
    default: {
      return (
        <div>Unsupported Field Type</div>
      );
    }
  }
}
