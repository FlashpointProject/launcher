import * as remote from '@electron/remote';
import { BackIn, BackInit, BackOut, FpfssUser } from '@shared/back/types';
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
import {
  CurationFpfssInfo,
  DialogField,
  DialogState,
  Game,
  Playlist,
  PlaylistGame, ViewGame
} from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FloatingContainer } from './FloatingContainer';
import { ConnectedFpfssEditGame } from './FpfssEditGame';
import { InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { newCurateTask } from './pages/CuratePage';
import { placeholderProgressData, ProgressBar } from './ProgressComponents';
import { ResizableSidebar, SidebarResizeEvent } from './ResizableSidebar';
import { SimpleButton } from './SimpleButton';
import { SplashScreen } from './SplashScreen';
import { TaskBar } from './TaskBar';
import { TitleBar } from './TitleBar';
import { ConnectedFooter } from '../containers/ConnectedFooter';
import { ConnectedRightBrowseSidebar } from '../containers/ConnectedRightBrowseSidebar';
import Header from '../containers/HeaderContainer';
import { WithMainStateProps } from '../containers/withMainState';
import { WithPreferencesProps } from '../containers/withPreferences';
import { WithTagCategoriesProps } from '../containers/withTagCategories';
import { WithTasksProps } from '../containers/withTasks';
import { CreditsFile } from '../credits/CreditsFile';
import { fpfssLogin } from '../fpfss';
import { Paths } from '@shared/Paths';
import { AppRouter, AppRouterProps } from '../router';
import { getViewName, getGameImagePath, getGameImageURL, getGamePath, joinLibraryRoute } from '../Util';
import { LangContext } from '../util/lang';
import { queueOne } from '../util/queue';
import uuid = require('uuid');
import { ProgressData } from '../context/ProgressContext';
import { IWithShortcut } from 'react-keybind';
import { newGame } from '@shared/utils/misc';
import { cancelDialog, RANDOM_GAME_ROW_COUNT, resolveDialog, updateDialogField } from '@renderer/store/main/slice';
import { WithSearchProps } from '@renderer/containers/withSearch';
import { WithCurateProps } from '@renderer/containers/withCurateState';
import { WithFpfssProps } from '@renderer/containers/withFpfss';
import { WithViewProps } from '@renderer/containers/withView';
import { RequestState } from '@renderer/store/search/slice';

// Hide the right sidebar if the page is inside these paths
const hiddenRightSidebarPages = [Paths.ABOUT, Paths.CURATE, Paths.CONFIG, Paths.MANUAL, Paths.LOGS, Paths.TAGS, Paths.CATEGORIES];

type AppOwnProps = {};

export type AppProps = AppOwnProps & RouteComponentProps & WithViewProps & WithFpfssProps & WithPreferencesProps & WithSearchProps & WithTagCategoriesProps & WithMainStateProps & WithTasksProps & WithCurateProps & IWithShortcut;

export class App extends React.Component<AppProps> {
  appRef: React.RefObject<HTMLDivElement>;

  constructor(props: AppProps) {
    super(props);

    this.appRef = React.createRef();

    // Dispatch the initial state info
    props.setMainState({
      themeList: window.Shared.initialThemes,
      lang: window.Shared.initialLang,
      langList: window.Shared.initialLangList,
      localeCode: window.Shared.initialLocaleCode,
    });

    // Initialize app
    this.init();
  }

  registerIpcListeners() {
    const handleProtocol = (url: string) => {
      const { currentView } = this.props;
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
                    currentGame: fetchedInfo,
                    selectedGameId: fetchedInfo.id,
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
                  // Update game data (install state)
                  if (game && game.activeDataId) {
                    this.props.searchActions.selectGame({
                      view: currentView.id,
                      game,
                    });
                  }
                  // Launch game
                  await this.onGameLaunch(game.id);
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
                        this.props.setTask(newTask);
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
              // Get url from params
              const parsedUrl = new URL(url);
              const playlistUrl = parsedUrl.searchParams.get('url');
              if (playlistUrl) {
                // Download playlist and load
                window.Shared.back.request(BackIn.DOWNLOAD_PLAYLIST, playlistUrl)
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

  registerShortcut(command: string, shortcut: string[]) {
    const commandName = command.split(':').slice(1).join(':');
    if (this.props.shortcut && this.props.shortcut.registerShortcut && this.props.shortcut.unregisterShortcut) {
      try {
        this.props.shortcut.unregisterShortcut(shortcut);
      } catch { /** ignore any errors from unregister check */ }
      this.props.shortcut.registerShortcut(() => {
        window.Shared.back.send(BackIn.RUN_COMMAND, commandName, []);
      }, shortcut, command, 'Extension Shortcut');
    } else {
      log.error('Launcher', `Failed to register shortcut for ${command}, shortcut context missing?`);
    }
  }

  onDatabaseLoaded() {
    console.log('db load');
    window.Shared.back.request(BackIn.GET_PLAYLISTS)
    .then(data => {
      console.log('got playlists');
      if (data) {
        this.props.mainActions.addLoaded([BackInit.PLAYLISTS]);
        this.props.setMainState({ playlists: data });
        this.cachePlaylistIcons(data);
      } else {
        console.error('no get_playlists data?');
      }
    });
    window.Shared.back.request(BackIn.GET_RENDERER_LOADED_DATA)
    .then(data => {
      for (const entry of Object.entries(data.shortcuts)) {
        const command = entry[0];
        const shortcuts = entry[1];
        this.registerShortcut(command, shortcuts);
      }
      this.props.setMainState(data);
      if (this.props.preferencesData.useCustomViews) {
        const customViews = this.props.preferencesData.customViews;
        if (customViews.length === 0) {
          customViews.push('Browse');
          updatePreferencesData({
            customViews,
          });
        }
        if (this.props.preferencesData.useStoredViews) {
          this.props.searchActions.createViews({
            views: customViews,
            storedViews: this.props.preferencesData.storedViews,
            areLibraries: false,
          });
        } else {
          this.props.searchActions.createViews({
            views: customViews,
            areLibraries: false,
          });

        }
      } else {
        if (this.props.preferencesData.useStoredViews) {
          this.props.searchActions.createViews({
            views: data.libraries,
            storedViews: this.props.preferencesData.storedViews,
            areLibraries: true,
          });
        } else {
          this.props.searchActions.createViews({
            views: data.libraries,
            areLibraries: true,
          });
        }
      }

      this.props.setTagCategories(data.tagCategories);
      console.log('navigating to ' + this.props.preferencesData.defaultOpeningPage);
      this.props.history.push(this.props.preferencesData.defaultOpeningPage);
    })
    .then(() => {
      this.props.mainActions.addLoaded([BackInit.DATABASE]);
    })
    .then(async () => {
      const data = await window.Shared.back.request(BackIn.GET_GAMES_TOTAL);
      if (data) {
        this.props.setMainState({
          gamesTotal: data
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
          this.props.mainActions.setUpdateInfo(total);
        });
      }
    });
  }

  onCurateLoad() {
    window.Shared.back.request(BackIn.CURATE_GET_LIST)
    .then(curations => {
      this.props.curateActions.replaceCurations(curations);
      this.props.mainActions.addLoaded([BackInit.CURATE]);
    });
  }

  onExtensionsLoad() {
    window.Shared.back.request(BackIn.GET_RENDERER_EXTENSION_INFO)
    .then(data => {
      this.props.setMainState(data);
      this.props.mainActions.addLoaded([BackInit.EXTENSIONS]);
    });
  }

  registerWebsocketListeners() {
    window.Shared.back.register(BackOut.INIT_EVENT, (event, data) => {
      for (const index of data.done) {
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
            this.props.mainActions.addLoaded([index]);
          }
        }
      }
    });

    window.Shared.back.register(BackOut.LOG_ENTRY_ADDED, (event, entry, index) => {
      window.Shared.log.entries[index - window.Shared.log.offset] = entry;
    });

    window.Shared.back.register(BackOut.LOCALE_UPDATE, (event, data) => {
      this.props.setMainState({
        localeCode: data
      });
    });

    window.Shared.back.register(BackOut.SERVICE_CHANGE, (event, data) => {
      const { currentView } = this.props;
      if (data.id) {
        // Check if game just stopped, update to reflect time played changes if so
        if (currentView.selectedGame && data.state === ProcessState.STOPPED) {
          if (data.id.startsWith('game.') && data.id.length > 5) {
            const id = data.id.slice(5);
            if (id === currentView.selectedGame.id) {
              // Reload game in sidebar
              window.Shared.back.request(BackIn.GET_GAME, currentView.selectedGame.id)
              .then((game) => {
                if (game && currentView.selectedGame && currentView.selectedGame.id === game.id) {
                  this.props.searchActions.selectGame({
                    view: currentView.id,
                    game,
                  });
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
      this.props.setMainState({
        lang: data
      });
    });

    window.Shared.back.register(BackOut.LANGUAGE_LIST_CHANGE, (event, data) => {
      this.props.setMainState({
        langList: data
      });
    });

    window.Shared.back.register(BackOut.UPDATE_COMPONENT_STATUSES, (event, statuses) => {
      this.props.setMainState({
        componentStatuses: statuses
      });
    });

    window.Shared.back.register(BackOut.SET_VIEW_SEARCH_STATUS, (event, viewId, status) => {
      // TODO: Reimplement or scrap?
    });

    window.Shared.back.register(BackOut.THEME_CHANGE, (event, theme) => {
      if (theme.id === this.props.preferencesData.currentTheme) { setTheme(theme); }
    });

    window.Shared.back.register(BackOut.THEME_LIST_CHANGE, (event, data) => {
      this.props.setMainState({
        themeList: data
      });
    });

    window.Shared.back.register(BackOut.PLAYLISTS_CHANGE, (event, data) => {
      this.props.setMainState({
        playlists: data
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
      this.props.curateActions.setContentTree({
        folder,
        contentTree: contents
      });
    });

    window.Shared.back.register(BackOut.CURATE_LIST_CHANGE, (event, added, removed) => {
      this.props.curateActions.modifyCurations({
        added,
        removed
      });
    });

    window.Shared.back.register(BackOut.CURATE_SELECT_LOCK, (event, folder, locked) => {
      this.props.curateActions.setLock({
        folder,
        locked,
      });
    });

    window.Shared.back.register(BackOut.CURATE_SELECT_CURATIONS, (event, folders) => {
      const selectable = folders.filter(f => this.props.curate.curations.findIndex(c => c.folder === f) !== -1);
      this.props.curateActions.setSelectedCurations(selectable);
    });

    window.Shared.back.register(BackOut.UPDATE_TASK, (event,task) => {
      // I don't know why length works with 1, don't change it
      if (!this.props.main.taskBarOpen && this.props.tasks.length === 1) {
        // Show task bar for first task added
        this.props.setMainState({ taskBarOpen: true });
      }
      this.props.setTask(task);
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
      this.props.mainActions.createDialog(d);
      window.Shared.back.send(BackIn.NEW_DIALOG_RESPONSE, d.id, code);
    });

    window.Shared.back.register(BackOut.UPDATE_DIALOG_MESSAGE, (event, message, dialogId) => {
      this.props.mainActions.updateDialog({
        id: dialogId,
        message
      });
    });

    window.Shared.back.register(BackOut.UPDATE_DIALOG_FIELD_VALUE, (event, dialogId, name, value) => {
      this.props.mainActions.updateDialogField({
        id: dialogId,
        field: {
          name,
          value,
        }
      });
    });

    window.Shared.back.register(BackOut.CANCEL_DIALOG, (event, dialogId) => {
      this.props.mainActions.cancelDialog(dialogId);
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
      this.props.setMainState({
        libraries,
        suggestions,
        platformAppPaths,
        gamesTotal: total,
      });
      // TODO: Re-add prefs sync
      this.props.setTagCategories(cats);
    });

    window.Shared.back.register(BackOut.SHORTCUT_REGISTER_COMMAND, (event, command, shortcuts) => {
      this.registerShortcut(command, shortcuts);
    });

    window.Shared.back.register(BackOut.SHORTCUT_UNREGISTER, (event, shortcuts) => {
      if (this.props.shortcut && this.props.shortcut.unregisterShortcut) {
        this.props.shortcut.unregisterShortcut(shortcuts);
      } else {
        log.error('Launcher', `Failed to register shortcut for ${shortcuts}, shortcut context missing?`);
      }
    });

    window.Shared.back.register(BackOut.BROWSE_VIEW_PAGE, (event, data) => {
      // Dispath addData for the given view
      this.props.searchActions.addData({
        view: data.viewId,
        data: {
          searchId: data.searchId,
          page: data.page,
          games: data.games,
        }
      });
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
          this.props.fpfssActions.setUser(user);
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
            this.props.mainActions.addLoaded([index]);
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
      this.props.mainActions.setCredits(CreditsFile.parseCreditsData(data));
    })
    .catch((error) => {
      console.warn(error);
      log.warn('Launcher', `Failed to load credits.\n${error}`);
      this.props.mainActions.setCredits({
        roles: [],
        profiles: []
      });
    });
  }

  componentDidMount() {
    // Call first batch of random games
    // if (this.props.main.randomGames.length < RANDOM_GAME_ROW_COUNT) { this.rollRandomGames(true); }
  }

  componentDidUpdate(prevProps: AppProps) {
    if (this.props.main.loadedAll) {
      const selectedPlaylistId = this.props.main.selectedPlaylistId;
      const { history, location, preferencesData } = this.props;

      // Check if theme changed
      if (preferencesData.currentTheme !== prevProps.preferencesData.currentTheme) {
        const theme = this.props.main.themeList.find(t => t.id === preferencesData.currentTheme);
        setTheme(theme);
      }

      // Check if logo set changed
      if (preferencesData.currentLogoSet !== prevProps.preferencesData.currentLogoSet) {
        this.props.mainActions.incrementLogoVersion();
      }

      // Check if playlists need to be updated based on extreme filtering
      if (preferencesData.browsePageShowExtreme !== prevProps.preferencesData.browsePageShowExtreme) {
        window.Shared.back.request(BackIn.GET_PLAYLISTS)
        .then(data => {
          if (data) {
            this.props.setMainState({ playlists: data });
            this.cachePlaylistIcons(data)
            .catch(console.error);
          }
        });
      }

      // Reset random games if the filters change
      // @TODO: Is this really the best way to compare array contents? I guess it works
      if (
        this.props.preferencesData.browsePageShowExtreme !== prevProps.preferencesData.browsePageShowExtreme ||
        !arrayShallowStrictEquals(this.props.preferencesData.excludedRandomLibraries, prevProps.preferencesData.excludedRandomLibraries) ||
        JSON.stringify(prevProps.preferencesData.tagFilters) !== JSON.stringify(this.props.preferencesData.tagFilters)) {
        this.props.setMainState({
          randomGames: [],
          requestingRandomGames: true
        });
        window.Shared.back.request(BackIn.RANDOM_GAMES, {
          count: RANDOM_GAME_ROW_COUNT * 10,
          excludedLibraries: this.props.preferencesData.excludedRandomLibraries,
        })
        .then((data) => {
          this.props.mainActions.addRandomGames(data);
        })
        .catch((error) => {
          log.error('Launcher', `Error fetching random games - ${error}`);
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
      const gameLibrary = getViewName(location.pathname);
      if (location.pathname.startsWith(Paths.BROWSE) &&
        preferencesData.lastSelectedLibrary !== gameLibrary) {
        updatePreferencesData({ lastSelectedLibrary: gameLibrary });
      }

      // Create a new game
      if (this.props.main.wasNewGameClicked) {
        const route = preferencesData.lastSelectedLibrary || preferencesData.defaultLibrary || '';

        if (location.pathname.startsWith(Paths.BROWSE)) {
          this.props.setMainState({
            wasNewGameClicked: false
          });
          // Deselect the current game
          const view = this.props.search.views[route];
          if (view && view.selectedGame !== undefined) {
            this.props.searchActions.selectGame({
              view: route,
              game: undefined,
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
    this.props.mainActions.markGameBusy(gameId);
    await window.Shared.back.request(BackIn.LAUNCH_GAME, gameId)
    .catch((error) => {
      log.error('Launcher', `Failed to launch game - ${gameId} - ERROR: ${error}`);
    })
    .finally(() => {
      this.props.mainActions.unmarkGameBusy(gameId);
    });
  };

  onDeleteSelectedGame = async (): Promise<void> => {
    const { currentView } = this.props;
    if (currentView.selectedGame) {
      this.props.searchActions.selectGame({
        view: currentView.id,
        game: undefined
      });
      // Delete the game
      this.onDeleteGame(currentView.selectedGame.id);
    }
  };

  onEditGame = (game: Partial<Game>) => {
    log.debug('Launcher', `Editing: ${JSON.stringify(game)}`);
    if (this.props.currentView.selectedGame) {
      const ng = newGame();
      Object.assign(ng, { ...this.props.currentView.selectedGame, ...game });
      this.props.setMainState({
        currentGame: ng
      });
    }
  };

  onSaveEditClick = async (): Promise<void> => {
    if (!this.props.currentView.selectedGame) {
      console.error('Can\'t save game. "currentGame" is missing.');
      return;
    }
    const game = await this.onSaveGame(this.props.currentView.selectedGame, this.props.main.currentPlaylistEntry);
    this.props.setMainState({
      currentGame: game == null ? undefined : game,
      isEditingGame: false
    });
    // this.focusGameGridOrList();
  };

  onDiscardEditClick = (): void => {
    this.props.setMainState({
      isEditingGame: false,
      currentGame: this.props.currentView.selectedGame,
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
    if (this.props.currentView.selectedGame) {
      const ng = newGame();
      Object.assign(newGame, { ...this.props.currentView.selectedGame, activeDataOnDisk, activeDataId });
      window.Shared.back.request(BackIn.SAVE_GAME, ng)
      .then(() => {
        if (this.props.currentView.selectedGame) {
          const ng = newGame();
          Object.assign(ng, { ...this.props.currentView.selectedGame, activeDataOnDisk, activeDataId });
          this.props.searchActions.updateGame(ng);
        }
      });
    }
  };

  onRemoveSelectedGameFromPlaylist = async (): Promise<void> => {
    // Remove game from playlist
    if (this.props.currentView.selectedGame) {
      if (this.props.main.selectedPlaylistId) {
        await window.Shared.back.request(BackIn.DELETE_PLAYLIST_GAME, this.props.main.selectedPlaylistId, this.props.currentView.selectedGame.id);
      } else { logError('No playlist is selected'); }
    } else { logError('No game is selected'); }

    // Deselect the game
    this.props.searchActions.selectGame({
      view: this.props.currentView.id,
      game: undefined,
    });

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

  onRightSidebarDeselectPlaylist = (): void => {
    this.props.searchActions.selectPlaylist({
      view: this.props.currentView.id,
      playlist: undefined
    });
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
            currentGame: fetchedInfo,
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
        }, { type: 'separator' }, {
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
                  this.props.curateActions.setCurrentCuration({
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

  onMovePlaylistGame = async (sourceGameId: string, destGameId: string) => {
    if (this.props.currentView.selectedPlaylist && this.props.currentView.advancedFilter.playlistOrder && (sourceGameId !== destGameId)) {
      // Send swap to backend, reflect on frontend immediately
      const library = getViewName(this.props.location.pathname);
      this.props.searchActions.movePlaylistGame({
        view: library,
        sourceGameId,
        destGameId,
      });
    }
  };

  copyCrashLog = () => {
    clipboard.writeText(this.props.main.mainOutput || '');
  };

  render() {
    const { currentView } = this.props;
    const playlists = this.orderPlaylistsMemo(this.props.main.playlists);
    const extremeTags = this.props.preferencesData.tagFilters.filter(t => t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);

    // Props to set to the router
    const routerProps: AppRouterProps = {
      onMovePlaylistGame: this.onMovePlaylistGame,
      fpfssUser: this.props.fpfss.user,
      gotdList: this.props.main.gotdList,
      randomGames: this.props.main.randomGames,
      rollRandomGames: this.rollRandomGames,
      gamesTotal: this.props.main.gamesTotal,
      allPlaylists: this.props.main.playlists,
      playlists: playlists,
      suggestions: this.props.main.suggestions,
      appPaths: this.props.main.appPaths,
      platforms: this.props.main.suggestions.platforms,
      playlistIconCache: this.props.main.playlistIconCache,
      onGameContextMenu: this.onGameContextMenuMemo(this.props.main.playlists, this.props.main.lang, this.props.main.selectedPlaylistId),
      onLaunchGame: this.onGameLaunch,
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
      onDeletePlaylist: this.onPlaylistDelete,
      onUpdatePlaylist: this.onUpdatePlaylist,
      wasNewGameClicked: this.props.main.wasNewGameClicked,
      gameLibrary: currentView.id,
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
      metaState: this.props.currentView.data.metaState,
      searchStatus: null, // TODO: remove
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
              renderDialogMemo(this.props.main.openDialogs[0], this.props.mainActions.cancelDialog, this.props.mainActions.resolveDialog, this.props.mainActions.updateDialogField)
            )}
            {/** Fancy FPFSS edit */}
            {this.props.fpfss.editingGame && (
              <FloatingContainer floatingClassName='fpfss-edit-container'>
                <ConnectedFpfssEditGame
                  logoVersion={this.props.main.logoVersion}
                  gameRunning={false}
                  currentGame={this.props.fpfss.editingGame}
                  currentLibrary={this.props.fpfss.editingGame.library}
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
                  onEditGame={this.onApplyFpfssEditGame}
                  onFpfssEditGame={this.onFpfssEditGame}
                  onSearch={this.onSearch}
                  onUpdateActiveGameData={(disk, id) => id && this.onApplyFpfssEditGameData(id)} />
              </FloatingContainer>
            )}
            {/* Splash screen */}
            <SplashScreen
              quitting={this.props.main.quitting}
              loadedAll={this.props.main.loadedAll}
              loaded={this.props.main.loaded} />
            {/* Title-bar (if enabled) */}
            {window.Shared.config.data.useCustomTitlebar ?
              window.Shared.customVersion ? (
                <TitleBar title={window.Shared.customVersion} />
              ) : (
                <TitleBar title={`${APP_TITLE} (${remote.app.getVersion()})`} />
              ) : undefined}
            {/* "Content" */}
            {this.props.main.loadedAll ? (
              <>
                {/* Header */}
                <Header
                  logoutUser={this.logoutUser}
                  user={this.props.fpfss.user}
                  libraries={this.props.main.libraries}
                  onToggleLeftSidebarClick={this.onToggleLeftSidebarClick}
                  onToggleRightSidebarClick={this.onToggleRightSidebarClick} />
                {/* Main */}
                <div className='main'
                  ref={this.appRef} >
                  <AppRouter {...routerProps} />
                  <noscript className='nojs'>
                    <div style={{ textAlign: 'center' }}>
                      This website requires JavaScript to be enabled.
                    </div>
                  </noscript>
                  {currentView.selectedGame && !hiddenRightSidebarPages.reduce((prev, cur) => prev || this.props.history.location.pathname.startsWith(cur), false) && (
                    <ResizableSidebar
                      show={this.props.preferencesData.browsePageShowRightSidebar}
                      divider='before'
                      width={this.props.preferencesData.browsePageRightSidebarWidth}
                      onResize={this.onRightSidebarResize}>
                      <ConnectedRightBrowseSidebar
                        logoVersion={this.props.main.logoVersion}
                        currentGame={currentView.selectedGame}
                        isExtreme={currentView.selectedGame ? currentView.selectedGame.tags.reduce<boolean>((prev, next) => extremeTags.includes(next) || prev, false) : false}
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
                        tagCategories={this.props.tagCategories}
                        suggestions={this.props.main.suggestions}
                        busyGames={this.props.main.busyGames}
                        onFpfssEditGame={this.onFpfssEditGame}
                        onSearch={this.onSearch}/>
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

  private onToggleLeftSidebarClick = (): void => {
    updatePreferencesData({ browsePageShowLeftSidebar: !this.props.preferencesData.browsePageShowLeftSidebar });
  };

  private onToggleRightSidebarClick = (): void => {
    updatePreferencesData({ browsePageShowRightSidebar: !this.props.preferencesData.browsePageShowRightSidebar });
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
    const newPlaylists = [...this.props.main.playlists];
    const newPlaylistIconCache = { ...this.props.main.playlistIconCache };
    // Update or add playlist
    const index = this.props.main.playlists.findIndex(p => p.id === playlist.id);
    if (index >= 0) {
      newPlaylists[index] = playlist;
    } else {
      newPlaylists.push(playlist);
    }

    // Remove old icon from cache
    if (playlist.id in this.props.main.playlistIconCache) {
      delete newPlaylistIconCache[playlist.id];
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

    this.props.setMainState({
      playlists: newPlaylists,
      playlistIconCache: newPlaylistIconCache
    }); // (This is very annoying to make typesafe)
  };

  onSaveGame = async (game: Game, playlistEntry?: PlaylistGame): Promise<Game | null> => {
    const data = await window.Shared.back.request(BackIn.SAVE_GAME, game);
    if (playlistEntry) {
      window.Shared.back.send(BackIn.SAVE_PLAYLIST_GAME, this.props.main.selectedPlaylistId || '', playlistEntry);
    }
    return data;
  };

  onDeleteGame = (gameId: string): void => {
    const strings = this.props.main.lang;
    window.Shared.back.request(BackIn.DELETE_GAME, gameId)
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

  orderPlaylistsMemo = memoizeOne((playlists: Playlist[]) => {
    // @FIXTHIS "arcade" should not be hard coded as the "default" library
    return (
      [...playlists]
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

  onToggleTaskBarOpen = (): void => {
    this.props.setMainState({ taskBarOpen: !this.props.main.taskBarOpen });
  };

  rollRandomGames = (first?: boolean) => {
    const { randomGames, requestingRandomGames } = this.props.main;

    // Shift in new games from the queue
    if (first !== true) {
      this.props.mainActions.shiftRandomGames();
    }

    // Request more games to the queue
    if (randomGames.length <= (RANDOM_GAME_ROW_COUNT * 5) && !requestingRandomGames) {
      this.props.setMainState({
        requestingRandomGames: true
      });

      window.Shared.back.request(BackIn.RANDOM_GAMES, {
        count: RANDOM_GAME_ROW_COUNT * 10,
        excludedLibraries: this.props.preferencesData.excludedRandomLibraries,
      })
      .then((data) => {
        this.props.mainActions.addRandomGames(data);
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
    this.props.fpfssActions.setUser(null);
    localStorage.removeItem('fpfss_user');
  };

  fetchFpfssGame = async (url: string) => {
    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.props.fpfss.user?.accessToken}`
        }
      });
      const game = mapFpfssGameToLocal(res.data);
      console.log(game);
      this.props.fpfssActions.setGame(game);
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
        if (this.props.fpfss.editingGame) {
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
    this.props.fpfssActions.setGame(null);
  };

  onSaveFpfssEditGame = async () => {
    const localGame = this.props.fpfss.editingGame;
    if (localGame && this.props.fpfss.user) {
      const game = mapLocalToFpfssGame(localGame);
      this.props.fpfssActions.setGame(null);
      const url = `${this.props.preferencesData.fpfssBaseUrl}/api/game/${game.id}`;

      console.log(JSON.stringify(game));
      // Post changes
      await axios.post(url, game, {
        headers: {
          Authorization: `Bearer ${this.props.fpfss.user?.accessToken}`
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

  onSearch = (text: string) => {
    this.props.searchActions.setSearchText({
      view: this.props.currentView.id,
      text,
    });
    this.props.searchActions.forceSearch({
      view: this.props.currentView.id,
    });
  };

  onApplyFpfssEditGame = (game: Partial<Game>) => {
    this.props.fpfssActions.applyGameDelta(game);
  };

  onApplyFpfssEditGameData(id: number) {
    this.props.fpfssActions.applyGameDelta({
      activeDataId: id
    });
  }

  async performFpfssAction(cb: (user: FpfssUser) => any) {
    let user = this.props.fpfss.user;
    if (!user) {
      // Logged out, try login
      user = await fpfssLogin(this.props.mainActions.createDialog, this.props.mainActions.cancelDialog)
      .catch((err) => {
        if (err !== 'User Cancelled') {
          alert(err);
        }
      }) as FpfssUser | null; // Weird void from inferred typing?
      if (user) {
        // Store in fpfss state
        this.props.fpfssActions.setUser(user);
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
            user = await fpfssLogin(this.props.mainActions.createDialog, this.props.mainActions.cancelDialog)
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

function renderDialogMemo(dialog: DialogState, closeDialog: typeof cancelDialog, finishDialog: typeof resolveDialog, updateField: typeof updateDialogField): JSX.Element {
  return (
    <FloatingContainer>
      <>
        {dialog.userCanCancel && (
          <div className='dialog-cancel-button' onClick={() => {
            closeDialog(dialog.id);
          }}>
            <OpenIcon icon='x' />
          </div>
        )}
        <div className={`dialog-message ${dialog.largeMessage ? 'dialog-message--large' : ''}`}>{dialog.message}</div>
        {dialog.fields?.map(f => {
          return (
            <div key={f.name} className='dialog-field'>
              {f.message && (<div className='dialog-field-message'>{f.message}</div>)}
              <div className='dialog-field-input'>{renderDialogField(dialog.id, f, updateField)}</div>
            </div>
          );
        })}
        <div className='dialog-buttons-container'>
          {dialog.buttons.map((b, idx) => {
            return (
              <SimpleButton
                key={b}
                onClick={() => {
                  finishDialog({
                    id: dialog.id,
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

function renderDialogField(dialogId: string, field: DialogField, updateField: typeof updateDialogField): JSX.Element {
  switch (field.type) {
    case 'string': {
      return (
        <InputField
          onChange={(event) => {
            updateField({
              id: dialogId,
              field: {
                name: field.name,
                value: event.currentTarget.value
              }
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
