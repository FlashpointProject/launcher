import { createSelector } from '@reduxjs/toolkit';
import { getPointer, MenuProvider } from '@renderer/context/MenuContext';
import { resolveNewDialog } from '@renderer/dialog';
import { getFpfssConsentExt, saveFpfssConsentExt } from '@renderer/fpfss';
import { useView } from '@renderer/hooks/search';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { useContextMenu } from '@renderer/hooks/useContextMenu';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { createGroup, modifyCurations, replaceCurations, setContentTree, setCurateLoaded, setCurationTemplates, setLock, setSelectedCurations } from '@renderer/store/curate/slice';
import { setDownloaderState, updateDownloaderStatus, updateDownloaderTask, updateDownloaderTasks } from '@renderer/store/downloads/slice';
import { performFpfssAction, setFpfssUser } from '@renderer/store/fpfss/slice';
import { pushHistory } from '@renderer/store/history/slice';
import { addLogEntries, setEntries } from '@renderer/store/logs/slice';
import { addCustomRoute, addGameSidebarComponent, addLoaded, addNewExtension, cancelDialog, changeService, createDialog, openDynamicPage, removeCustomRoute, removeExtension, removeGameSidebarComponent, removeService, setExtConfigValue, setExtOrderablesFromCallback, setMainState, setUnrecoverableError, setUpdateInfo, updateDialog, updateDialogField, updateMetadataSource, updateSystemThemeCss, updateThemeCss } from '@renderer/store/main/slice';
import { setExtState, setPreferences, updatePreferences, updatePreferencesWithoutSend } from '@renderer/store/preferences/slice';
import { addData, createViews, GENERAL_VIEW_ID, resetDropdownData, updateGame } from '@renderer/store/search/slice';
import store, { AppDispatch, RootState } from '@renderer/store/store';
import { setTagCategories } from '@renderer/store/tagCategories/slice';
import { addTask, setTask, setTaskBarOpen } from '@renderer/store/tasks/slice';
import { idToGame } from '@renderer/util/async';
import * as extUtils from '@renderer/util/ext';
import { BackIn, BackInit, BackOut, FpfssActionPayload, FpfssUser } from '@shared/back/types';
import { APP_TITLE } from '@shared/constants';
import { Paths } from '@shared/Paths';
import { getFileServerURL, sizeToString } from '@shared/Util';
import { isGame } from '@shared/utils/misc';
import {
  DialogStateTemplate,
  GameMetadataSource,
  Playlist
} from 'flashpoint-launcher';
import * as path from 'node:path';
import * as React from 'react';
import { Activity, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { axios, setExtensionEnabled } from '../Util';
import { LangContext } from '../util/lang';
import { ActivityRoutes, StateWrapper } from './ActivityRoutes';
import { BrowsePageDisplayGrid, BrowsePageDisplayList } from './BrowsePageDisplay';
import { CheckBox } from './CheckBox';
import { ConfigBox, ConfigSection } from './ConfigBox';
import { ConfigBoxButton } from './ConfigBoxButton';
import { ConfigBoxCheckbox } from './ConfigBoxCheckbox';
import { ConfigBoxInput } from './ConfigBoxInput';
import { ConfigBoxMultiSelect } from './ConfigBoxMultiSelect';
import { ConfigBoxSelect } from './ConfigBoxSelect';
import { ConfigBoxSelectInput } from './ConfigBoxSelectInput';
import { Dialog } from './Dialog';
import { GameComponentDropdownSelectField, GameComponentInputField } from './DisplayComponent';
import { Dropdown, DropdownCheckboxRow, DropdownFrame, DropdownStringRow } from './Dropdown';
import { DynamicComponent } from './DynamicComponent';
import { DynamicComponentProvider, RemoteModule } from './DynamicComponentProvider';
import { DynamicThemeProvider } from './DynamicThemeProvider';
import { FloatingContainer } from './FloatingContainer';
import { Footer } from './Footer';
import { SortableColumn } from './GameListHeader';
import { Header } from './Header';
import { HomePageBox } from './HomePageBox';
import { InputField } from './InputField';
import { LeftSidebar } from './LeftSidebar';
import { AboutPage } from './pages/AboutPage';
import { BrowsePage } from './pages/BrowsePage';
import { ConfigPage } from './pages/ConfigPage';
import { CuratePage } from './pages/CuratePage';
import { DynamicPage } from './pages/DynamicPage';
import { FpfssPage } from './pages/FpfssPage';
import { HomePage } from './pages/HomePage';
import { IFramePage } from './pages/IFramePage';
import { LoadingPage } from './pages/LoadingPage';
import { LogsPage } from './pages/LogsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TagCategoriesPage } from './pages/TagCategoriesPage';
import { TagsPage } from './pages/TagsPage';
import { UnrecoverableErrorPage } from './pages/UnrecoverableErrorPage';
import { setPageTitle } from './PageTitle';
import { placeholderProgressData, ProgressBar } from './ProgressComponents';
import { RandomGames } from './RandomGames';
import { ResizableSidebar, SidebarResizeEvent } from './ResizableSidebar';
import { RightBrowseSidebarView } from './RightBrowseSidebar';
import { SearchableSelect } from './SearchBar';
import { SimpleButton } from './SimpleButton';
import { SizeProvider } from './SizeProvider';
import { SplashScreen } from './SplashScreen';
import { TaskBar } from './TaskBar';
import { TitleBar } from './TitleBar';

const selectDynamicThemes = createSelector(
  [
    (state: RootState) => state.main.extensions,
    (state: RootState) => state.preferences.disabledExtensions
  ],
  (extensions, disabledExtensions) => {
    return extensions
    .filter(ext => !disabledExtensions.includes(ext.id))
    .reduce<string[]>((prev, cur) => prev.concat(cur.contributes?.themeFiles.map(file => {
      return `${getFileServerURL()}/extdata/${cur.id}/${file}`;
    }) || []), []);
  }
);

const selectRemoteModules = createSelector(
  [
    (state: RootState) => state.main.extensions,
    (state: RootState) => state.preferences.disabledExtensions
  ],
  (extensions, disabledExtensions) => {
    console.log(extensions);
    return extensions
    .filter(ext => !disabledExtensions.includes(ext.id))
    .reduce<RemoteModule[]>((prev, cur) => {
      if (cur.contributes?.moduleFederation) {
        const remoteModules: RemoteModule[] = cur.contributes.moduleFederation.map(mc => {
          return {
            scope: mc.scope,
            url: `${getFileServerURL()}/extdata/${cur.id}/${mc.path}`
          };
        });
        return prev.concat(remoteModules);
      } else {
        return prev;
      }
    }, []);
  }
);

export function App() {
  const location = useLocation();
  const lastLoc = React.useRef<string>(null);
  const contentRef = React.useRef(null);
  const dispatch = useAppDispatch();
  const enableEditing = useAppSelector(state => state.preferences.enableEditing);
  const browsePageRightSidebarWidth = useAppSelector(state => state.preferences.browsePageRightSidebarWidth);
  const browsePageShowRightSidebar = useAppSelector(state => state.preferences.browsePageShowRightSidebar);
  const strings = useAppSelector(state => state.main.lang);
  const stopRender = useAppSelector(state => state.main.stopRender);
  const socketOpen = useAppSelector(state => state.main.socketOpen);
  const openDialogs = useAppSelector(state => state.main.openDialogs);
  const downloadOpen = useAppSelector(state => state.main.downloadOpen);
  const downloadVerifying = useAppSelector(state => state.main.downloadVerifying);
  const downloadSize = useAppSelector(state => state.main.downloadSize);
  const downloadPercent = useAppSelector(state => state.main.downloadPercent);
  const taskBarOpen = useAppSelector(state => state.tasks.taskBarOpen);
  const tasks = useAppSelector(state => state.tasks.tasks);
  const useCustomTitleBar = useAppSelector(state => state.preferences.useCustomTitlebar);
  const dynamicPage = useAppSelector(state => state.main.dynamicPage);
  const showExtreme = useAppSelector(state => state.preferences.browsePageShowExtreme);
  const tagFilters = useAppSelector(state => state.preferences.tagFilters);
  const searchDropdownKey = useAppSelector(state => state.search.dropdowns.key);
  const manualUrl = useAppSelector(state => state.preferences.onlineManual || pathToFileUrl(path.join(window.Shared.config.fullFlashpointPath, state.preferences.offlineManual)));
  const dynamicThemeFileList = useAppSelector(selectDynamicThemes);
  const remoteModules = useAppSelector(selectRemoteModules);
  const customRoutes = useAppSelector(state => state.main.displaySettings.customRoutes);
  const unrecoverableError = useAppSelector(state => state.main.unrecoverableError);
  const currentView = useView();
  const firstBrowsePageViewName = useAppSelector(state => Object.keys(state.search.views).find(v => v !== GENERAL_VIEW_ID));
  const hiddenRightSidebarPages: string[] = [Paths.ABOUT, Paths.CURATE, Paths.CONFIG, Paths.MANUAL, Paths.LOGS, Paths.TAGS, Paths.CATEGORIES, Paths.DOWNLOADS, Paths.FPFSS];
  for (const route of customRoutes) {
    if (route.showRightSidebar !== true) {
      hiddenRightSidebarPages.push(route.path);
    }
  }
  const showRightSidebar = currentView?.selectedGame !== undefined && browsePageShowRightSidebar && !hiddenRightSidebarPages.reduce((prev, cur) => prev || location.pathname.startsWith(cur), false);

  const activeTagFilters = tagFilters.filter(t => t.enabled && (!t.extreme || showExtreme));
  const tagsKey = JSON.stringify(activeTagFilters);

  if (tagsKey !== searchDropdownKey) {
    dispatch(resetDropdownData(tagsKey));
  }

  React.useEffect(() => {
    if (lastLoc.current !== location.pathname) {
      dispatch(pushHistory(location));
      lastLoc.current = location.pathname;
    }
  });

  const useActivityRoutes = true;

  const [isInitDone, setIsInitDone] = useState(false);

  const [lastBrowsePage, setLastBrowsePage] = useState(currentView ? currentView.id : undefined);

  if (currentView && currentView.id !== GENERAL_VIEW_ID && currentView.id !== lastBrowsePage
    && !currentView.id.startsWith('!fpfss')
  ) {
    setLastBrowsePage(currentView.id);
    console.log('saved browse page name - ' + currentView.id);
  }

  if (currentView && currentView.id === GENERAL_VIEW_ID && lastBrowsePage === GENERAL_VIEW_ID
    && firstBrowsePageViewName !== undefined && !firstBrowsePageViewName.startsWith('!fpfss')
  ) {
    setLastBrowsePage(firstBrowsePageViewName);
    console.log('saved browse page name - ' + firstBrowsePageViewName);
  }

  const browsePageViewName =
    currentView !== undefined ?
      currentView.id !== GENERAL_VIEW_ID ?
        currentView.id :
        lastBrowsePage
      : lastBrowsePage;

  const browsePageViewExists = useAppSelector(state => browsePageViewName ? browsePageViewName in state.search.views : false);

  React.useEffect(() => {
    setPageTitle(location.pathname);
  }, [location.pathname]);

  if (!isInitDone) {
    setIsInitDone(true);
    initApp(dispatch);
  }

  const getGameBrowserDivWidth = () => {
    if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
    if (!contentRef.current) { throw new Error('"game-browser" div is missing.'); }
    return parseInt(document.defaultView.getComputedStyle(contentRef.current).width || '', 10);
  };

  const onRightSidebarResize = (event: SidebarResizeEvent) => {
    const maxWidth = (getGameBrowserDivWidth() - browsePageRightSidebarWidth) - 5;
    const targetWidth = event.startWidth + event.startX - event.event.clientX;
    dispatch(updatePreferences({
      browsePageRightSidebarWidth: Math.min(targetWidth, maxWidth)
    }));
  };

  const onToggleTaskBarOpen = () => {
    dispatch(setTaskBarOpen(!taskBarOpen));
  };

  const customVersion = window.Shared.customVersion;

  const isBrowsePage = location.pathname.startsWith(Paths.BROWSE);

  if (unrecoverableError) {
    return (
      <UnrecoverableErrorPage error={unrecoverableError}/>
    );
  }

  return (
    <LangContext.Provider value={strings}>
      <DynamicThemeProvider fileList={dynamicThemeFileList} >
        <DynamicComponentProvider manifests={remoteModules}>
          <MenuProvider>
            <ToastContainer
              theme='dark'
              className='toast-container'
              progressClassName='toast-container-progress'
              position='bottom-center'/>
            {!stopRender ? (
              <>
                {/* Backend Crash Log and Report */}
                {!socketOpen && (
                  <FloatingContainer>
                    <>
                      <div className='main-output-header'>Disconnected from Backend</div>
                      <div>Reconnecting...</div>
                      { window.electronAPI !== undefined && (
                        <div className='main-output-buttons'>
                          <SimpleButton
                            onClick={() => {
                              window.electronAPI?.relaunch();
                            }}
                            value='Restart'/>
                          <SimpleButton
                            onClick={() => {
                              window.electronAPI?.close();
                            }}
                            value='Exit'/>
                        </div>
                      )}
                    </>
                  </FloatingContainer>
                )}
                {/* First Open Dialog */}
                {openDialogs.length > 0 && socketOpen && (
                  <Dialog dialog={openDialogs[0]} />
                )}                {/* Title-bar (if enabled) */}
                {useCustomTitleBar ?
                  customVersion ? (
                    <TitleBar title={customVersion} />
                  ) : (
                    <TitleBar title={`${APP_TITLE} ${window.Shared.isDev ? '(Dev Mode)' : ''}`} />
                  ) : undefined}
                {/* "Content" */}
                <SplashScreen>
                  {/* Header */}
                  <Header />
                  {/* Main */}
                  <div className='main' ref={contentRef} >
                    { currentView !== undefined ? (
                      <>
                        { useActivityRoutes && (
                          <ActivityRoutes
                            manualUrl={manualUrl}
                            customRoutes={customRoutes} />
                        )}
                        <Routes>
                          <Route
                            path={Paths.LOADING}
                            element={<LoadingPage/>}/>
                          <Route
                            path={Paths.HOME}
                            element={useActivityRoutes ? <></> : <HomePage/>}/>
                          <Route
                            path={Paths.BROWSE}
                            element={<></>}/>
                          <Route
                            path={Paths.TAGS}
                            element={useActivityRoutes ? <></> : <TagsPage/>}/>
                          <Route
                            path={Paths.CATEGORIES}
                            element={<TagCategoriesPage/>}/>
                          {/* <Route
                          path={Paths.DOWNLOADS}
                          element={<DownloadsPage/>}/> */}
                          <Route
                            path={Paths.LOGS}
                            element={useActivityRoutes ? <></> : <LogsPage/>}/>
                          <Route
                            path={Paths.CONFIG}
                            element={<ConfigPage/>}/>
                          <Route
                            path={Paths.MANUAL}
                            element={useActivityRoutes ? <></> : <IFramePage url={manualUrl} />}/>
                          <Route
                            path={Paths.ABOUT}
                            element={<AboutPage/>}/>
                          <Route
                            path={Paths.CURATE}
                            element={useActivityRoutes ? <></> : <CuratePage/>}/>
                          <Route
                            path={Paths.FPFSS}
                            element={useActivityRoutes ? <></> : <FpfssPage/>}/>
                          <Route
                            path={Paths.DYNAMIC}
                            element={<DynamicPage name={dynamicPage?.name || ''} props={dynamicPage?.props}/>}/>
                          { customRoutes.map(route =>
                            <Route
                              key={route.path}
                              path={route.path}
                              element={useActivityRoutes ? <></> : <DynamicComponent name={route.component} props={{}}/>}/>
                          )}
                          <Route element={<NotFoundPage/>}/>
                        </Routes>
                        <Activity mode={isBrowsePage ? 'visible' : 'hidden'}>
                          {browsePageViewExists && browsePageViewName !== undefined && (
                            <BrowsePage
                              viewName={browsePageViewName}
                              sourceTable='browse-page'/>
                          )}
                        </Activity>
                        <Activity mode={showRightSidebar ? 'visible' : 'hidden'}>
                          <ResizableSidebar
                            show={browsePageShowRightSidebar}
                            divider='before'
                            width={browsePageRightSidebarWidth}
                            onResize={onRightSidebarResize}>
                            <RightBrowseSidebarView view={currentView}/>
                          </ResizableSidebar>
                        </Activity>
                      </>
                    ) : <NotFoundPage/> }
                    <noscript className='nojs'>
                      <div style={{ textAlign: 'center' }}>
                        This website requires JavaScript to be enabled.
                      </div>
                    </noscript>
                  </div>
                  {/* Tasks - @TODO Find a better way to hide it than behind enableEditing */}
                  {enableEditing && tasks.length > 0 && (
                    <TaskBar
                      open={taskBarOpen}
                      onToggleOpen={onToggleTaskBarOpen} />
                  )}
                  {/* Footer */}
                  <Footer />
                  {/* Meta Edit Popup */}
                </SplashScreen>
              </>
            ) : undefined}
            {downloadOpen && (
              <FloatingContainer>
                {downloadVerifying ? (
                  <>
                    <div className='placeholder-download-bar--title'>
                      {strings.dialog.verifyingGame}
                    </div>
                    <div>{strings.dialog.aFewMinutes}</div>
                  </>
                ) : (
                  <>
                    <div className='placeholder-download-bar--title'>
                      {strings.dialog.downloadingGame}
                    </div>
                    <div>{`${sizeToString(downloadSize * (downloadPercent / 100))} / ${sizeToString(downloadSize)}`}</div>
                  </>
                )}
                {downloadVerifying ? <></> : (
                  <ProgressBar
                    wrapperClass='placeholder-download-bar__wrapper'
                    progressData={{
                      ...placeholderProgressData,
                      percentDone: downloadPercent,
                      usePercentDone: true
                    }}
                  />
                )}
                <SimpleButton
                  className='cancel-download-button'
                  value={strings.dialog.cancel}
                  onClick={() => window.Shared.back.send(BackIn.CANCEL_DOWNLOAD)} />
              </FloatingContainer>
            )}
          </MenuProvider>
        </DynamicComponentProvider>
      </DynamicThemeProvider>
    </LangContext.Provider>
  );
}

function addExtIntercepts() {
  (window as any)['flashpoint-launcher-renderer-ext/utils'] = {
    getPointer,
    getFileServerURL,
    getExtensionFileURL: (extId, filePath) => {
      return `${getFileServerURL()}/extdata/${extId}/${filePath}`;
    },
    idToGame,
    runCommand: (command: string, ...args: any[]) => {
      return window.Shared.back.request(BackIn.RUN_COMMAND, command, ...args);
    },
    setExtensionEnabled,
    isGame,
  } satisfies typeof import('flashpoint-launcher-renderer-ext/utils');

  (window as any)['flashpoint-launcher-renderer-ext/search'] = {
    onExtWhitelistFactory: extUtils.onWhitelistFactory,
    onExtBlacklistFactory: extUtils.onBlacklistFactory,
    onExtClearFactory: extUtils.onClearFactory,
    onExtSetAndToggleFactory: extUtils.onSetAndToggleFactory,
  } satisfies typeof import('flashpoint-launcher-renderer-ext/search');

  (window as any)['flashpoint-launcher-renderer-ext/components'] = {
    GameComponentInputField,
    GameComponentDropdownSelectField,
    SearchableSelect,
    SortableColumn,
    HomePageBox,
    SizeProvider,
    RandomGames,
    BrowsePageDisplayGrid,
    BrowsePageDisplayList,
    LeftSidebar,
    StateWrapper,
    ConfigSection,
    ConfigBox,
    ConfigBoxButton,
    ConfigBoxCheckbox,
    ConfigBoxInput,
    ConfigBoxMultiSelect,
    ConfigBoxSelect,
    ConfigBoxSelectInput,
    SimpleButton,
    CheckBox,
    InputField,
    Dropdown,
    DropdownFrame,
    DropdownCheckboxRow,
    DropdownStringRow,
  } satisfies typeof import('flashpoint-launcher-renderer-ext/components');

  (window as any)['flashpoint-launcher-renderer-ext/hooks'] = {
    useNavigate,
    useLocation,
    useAppDispatch,
    useAppSelector,
    useContextMenu,
    useLocalization,
  } satisfies typeof import('flashpoint-launcher-renderer-ext/hooks');

  (window as any)['flashpoint-launcher-renderer-ext/actions/main'] = {
    addCustomRoute,
    removeCustomRoute,
    addGameSidebarComponent,
    removeGameSidebarComponent,
    setExtConfigValue,
  } satisfies typeof import('flashpoint-launcher-renderer-ext/actions/main');

  (window as any)['flashpoint-launcher-renderer-ext/actions/preferences'] = {
    updatePreferences,
  } satisfies typeof import('flashpoint-launcher-renderer-ext/actions/preferences');
}

function initApp(dispatch: AppDispatch) {
  addExtIntercepts();

  window.setExtOrderables = ((cb) => {
    dispatch(setExtOrderablesFromCallback(cb));
  });

  dispatch(setMainState({
    themeList: window.Shared.initialThemes,
    lang: window.Shared.initialLang,
    langList: window.Shared.initialLangList,
    localeCode: window.Shared.initialLocaleCode,
  }));

  dispatch(setEntries(window.Shared.initialLogEntries));

  window.Shared.back.onStateChange = (state) => {
    dispatch(setMainState({
      socketOpen: state
    }));
  };

  // Delete old field
  localStorage.removeItem('fpfss_user');

  // Load FPFSS user info and check that profile works
  const usersBase64 = localStorage.getItem('fpfss_users');
  if (usersBase64) {
    const users = JSON.parse(Buffer.from(usersBase64, 'base64').toString('utf-8')) as Record<string, FpfssUser>;
    for (const sourceId in users) {
      const user = users[sourceId];
      const source = window.Shared.initialPreferences.gameMetadataSources.find(s => s.id === sourceId);
      if (source && source.fpfssUrl) {
        const profileUrl = `${source.fpfssUrl}/api/profile`;
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
          dispatch(setFpfssUser({
            sourceId,
            user
          }));
        })
        .catch(() => {
          // Failed auth
          delete users[sourceId];
          log.error('Launcher', `Fpfss saved auth was invalid for ${sourceId}, clearing...`);
        });
      }
    }

    const newUsers = Buffer.from(JSON.stringify(users, null, 0)).toString('base64');
    localStorage.setItem('fpfss_users', newUsers);
  }

  if (window.electronAPI !== undefined) {
    // Only exit after window closure if we're running under Electron
    window.onbeforeunload = (event: BeforeUnloadEvent) => {
      event.stopPropagation();
      setTimeout(() => {
        window.Shared.back.allowDeath();
        window.Shared.back.request(BackIn.QUIT)
        .finally(() => {
          window.close();
        });
      }, 100);
    };
  }

  registerWebsocketListeners(dispatch);
}

function registerWebsocketListeners(dispatch: AppDispatch) {
  const onDatabaseLoaded = async () => {
    const playlists = await window.Shared.back.request(BackIn.GET_PLAYLISTS);
    if (playlists) {
      dispatch(addLoaded([BackInit.PLAYLISTS]));
      const cache = await rebuildPlaylistIconCache(playlists);
      dispatch(setMainState({
        playlists,
        playlistIconCache: cache
      }));
    }

    const data = await window.Shared.back.request(BackIn.GET_RENDERER_LOADED_DATA);
    dispatch(setMainState(data));

    const prefs = store.getState().preferences;
    const views = prefs.useCustomViews ? [...prefs.customViews] : data.libraries;
    if (prefs.useCustomViews && prefs.customViews.length === 0) {
      views.push('Browse');
      dispatch(updatePreferences({
        customViews: ['Browse']
      }));
    }

    dispatch(createViews({
      views: views,
      storedViews: prefs.useStoredViews ? prefs.storedViews : undefined,
      areLibraries: !prefs.useCustomViews,
      loadViewsText: prefs.loadViewsText,
      playlists,
    }));

    dispatch(setTagCategories(data.tagCategories));

    dispatch(addLoaded([BackInit.DATABASE]));

    const gamesTotal = await window.Shared.back.request(BackIn.GET_GAMES_TOTAL);
    if (gamesTotal) {
      dispatch(setMainState({
        gamesTotal
      }));
    }

    if (prefs.gameMetadataSources.length > 0) {
      for (const source of prefs.gameMetadataSources) {
        window.Shared.back.request(BackIn.PRE_UPDATE_INFO, source)
        .then((total) => {
          console.log('found ' + total + ' updates');
          dispatch(setUpdateInfo({
            id: source.id,
            total
          }));
        });
      }
    }

    window.Shared.back.request(BackIn.DOWNLOADER_GET_STATE)
    .then((downloaderState) => {
      dispatch(setDownloaderState(downloaderState));
    });

    // this.props.navigate(this.props.preferencesData.defaultOpeningPage);
  };

  const onExtensionsLoad = () => {
    window.Shared.back.request(BackIn.GET_RENDERER_EXTENSION_INFO)
    .then(data => {
      dispatch(setMainState(data));
      dispatch(addLoaded([BackInit.EXTENSIONS]));
    });
  };

  window.Shared.back.register(BackOut.UNRECOVERABLE_ERROR, (event, error) => {
    dispatch(setUnrecoverableError(error));
  });

  window.Shared.back.register(BackOut.TOAST, (event, toastId, content, data) => {
    if (!toastId) {
      throw 'Toast ID required.';
    }
    if (toast.isActive(toastId)) {
      toast.update(toastId, {
        ...data,
        render: <div>{content}</div>
      });
    } else {
      toast(content, {
        ...data,
        toastId,
      } as any);
    }
  });

  window.Shared.back.register(BackOut.CANCEL_TOAST, (event, toastId) => {
    if (toast.isActive(toastId)) {
      toast.dismiss(toastId);
    }
  });

  window.Shared.back.register(BackOut.INIT_EVENT, (event, data) => {
    for (const index of data.done) {
      switch (+index) { // DO NOT REMOVE - Fails to convert to enum without explicitint conversion
        case BackInit.DATABASE: {
          onDatabaseLoaded();
          break;
        }
        case BackInit.EXTENSIONS: {
          onExtensionsLoad();
          break;
        }
        default: {
          dispatch(addLoaded([index]));
        }
      }
    }
  });

  window.Shared.back.register(BackOut.LOG_ENTRY_ADDED, (event, entry, index) => {
    dispatch(addLogEntries([entry]));
  });

  window.Shared.back.register(BackOut.LOCALE_UPDATE, (event, data) => {
    dispatch(setMainState({
      localeCode: data
    }));
  });

  window.Shared.back.register(BackOut.SERVICE_CHANGE, (event, data) => {
    dispatch(changeService(data));
  });

  window.Shared.back.register(BackOut.SERVICE_REMOVED, (event, id) => {
    dispatch(removeService(id));
  });

  window.Shared.back.register(BackOut.LANGUAGE_CHANGE, (event, data) => {
    dispatch(setMainState({
      lang: data
    }));
  });

  window.Shared.back.register(BackOut.LANGUAGE_LIST_CHANGE, (event, data) => {
    dispatch(setMainState({
      langList: data
    }));
  });

  window.Shared.back.register(BackOut.UPDATE_COMPONENT_STATUSES, (event, statuses) => {
    dispatch(setMainState({
      componentStatuses: statuses
    }));
  });

  window.Shared.back.register(BackOut.SET_VIEW_SEARCH_STATUS, (event, viewId, status) => {
    // TODO: Reimplement or scrap?
  });

  window.Shared.back.register(BackOut.THEME_CHANGE, (event, theme) => {
    dispatch(updateThemeCss());
  });

  window.Shared.back.register(BackOut.SYSTEM_THEME_CHANGE, (event) => {
    dispatch(updateSystemThemeCss());
  });

  window.Shared.back.register(BackOut.THEME_LIST_CHANGE, (event, data) => {
    dispatch(setMainState({
      themeList: data
    }));
  });

  window.Shared.back.register(BackOut.PLAYLISTS_CHANGE, async (event, data) => {
    const cache = await rebuildPlaylistIconCache(data);
    dispatch(setMainState({
      playlists: data,
      playlistIconCache: cache
    }));
  });

  window.Shared.back.register(BackOut.UPDATE_PREFERENCES, (event, data) => {
    dispatch(updatePreferencesWithoutSend(data));
  });

  window.Shared.back.register(BackOut.UPDATE_PREFERENCES_RESPONSE, (event, data) => {
    dispatch(setPreferences(data));
  });

  window.Shared.back.register(BackOut.SET_EXT_CONFIG_VALUE, (event, key, value) => {
    dispatch(setExtConfigValue({ key, value }));
  });

  window.Shared.back.register(BackOut.TAG_CATEGORIES_CHANGE, (event, data) => {
    dispatch(setTagCategories(data));
  });

  window.Shared.back.register(BackOut.DEV_CONSOLE_CHANGE, (event, text) => {
    dispatch(setMainState({
      devConsole: text
    }));
  });

  window.Shared.back.register(BackOut.OPEN_ALERT, (event, text) => {
    alert(text);
  });

  window.Shared.back.register(BackOut.SET_PLACEHOLDER_DOWNLOAD_DETAILS, (event, details) => {
    const { downloadSize } = details;
    dispatch(setMainState({
      downloadSize
    }));
  });

  window.Shared.back.register(BackOut.SET_PLACEHOLDER_DOWNLOAD_PERCENT, (event, percent) => {
    if (percent === 100) {
      dispatch(setMainState({
        downloadVerifying: true,
        downloadPercent: percent
      }));
    } else {
      dispatch(setMainState({
        downloadPercent: percent
      }));
    }
  });

  window.Shared.back.register(BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG, () => {
    dispatch(setMainState({
      downloadOpen: true,
      downloadVerifying: false,
      downloadPercent: 0
    }));
  });

  window.Shared.back.register(BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG, () => {
    dispatch(setMainState({
      downloadOpen: false,
      downloadPercent: 0
    }));
  });

  window.Shared.back.register(BackOut.CURATE_TEMPLATES_CHANGE, (event, templates) => {
    dispatch(setCurationTemplates(templates));
  });

  window.Shared.back.request(BackIn.CURATE_GET_LIST)
  .then(curations => {
    for (const pinnedGroup of window.Shared.initialPreferences.curateGroups) {
      dispatch(createGroup(pinnedGroup));
    }
    dispatch(replaceCurations(curations));
    dispatch(setCurateLoaded());
    window.Shared.back.request(BackIn.CURATE_GET_TEMPLATES)
    .then(templates => {
      dispatch(setCurationTemplates(templates));
    });
  });

  window.Shared.back.register(BackOut.CURATE_CONTENTS_CHANGE, (event, folder, contents) => {
    dispatch(setContentTree({
      folder,
      contentTree: contents
    }));
  });

  window.Shared.back.register(BackOut.CURATE_LIST_CHANGE, (event, added, removed) => {
    dispatch(modifyCurations({
      added,
      removed
    }));
  });

  window.Shared.back.register(BackOut.CURATE_SELECT_LOCK, (event, folder, locked) => {
    dispatch(setLock({
      folder,
      locked
    }));
  });

  window.Shared.back.register(BackOut.CURATE_SELECT_CURATIONS, (event, folders) => {
    dispatch(setSelectedCurations(folders));
  });

  window.Shared.back.register(BackOut.UPDATE_TASK, (event, task) => {
    dispatch(setTask(task));
  });

  window.Shared.back.register(BackOut.CREATE_TASK, (event, task) => {
    dispatch(addTask(task));
  });

  window.Shared.back.register(BackOut.FOCUS_WINDOW, () => {
    window.focus();
  });

  window.Shared.back.register(BackOut.NEW_DIALOG, (event, dialog) => {
    dispatch(createDialog(dialog));
  });

  window.Shared.back.register(BackOut.UPDATE_DIALOG_MESSAGE, (event, message, dialogId) => {
    dispatch(updateDialog({
      id: dialogId,
      message
    }));
  });

  window.Shared.back.register(BackOut.UPDATE_DIALOG_FIELD_VALUE, (event, dialogId, name, value) => {
    dispatch(updateDialogField({
      id: dialogId,
      field: {
        name,
        value
      }
    }));
  });

  window.Shared.back.register(BackOut.CANCEL_DIALOG, (event, dialogId) => {
    dispatch(cancelDialog(dialogId));
  });

  window.Shared.back.register(BackOut.UPDATE_GOTD, (event, gotd) => {
    dispatch(setMainState({
      gotdList: gotd
    }));
  });

  window.Shared.back.register(BackOut.UPDATE_FEED, (event, feed) => {
    dispatch(setMainState({
      updateFeedMarkdown: feed
    }));
  });

  window.Shared.back.register(BackOut.UPDATE_PLATFORM_APP_PATHS, (event, paths) => {
    dispatch(setMainState({
      platformAppPaths: paths
    }));
  });

  window.Shared.back.register(BackOut.POST_SYNC_CHANGES, (event, libraries, suggestions, platformAppPaths, cats, total, updatedSource) => {
    dispatch(setMainState({
      libraries,
      suggestions,
      platformAppPaths,
      gamesTotal: total,
    }));
    dispatch(updateMetadataSource(updatedSource));
    dispatch(setTagCategories(cats));
  });

  window.Shared.back.register(BackOut.SHORTCUT_REGISTER_COMMAND, (event, command, shortcuts) => {
    // this.registerShortcut(command, shortcuts);
  });

  window.Shared.back.register(BackOut.SHORTCUT_UNREGISTER, (event, shortcuts) => {
    // if (this.props.shortcut && this.props.shortcut.unregisterShortcut) {
    //   this.props.shortcut.unregisterShortcut(shortcuts);
    // } else {
    //   log.error('Launcher', `Failed to register shortcut for ${shortcuts}, shortcut context missing?`);
    // }
  });

  window.Shared.back.register(BackOut.BROWSE_VIEW_PAGE, (event, data) => {
    // Dispath addData for the given view
    dispatch(addData({
      view: data.viewId,
      data: {
        searchId: data.searchId,
        page: data.page,
        games: data.games,
      }
    }));
  });

  window.Shared.back.register(BackOut.FPFSS_ACTION, async (event, source: GameMetadataSource, extId: string) => {
    return new Promise<FpfssActionPayload>((resolve, reject) => {
      const previousConsent = getFpfssConsentExt(extId);
      if (previousConsent) {
        // Consent already given, perform action
        dispatch(performFpfssAction({
          source,
          cb: async (source, user) => {
            resolve({
              source,
              user
            });
          }
        }));
      } else {
        // Consent not given, ask user first
        const dialog: DialogStateTemplate = {
          message: `Extension with ID ${extId} is requesting access to your FPFSS token. Allow?\nThis means the extension will be able access your FPFSS account and perform actions on your behalf.`,
          buttons: ['Allow', 'Deny'],
        };
        resolveNewDialog(dispatch, dialog)
        .then(({ button }) => {
          if (button === 0) {
            dispatch(performFpfssAction({
              source,
              cb: async (source, user) => {
                if (user) {
                  saveFpfssConsentExt(extId, true);
                  resolve({
                    source,
                    user
                  });
                } else {
                  reject(new Error('Launcher was unable to get FPFSS token'));
                }
              } }));
          } else {
            reject(new Error('User denied access to FPFSS token'));
          }
        });
      }
    });
  });

  window.Shared.back.register(BackOut.UPDATE_DOWNLOADER_WHOLE_STATE, async (event, state) => {
    dispatch(setDownloaderState(state));
  });

  window.Shared.back.register(BackOut.UPDATE_DOWNLOADER_TASK, async (event, task) => {
    dispatch(updateDownloaderTask(task));
  });

  window.Shared.back.register(BackOut.UPDATE_DOWNLOADER_TASKS, async (event, tasks) => {
    dispatch(updateDownloaderTasks(tasks));
  });

  window.Shared.back.register(BackOut.UPDATE_DOWNLOADER_STATUS, async (event, status) => {
    dispatch(updateDownloaderStatus(status));
  });

  window.Shared.back.register(BackOut.UPDATE_DOWNLOADER_STATE_WORKER, async (event, workerState) => {
    // dispatch(updateDownloaderWorker(workerState));
  });

  window.Shared.back.register(BackOut.OPEN_DYNAMIC_PAGE, async (event, name, props) => {
    dispatch(openDynamicPage({ name, props }));
  });

  window.Shared.back.register(BackOut.UPDATE_EXTENSION_STATE, async (event, extId, enabled) => {
    dispatch(setExtState({
      extId,
      enabled
    }));
  });

  window.Shared.back.register(BackOut.REMOVED_EXTENSION, async (event, extId) => {
    dispatch(removeExtension(extId));
  });

  window.Shared.back.register(BackOut.ADDED_EXTENSION, async (event, ext) => {
    dispatch(addNewExtension(ext));
  });

  window.Shared.back.register(BackOut.UPDATE_GAME, async (event, game) => {
    dispatch(updateGame(game));
  });

  window.Shared.back.request(BackIn.INIT_LISTEN)
  .then(data => {
    if (!data) { throw new Error('INIT_LISTEN response is missing data.'); }
    for (const index of data.done) {
      switch (+index) { // DO NOT REMOVE - Fails to convert to enum without explicitint conversion
        case BackInit.DATABASE: {
          onDatabaseLoaded();
          break;
        }
        case BackInit.EXTENSIONS: {
          onExtensionsLoad();
          break;
        }
        default: {
          dispatch(addLoaded([index]));
        }
      }
    }
  });
}

async function rebuildPlaylistIconCache(playlists: Playlist[]) {
  return Promise.all(playlists.map(p => (async () => {
    if (p.icon) { return cacheIcon(p.icon); }
  })()))
  .then(urls => {
    const cache: Record<string, string> = {};
    for (let i = 0; i < playlists.length; i++) {
      const url = urls[i];
      if (url) { cache[playlists[i].id] = url; }
    }
    return cache;
  });
}

async function cacheIcon(icon: string): Promise<string> {
  const r = await fetch(icon);
  const blob = await r.blob();
  return `url(${URL.createObjectURL(blob)})`;
}

function pathToFileUrl(p: string) {
  try {
    return `file:///${path.resolve(p)}`;
  } catch {
    return '';
  }
}
