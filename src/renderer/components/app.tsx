import { createSelector } from '@reduxjs/toolkit';
import { getPointer, MenuProvider } from '@renderer/context/MenuContext';
import { useView } from '@renderer/hooks/search';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { useContextMenu } from '@renderer/hooks/useContextMenu';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { createGroup, modifyCurations, replaceCurations, setContentTree, setCurateLoaded, setLock, setSelectedCurations } from '@renderer/store/curate/slice';
import { setDownloaderState, updateDownloaderStatus, updateDownloaderTask, updateDownloaderTasks } from '@renderer/store/downloads/slice';
import { setFpfssUser } from '@renderer/store/fpfss/slice';
import { pushHistory } from '@renderer/store/history/slice';
import { addLogEntries, setEntries } from '@renderer/store/logs/slice';
import { addLoaded, cancelDialog, changeService, createDialog, openDynamicPage, removeService, setDisplaySettingsFromCallback, setExtOrderablesFromCallback, setMainState, setUpdateInfo, updateDialog, updateDialogField, updateMetadataSource } from '@renderer/store/main/slice';
import { setPreferences, updatePreferences } from '@renderer/store/preferences/slice';
import { addData, createViews, GENERAL_VIEW_ID, resetDropdownData } from '@renderer/store/search/slice';
import store, { AppDispatch, RootState } from '@renderer/store/store';
import { setTagCategories } from '@renderer/store/tagCategories/slice';
import { addTask, setTask, setTaskBarOpen } from '@renderer/store/tasks/slice';
import * as extUtils from '@renderer/util/ext';
import { BackIn, BackInit, BackOut, FpfssUser } from '@shared/back/types';
import { APP_TITLE } from '@shared/constants';
import { Paths } from '@shared/Paths';
import { setTheme } from '@shared/Theme';
import { getFileServerURL, sizeToString } from '@shared/Util';
import {
  Playlist
} from 'flashpoint-launcher';
import * as path from 'node:path';
import * as React from 'react';
import { Activity, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { axios } from '../Util';
import { LangContext } from '../util/lang';
import { ActivityRoutes } from './ActivityRoutes';
import { Dialog } from './Dialog';
import { GameComponentDropdownSelectField, GameComponentInputField } from './DisplayComponent';
import { DynamicComponentProvider, RemoteModule } from './DynamicComponentProvider';
import { DynamicThemeProvider } from './DynamicThemeProvider';
import { FloatingContainer } from './FloatingContainer';
import { Footer } from './Footer';
import { SortableColumn } from './GameListHeader';
import { Header } from './Header';
import { HomePageBox } from './HomePageBox';
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

const hiddenRightSidebarPages = [Paths.ABOUT, Paths.CURATE, Paths.CONFIG, Paths.MANUAL, Paths.LOGS, Paths.TAGS, Paths.CATEGORIES, Paths.DOWNLOADS, Paths.FPFSS];

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
  const mainOutput = useAppSelector(state => state.main.mainOutput);
  const openDialogs = useAppSelector(state => state.main.openDialogs);
  const loadedAll = useAppSelector(state => state.main.loadedAll);
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
  const currentView = useView();
  const firstBrowsePageViewName = useAppSelector(state => Object.keys(state.search.views).find(v => v !== GENERAL_VIEW_ID));
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

  React.useEffect(() => {
    setPageTitle(location.pathname);
  }, [location.pathname]);

  if (!isInitDone) {
    setIsInitDone(true);
    initApp(dispatch);
  }

  const copyCrashLog = () => {
    navigator.clipboard.writeText(mainOutput || '');
  };

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

  return (
    <LangContext.Provider value={strings}>
      <DynamicThemeProvider fileList={dynamicThemeFileList} >
        <DynamicComponentProvider manifests={remoteModules}>
          <MenuProvider>

            <ToastContainer
              theme='dark'
              className='toast-container'
              progressClassName='toast-container-progress'
              hideProgressBar={true}
              position='bottom-center'/>
            {!stopRender ? (
              <>
                {/* Backend Crash Log and Report */}
                {!socketOpen && !mainOutput && (
                  <FloatingContainer>
                    <div className='main-output-header'>Disconnected from Backend</div>
                    <div>Reconnecting...</div>
                  </FloatingContainer>
                )}
                {mainOutput && (
                  <FloatingContainer>
                    <div className='main-output-header'>Backend Crash Log</div>
                    <div className='main-output-content'>{mainOutput}</div>
                    <div className='main-output-buttons'>
                      <SimpleButton
                        value={'Copy Crash Log'}
                        onClick={copyCrashLog} />
                      { window.electronAPI !== undefined && (
                        <SimpleButton
                          value={'Restart Launcher'}
                          onClick={() => {
                            dispatch(setMainState({
                              quitting: true
                            }));
                            window.electronAPI?.restart();
                          }} />
                      )}
                    </div>
                  </FloatingContainer>
                )}
                {/* First Open Dialog */}
                {openDialogs.length > 0 && socketOpen && (
                  <Dialog dialog={openDialogs[0]} />
                )}
                {/* Splash screen */}
                <SplashScreen />
                {/* Title-bar (if enabled) */}
                {useCustomTitleBar ?
                  customVersion ? (
                    <TitleBar title={customVersion} />
                  ) : (
                    <TitleBar title={`${APP_TITLE} ${window.Shared.isDev ? '(Dev Mode)' : ''}`} />
                  ) : undefined}
                {/* "Content" */}
                {loadedAll ? (
                  <>
                    {/* Header */}
                    <Header />
                    {/* Main */}
                    <div className='main' ref={contentRef} >
                      { currentView !== undefined ? (
                        <>
                          { useActivityRoutes && (
                            <ActivityRoutes
                              manualUrl={manualUrl} />
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
                            <Route element={<NotFoundPage/>}/>
                          </Routes>
                          <Activity mode={isBrowsePage ? 'visible' : 'hidden'}>
                            {browsePageViewName !== undefined && (
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
                  </>
                ) : undefined}
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

function initApp(dispatch: AppDispatch) {
  // Set up renderer ext model
  window.ext = {
    utils: {
      getPointer,
      getFileServerURL: getFileServerURL,
      getExtensionFileURL: (extId, filePath) => {
        return `${getFileServerURL()}/extdata/${extId}/${filePath}`;
      },
      search: {
        onWhitelistFactory: extUtils.onWhitelistFactory,
        onBlacklistFactory: extUtils.onBlacklistFactory,
        onClearFactory: extUtils.onClearFactory,
        onSetAndToggleFactory: extUtils.onSetAndToggleFactory,
      }
    },
    components: {
      GameComponentInputField,
      GameComponentDropdownSelectField,
      SearchableSelect,
      SortableColumn,
      HomePageBox,
      SizeProvider,
      RandomGames,
    },
    hooks: {
      useNavigate: () => useNavigate(),
      useAppDispatch,
      useAppSelector,
      useContextMenu,
      useLocalization,
    },
  };
  window.setDisplaySettings = ((cb) => {
    dispatch(setDisplaySettingsFromCallback(cb));
  });
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

  // Load FPFSS user info and check that profile works
  const userBase64 = localStorage.getItem('fpfss_user');
  if (userBase64) {
    try {
      const user = JSON.parse(Buffer.from(userBase64, 'base64').toString('utf-8')) as FpfssUser;
      // Test profile uri
      const profileUrl = `${window.Shared.initialPreferences.fpfssBaseUrl}/api/profile`;
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
        dispatch(setFpfssUser(user));
      })
      .catch(() => {
        // Failed auth
        localStorage.removeItem('fpfss_user');
      });
    } catch (err) {
      log.error('Launcher', 'Fpfss saved auth was invalid, clearing...');
      localStorage.removeItem('fpfss_user');
    }
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
    setTheme(theme);
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

  window.Shared.back.register(BackOut.UPDATE_PREFERENCES_RESPONSE, (event, data) => {
    dispatch(setPreferences(data));
  });

  window.Shared.back.register(BackOut.UPDATE_EXT_CONFIG_DATA, (event, data) => {
    dispatch(setMainState({
      extConfig: data
    }));
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

  window.Shared.back.request(BackIn.CURATE_GET_LIST)
  .then(curations => {
    for (const pinnedGroup of window.Shared.initialPreferences.curateGroups) {
      dispatch(createGroup(pinnedGroup));
    }
    dispatch(replaceCurations(curations));
    dispatch(setCurateLoaded());
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

  window.Shared.back.register(BackOut.FPFSS_ACTION, async (event, extId: string) => {
    return undefined;
    // return new Promise((resolve, reject) => {
    //   const previousConsent = getFpfssConsentExt(extId);
    //   if (previousConsent) {
    //     this.performFpfssAction(async (user) => {
    //       resolve(user);
    //     });
    //   } else {
    //     const msg = formatString(this.props.main.lang.dialog.extFpfssConsent, extId) as string;
    //     resolveNewDialog(this.props.dispatch, {
    //       message: msg,
    //       buttons: [this.props.main.lang.misc.yes, this.props.main.lang.misc.no],
    //       cancelId: 1
    //     })
    //     .then(({ button }) => {
    //       if (button === 0) {
    //         this.performFpfssAction(async (user) => {
    //           if (user) {
    //             saveFpfssConsentExt(extId, true);
    //             resolve(user);
    //           } else {
    //             reject(new Error('Launcher was unable to get FPFSS token'));
    //           }
    //         });
    //       } else {
    //         reject(new Error('User denied access to FPFSS token'));
    //       }
    //     }).catch((error) => {
    //       reject(new Error('Failed to show FPFSS consent dialog: ' + error));
    //     });
    //   }
    // });
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

  window.Shared.back.request(BackIn.INIT_LISTEN)
  .then(data => {
    if (!data) { throw new Error('INIT_LISTEN response is missing data.'); }
    for (const index of data.done) {
      console.log('found ' + index);
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

// export class AppClass extends React.Component<AppProps> {
//   appRef: React.RefObject<HTMLDivElement | null>;

//   constructor(props: AppProps) {
//     super(props);

//     this.appRef = React.createRef();

//     // Set up renderer ext model
//     window.ext = {
//       utils: {
//         getFileServerURL: getFileServerURL,
//         getExtensionFileURL: (extId, filePath) => {
//           return `${getFileServerURL()}/extdata/${extId}/${filePath}`;
//         },
//         search: {
//           onWhitelistFactory: extUtils.onWhitelistFactory,
//           onBlacklistFactory: extUtils.onBlacklistFactory,
//           onClearFactory: extUtils.onClearFactory,
//           onSetAndToggleFactory: extUtils.onSetAndToggleFactory,
//         }
//       },
//       components: {
//         GameComponentInputField: GameComponentInputField,
//         GameComponentDropdownSelectField: GameComponentDropdownSelectField,
//         SearchableSelect: SearchableSelect,
//         SortableColumn: SortableColumn,
//       },
//       hooks: {
//         useNavigate: () => useNavigate(),
//         useAppDispatch: useAppDispatch,
//         useAppSelector: useAppSelector,
//       },
//     };
//     window.setDisplaySettings = ((cb) => {
//       this.props.mainActions.setDisplaySettingsFromCallback(cb);
//     });
//     window.setExtOrderables = ((cb) => {
//       this.props.mainActions.setExtOrderablesFromCallback(cb);
//     });

//     // Dispatch the initial state info
//     props.setMainState({
//       themeList: window.Shared.initialThemes,
//       lang: window.Shared.initialLang,
//       langList: window.Shared.initialLangList,
//       localeCode: window.Shared.initialLocaleCode,
//     });

//     props.logsActions.setEntries(window.Shared.initialLogEntries);

//     // Initialize app
//     this.init();
//   }

//   addLogEntry = batchProcessor((entries: ILogEntry[]) => {
//     this.props.logsActions.addLogEntries(entries);
//   }, 500);

//   registerIpcListeners() {
//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//     const handleProtocol = (url: string) => {
//       const { currentView } = this.props;
//       const parts = url.split('/');
//       log.debug('Launcher', 'Handling Protocol - ' + url);
//       if (parts.length > 2) {
//         // remove "flashpoint:" and "" elements
//         parts.splice(0, 2);
//         switch (parts[0]) {
//           case 'open': {
//             if (parts.length >= 2) {
//               // Open game in sidebar
//               window.Shared.back.request(BackIn.GET_GAME, parts[1])
//               .then(fetchedInfo => {
//                 if (fetchedInfo) {
//                   this.props.setMainState({
//                     currentGame: fetchedInfo,
//                     selectedGameId: fetchedInfo.id,
//                     selectedPlaylistId: undefined,
//                     currentPlaylist: undefined,
//                     currentPlaylistEntry: undefined
//                   });
//                 } else { log.error('Launcher', `Failed to get game. Game is undefined (GameID: "${parts[1]}").`); }
//               });
//             }
//             break;
//           }
//           case 'run': {
//             if (parts.length >= 2) {
//               window.Shared.back.request(BackIn.GET_GAME, parts[1])
//               .then(async (game) => {
//                 if (game) {
//                   // Open game in sidebar
//                   this.props.setMainState({
//                     currentGame: game,
//                     selectedGameId: game.id,
//                     selectedPlaylistId: undefined,
//                     currentPlaylist: undefined,
//                     currentPlaylistEntry: undefined
//                   });
//                   // Update game data (install state)
//                   if (game && game.activeDataId) {
//                     this.props.searchActions.selectGame({
//                       view: currentView.id,
//                       game,
//                     });
//                   }
//                   // Launch game
//                   await this.onGameLaunch(game.id, null);
//                 } else { log.error('Launcher', `Failed to get game. Game is undefined (GameID: "${parts[1]}").`); }
//               });
//             }
//             break;
//           }
//           // FPFSS related protocol actions
//           case 'fpfss': {
//             if (parts.length < 3) {
//               alert('Invalid Protocol: ' + url);
//             } else {
//               switch (parts[1]) {
//                 case 'open_curation': {
//                   if (parts.length > 4) {
//                     this.performFpfssAction(async (user) => {
//                       const fpfssInfo: CurationFpfssInfo = {
//                         id: parts[4]
//                       };
//                       // Build url
//                       const url = `${this.props.preferencesData.fpfssBaseUrl}/${parts.slice(2).join('/')}`;
//                       // Generate task
//                       const newTask = newCurateTask('Importing FPFSS Submission...', 'Importing...');
//                       this.props.addTask(newTask);
//                       // Import
//                       await window.Shared.back.request(BackIn.FPFSS_OPEN_CURATION, fpfssInfo, url, user.accessToken, newTask.id)
//                       .catch((err) => {
//                         newTask.error = err;
//                         newTask.finished = true;
//                         this.props.setTask(newTask);
//                         throw err;
//                       });
//                     });
//                   }
//                   break;
//                 }
//                 case 'edit_game': {
//                   const url = `${this.props.preferencesData.fpfssBaseUrl}/${parts.slice(2).join('/')}`;
//                   this.openFpfssEditGame(url);
//                   break;
//                 }
//                 default:
//                   alert('Invalid FPFSS action: ' + parts[1]);
//                   break;
//               }
//             }
//             break;
//           }
//           case 'playlist': {
//             if (parts.length > 2 && parts[1] === 'add') {
//               // Get url from params
//               const parsedUrl = new URL(url);
//               const playlistUrl = parsedUrl.searchParams.get('url');
//               if (playlistUrl) {
//                 // Download playlist and load
//                 window.Shared.back.request(BackIn.DOWNLOAD_PLAYLIST, playlistUrl)
//                 .then((playlist) => {
//                   if (playlist) {
//                     alert(`Downloaded playlist: ${playlist.title}`);
//                   } else {
//                     alert(`Failed to download playlist: ${url}`);
//                   }
//                 })
//                 .catch((error) => {
//                   alert(`Error downloading playlist: ${error}`);
//                 });
//               }
//             }
//             break;
//           }
//           default:
//             createNewDialog(this.props.dispatch, {
//               largeMessage: true,
//               message: `Protocol error: Unsupported action "${parts[0]}"`,
//               buttons: ['Ok']
//             });
//             break;
//         }
//       }
//     };
//     if (window.electronAPI !== undefined) {
//       // // Listen for the window to move or resize (and update the preferences when it does)
//       // window.electronAPI.ipcRenderer.on('window-move', debounce((sender, x: number, y: number, isMaximized: boolean) => {
//       //   if (!isMaximized) {
//       //     this.props.updatePreferences({ mainWindow: { x: x | 0, y: y | 0 } });
//       //   }
//       // }, 100));
//       // window.electronAPI.ipcRenderer.on('window-resize', debounce((sender, width: number, height: number, isMaximized: boolean) => {
//       //   if (!isMaximized) {
//       //     // Cap minimum size
//       //     if (width < 200) {
//       //       width = 200;
//       //     }
//       //     if (height < 200) {
//       //       height = 200;
//       //     }
//       //     this.props.updatePreferences({ mainWindow: { width: width | 0, height: height | 0 } });
//       //   }
//       // }, 100));
//       // window.electronAPI.ipcRenderer.on('window-maximize', (sender, isMaximized: boolean) => {
//       //   this.props.updatePreferences({ mainWindow: { maximized: isMaximized } });
//       // });
//       // window.electronAPI.ipcRenderer.on('protocol', (sender, url: string) => {
//       //   handleProtocol(url);
//       // });
//       // // Displays main proc output
//       // window.electronAPI.ipcRenderer.on('main-output', (sender, output: string) => {
//       //   this.props.setMainState({
//       //     mainOutput: output
//       //   });
//       // });
//     }

//     // if (window.Shared.url) {
//     //   handleProtocol(window.Shared.url);
//     // }
//   }

//   registerShortcut(command: string, shortcut: string[]) {
//     const commandName = command.split(':').slice(1).join(':');
//     if (this.props.shortcut && this.props.shortcut.registerShortcut && this.props.shortcut.unregisterShortcut) {
//       try {
//         this.props.shortcut.unregisterShortcut(shortcut);
//       } catch { /** ignore any errors from unregister check */ }
//       this.props.shortcut.registerShortcut(() => {
//         window.Shared.back.send(BackIn.RUN_COMMAND, commandName, []);
//       }, shortcut, command, 'Extension Shortcut');
//     } else {
//       log.error('Launcher', `Failed to register shortcut for ${command}, shortcut context missing?`);
//     }
//   }

//   onDatabaseLoaded() {
//     window.Shared.back.request(BackIn.GET_PLAYLISTS)
//     .then(playlists => {
//       if (playlists) {
//         this.props.mainActions.addLoaded([BackInit.PLAYLISTS]);
//         this.props.setMainState({ playlists });
//         this.cachePlaylistIcons(playlists);
//       } else {
//         console.error('no get_playlists data?');
//       }

//       window.Shared.back.request(BackIn.GET_RENDERER_LOADED_DATA)
//       .then(data => {
//         // for (const entry of Object.entries(data.shortcuts)) {
//         //   const command = entry[0];
//         //   const shortcuts = entry[1];
//         //   this.registerShortcut(command, shortcuts);
//         // }
//         this.props.setMainState(data);
//         if (this.props.preferencesData.useCustomViews) {
//           const customViews = this.props.preferencesData.customViews;
//           if (customViews.length === 0) {
//             customViews.push('Browse');
//             this.props.updatePreferences({
//               customViews,
//             });
//           }
//           if (this.props.preferencesData.useStoredViews) {
//             this.props.searchActions.createViews({
//               views: customViews,
//               storedViews: this.props.preferencesData.storedViews,
//               areLibraries: false,
//               loadViewsText: this.props.preferencesData.loadViewsText,
//               playlists,
//             });
//           } else {
//             this.props.searchActions.createViews({
//               views: customViews,
//               areLibraries: false,
//               loadViewsText: this.props.preferencesData.loadViewsText,
//               playlists,
//             });

//           }
//         } else {
//           if (this.props.preferencesData.useStoredViews) {
//             this.props.searchActions.createViews({
//               views: data.libraries,
//               storedViews: this.props.preferencesData.storedViews,
//               areLibraries: true,
//               loadViewsText: this.props.preferencesData.loadViewsText,
//               playlists,
//             });
//           } else {
//             this.props.searchActions.createViews({
//               views: data.libraries,
//               areLibraries: true,
//               loadViewsText: this.props.preferencesData.loadViewsText,
//               playlists,
//             });
//           }
//         }

//         this.props.setTagCategories(data.tagCategories);
//         this.props.navigate(this.props.preferencesData.defaultOpeningPage);
//       })
//       .then(() => {
//         this.props.mainActions.addLoaded([BackInit.DATABASE]);
//       })
//       .then(async () => {
//         const data = await window.Shared.back.request(BackIn.GET_GAMES_TOTAL);
//         if (data) {
//           this.props.setMainState({
//             gamesTotal: data
//           });
//         }
//       })
//       .then(() => {
//         if (this.props.main.randomGames.length < RANDOM_GAME_ROW_COUNT) {
//           this.rollRandomGames(true);
//         }
//       })
//       .then(() => {
//         if (this.props.preferencesData.gameMetadataSources.length > 0) {
//           for (const source of this.props.preferencesData.gameMetadataSources) {
//             window.Shared.back.request(BackIn.PRE_UPDATE_INFO, source)
//             .then((total) => {
//               this.props.mainActions.setUpdateInfo({
//                 id: source.id,
//                 total
//               });
//             });
//           }
//         }
//       });
//     });
//   }

//   onCurateLoad() {
//     window.Shared.back.request(BackIn.CURATE_GET_LIST)
//     .then(curations => {
//       this.props.curateActions.replaceCurations(curations);
//       this.props.curateActions.setCurateLoaded();
//     });
//   }

//   onExtensionsLoad() {
//     window.Shared.back.request(BackIn.GET_RENDERER_EXTENSION_INFO)
//     .then(data => {
//       this.props.setMainState(data);
//       this.props.mainActions.addLoaded([BackInit.EXTENSIONS]);
//     });
//   }

//   registerWebsocketListeners() {
//     window.Shared.back.register(BackOut.INIT_EVENT, (event, data) => {
//       for (const index of data.done) {
//         switch (+index) { // DO NOT REMOVE - Fails to convert to enum without explicitint conversion
//           case BackInit.DATABASE: {
//             this.onDatabaseLoaded();
//             break;
//           }
//           case BackInit.EXTENSIONS: {
//             this.onExtensionsLoad();
//             break;
//           }
//           default: {
//             this.props.mainActions.addLoaded([index]);
//           }
//         }
//       }
//     });

//     window.Shared.back.register(BackOut.LOG_ENTRY_ADDED, (event, entry, index) => {
//       this.addLogEntry(entry);
//     });

//     window.Shared.back.register(BackOut.LOCALE_UPDATE, (event, data) => {
//       this.props.setMainState({
//         localeCode: data
//       });
//     });

//     window.Shared.back.register(BackOut.SERVICE_CHANGE, (event, data) => {
//       const { currentView } = this.props;
//       if (data.id) {
//         // Check if game just stopped, update to reflect time played changes if so
//         if (currentView.selectedGame && data.state === ProcessState.STOPPED) {
//           if (data.id.startsWith('game.') && data.id.length > 5) {
//             const id = data.id.slice(5);
//             if (id === currentView.selectedGame.id) {
//               // Reload game in sidebar
//               window.Shared.back.request(BackIn.GET_GAME, currentView.selectedGame.id)
//               .then((game) => {
//                 if (game && currentView.selectedGame && currentView.selectedGame.id === game.id) {
//                   this.props.searchActions.selectGame({
//                     view: currentView.id,
//                     game,
//                   });
//                 }
//               })
//               .catch(() => {
//                 /** Game does not exist */
//               });
//             }
//           }
//         }
//         const newServices = [...this.props.main.services];
//         const service = newServices.find(item => item.id === data.id);
//         if (service) {
//           recursiveReplace(service, data);
//         } else {
//           newServices.push(recursiveReplace({
//             id: 'invalid',
//             name: 'Invalid',
//             state: ProcessState.STOPPED,
//             pid: -1,
//             startTime: 0,
//             info: {
//               path: '',
//               filename: '',
//               arguments: [],
//               kill: false,
//             },
//           }, data));
//         }
//         this.props.setMainState({ services: newServices });
//       } else { throw new Error('Service update did not reference a service.'); }
//     });

//     window.Shared.back.register(BackOut.SERVICE_REMOVED, (event, id) => {
//       const newServices = [...this.props.main.services];
//       const index = newServices.findIndex(s => s.id === id);
//       if (index > -1) {
//         newServices.splice(index, 1);
//         this.props.setMainState({ services: newServices });
//       }
//     });

//     window.Shared.back.register(BackOut.LANGUAGE_CHANGE, (event, data) => {
//       this.props.setMainState({
//         lang: data
//       });
//     });

//     window.Shared.back.register(BackOut.LANGUAGE_LIST_CHANGE, (event, data) => {
//       this.props.setMainState({
//         langList: data
//       });
//     });

//     window.Shared.back.register(BackOut.UPDATE_COMPONENT_STATUSES, (event, statuses) => {
//       this.props.setMainState({
//         componentStatuses: statuses
//       });
//     });

//     window.Shared.back.register(BackOut.SET_VIEW_SEARCH_STATUS, (event, viewId, status) => {
//       // TODO: Reimplement or scrap?
//     });

//     window.Shared.back.register(BackOut.THEME_CHANGE, (event, theme) => {
//       if (theme.id === this.props.preferencesData.currentTheme) { setTheme(theme); }
//     });

//     window.Shared.back.register(BackOut.THEME_LIST_CHANGE, (event, data) => {
//       this.props.setMainState({
//         themeList: data
//       });
//     });

//     window.Shared.back.register(BackOut.PLAYLISTS_CHANGE, (event, data) => {
//       this.props.setMainState({
//         playlists: data
//       });
//       this.cachePlaylistIcons(data);
//     });

//     window.Shared.back.register(BackOut.UPDATE_PREFERENCES_RESPONSE, (event, data) => {
//       this.props.setPreferences(data);
//     });

//     window.Shared.back.register(BackOut.UPDATE_EXT_CONFIG_DATA, (event, data) => {
//       this.props.setMainState({ extConfig: data });
//     });

//     window.Shared.back.register(BackOut.TAG_CATEGORIES_CHANGE, (event, data) => {
//       this.props.setTagCategories(data);
//     });

//     window.Shared.back.register(BackOut.DEV_CONSOLE_CHANGE, (event, text) => {
//       this.props.setMainState({ devConsole: text });
//     });

//     window.Shared.back.register(BackOut.OPEN_ALERT, (event, text) => {
//       alert(text);
//     });

//     window.Shared.back.register(BackOut.SET_PLACEHOLDER_DOWNLOAD_DETAILS, (event, details) => {
//       const { downloadSize } = details;
//       this.props.setMainState({ downloadSize });
//     });

//     window.Shared.back.register(BackOut.SET_PLACEHOLDER_DOWNLOAD_PERCENT, (event, percent) => {
//       if (percent === 100) {
//         this.props.setMainState({ downloadVerifying: true, downloadPercent: percent });
//       } else {
//         this.props.setMainState({ downloadPercent: percent });
//       }
//     });

//     window.Shared.back.register(BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG, () => {
//       this.props.setMainState({ downloadOpen: true, downloadVerifying: false, downloadPercent: 0 });
//     });

//     window.Shared.back.register(BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG, () => {
//       this.props.setMainState({ downloadOpen: false, downloadPercent: 0 });
//     });

//     window.Shared.back.register(BackOut.CURATE_LOADED, (event) => {
//       this.onCurateLoad();
//     });

//     window.Shared.back.register(BackOut.CURATE_CONTENTS_CHANGE, (event, folder, contents) => {
//       this.props.curateActions.setContentTree({
//         folder,
//         contentTree: contents
//       });
//     });

//     window.Shared.back.register(BackOut.CURATE_LIST_CHANGE, (event, added, removed) => {
//       this.props.curateActions.modifyCurations({
//         added,
//         removed
//       });
//     });

//     window.Shared.back.register(BackOut.CURATE_SELECT_LOCK, (event, folder, locked) => {
//       this.props.curateActions.setLock({
//         folder,
//         locked,
//       });
//     });

//     window.Shared.back.register(BackOut.CURATE_SELECT_CURATIONS, (event, folders) => {
//       const selectable = folders.filter(f => this.props.curate.curations.findIndex(c => c.folder === f) !== -1);
//       this.props.curateActions.setSelectedCurations(selectable);
//     });

//     window.Shared.back.register(BackOut.UPDATE_TASK, (event, task) => {
//       // I don't know why length works with 1, don't change it
//       if (!this.props.main.taskBarOpen && this.props.tasks.length === 1) {
//         // Show task bar for first task added
//         this.props.setMainState({ taskBarOpen: true });
//       }
//       this.props.setTask(task);
//     });

//     window.Shared.back.register(BackOut.CREATE_TASK, (event, task) => {
//       // I don't know why length works with 1, don't change it
//       if (!this.props.main.taskBarOpen && this.props.tasks.length >= 1) {
//         // Show task bar for first task added
//         this.props.setMainState({ taskBarOpen: true });
//       }
//       this.props.addTask(task);
//     });

//     window.Shared.back.register(BackOut.FOCUS_WINDOW, () => {
//       window.focus();
//     });

//     window.Shared.back.register(BackOut.NEW_DIALOG, (event, dialog, code) => {
//       const d: DialogState = {
//         ...dialog,
//         id: uuid()
//       };
//       this.props.mainActions.createDialog(d);
//       window.Shared.back.send(BackIn.NEW_DIALOG_RESPONSE, d.id, code);
//     });

//     window.Shared.back.register(BackOut.UPDATE_DIALOG_MESSAGE, (event, message, dialogId) => {
//       this.props.mainActions.updateDialog({
//         id: dialogId,
//         message
//       });
//     });

//     window.Shared.back.register(BackOut.UPDATE_DIALOG_FIELD_VALUE, (event, dialogId, name, value) => {
//       this.props.mainActions.updateDialogField({
//         id: dialogId,
//         field: {
//           name,
//           value,
//         }
//       });
//     });

//     window.Shared.back.register(BackOut.CANCEL_DIALOG, (event, dialogId) => {
//       this.props.mainActions.cancelDialog(dialogId);
//     });

//     window.Shared.back.register(BackOut.UPDATE_GOTD, (event, gotd) => {
//       this.props.setMainState({
//         gotdList: gotd
//       });
//     });

//     window.Shared.back.register(BackOut.UPDATE_FEED, (event, feed) => {
//       this.props.setMainState({
//         updateFeedMarkdown: feed
//       });
//     });

//     window.Shared.back.register(BackOut.UPDATE_PLATFORM_APP_PATHS, (event, paths) => {
//       this.props.setMainState({
//         platformAppPaths: paths
//       });
//     });

//     window.Shared.back.register(BackOut.POST_SYNC_CHANGES, (event, libraries, suggestions, platformAppPaths, cats, total) => {
//       this.props.setMainState({
//         libraries,
//         suggestions,
//         platformAppPaths,
//         gamesTotal: total,
//       });
//       // TODO: Re-add prefs sync
//       this.props.setTagCategories(cats);
//     });

//     window.Shared.back.register(BackOut.SHORTCUT_REGISTER_COMMAND, (event, command, shortcuts) => {
//       this.registerShortcut(command, shortcuts);
//     });

//     window.Shared.back.register(BackOut.SHORTCUT_UNREGISTER, (event, shortcuts) => {
//       if (this.props.shortcut && this.props.shortcut.unregisterShortcut) {
//         this.props.shortcut.unregisterShortcut(shortcuts);
//       } else {
//         log.error('Launcher', `Failed to register shortcut for ${shortcuts}, shortcut context missing?`);
//       }
//     });

//     window.Shared.back.register(BackOut.BROWSE_VIEW_PAGE, (event, data) => {
//       // Dispath addData for the given view
//       this.props.searchActions.addData({
//         view: data.viewId,
//         data: {
//           searchId: data.searchId,
//           page: data.page,
//           games: data.games,
//         }
//       });
//     });

//     window.Shared.back.register(BackOut.FPFSS_ACTION, async (event, extId: string) => {
//       return new Promise((resolve, reject) => {
//         const previousConsent = getFpfssConsentExt(extId);
//         if (previousConsent) {
//           this.performFpfssAction(async (user) => {
//             resolve(user);
//           });
//         } else {
//           const msg = formatString(this.props.main.lang.dialog.extFpfssConsent, extId) as string;
//           resolveNewDialog(this.props.dispatch, {
//             message: msg,
//             buttons: [this.props.main.lang.misc.yes, this.props.main.lang.misc.no],
//             cancelId: 1
//           })
//           .then(({ button }) => {
//             if (button === 0) {
//               this.performFpfssAction(async (user) => {
//                 if (user) {
//                   saveFpfssConsentExt(extId, true);
//                   resolve(user);
//                 } else {
//                   reject(new Error('Launcher was unable to get FPFSS token'));
//                 }
//               });
//             } else {
//               reject(new Error('User denied access to FPFSS token'));
//             }
//           }).catch((error) => {
//             reject(new Error('Failed to show FPFSS consent dialog: ' + error));
//           });
//         }
//       });
//     });

//     window.Shared.back.register(BackOut.UPDATE_DOWNLOADER_TASK, async (event, task) => {
//       this.props.downloadsActions.updateDownloaderTask(task);
//     });

//     window.Shared.back.register(BackOut.UPDATE_DOWNLOADER_TASKS, async (event, tasks) => {
//       this.props.downloadsActions.updateDownloaderTasks(tasks);
//     });

//     window.Shared.back.register(BackOut.UPDATE_DOWNLOADER_STATUS, async (event, status) => {
//       this.props.downloadsActions.updateDownloaderStatus(status);
//     });

//     window.Shared.back.register(BackOut.UPDATE_DOWNLOADER_STATE_WORKER, async (event, workerState) => {
//       this.props.downloadsActions.updateDownloaderWorker(workerState);
//     });

//     window.Shared.back.register(BackOut.OPEN_DYNAMIC_PAGE, async (event, name, props) => {
//       this.props.mainActions.openDynamicPage({ name, props });
//     });
//   }

//   init() {
//     window.Shared.back.onStateChange = (state) => {
//       this.props.setMainState({
//         socketOpen: state
//       });
//     };

//     // Load FPFSS user info and check that profile works
//     (() => {
//       const userBase64 = localStorage.getItem('fpfss_user');
//       if (userBase64) {
//         try {
//           const user = JSON.parse(Buffer.from(userBase64, 'base64').toString('utf-8')) as FpfssUser;
//           // Test profile uri
//           const profileUrl = `${this.props.preferencesData.fpfssBaseUrl}/api/profile`;
//           axios.get(profileUrl, {
//             headers: {
//               'Authorization': `Bearer ${user.accessToken}`
//             }
//           })
//           .then((res) => {
//             // Success, use most recent info and save to storage and state
//             user.username = res.data['Username'];
//             user.avatarUrl = res.data['AvatarURL'];
//             user.roles = res.data['Roles'];
//             const newUserBase64 = Buffer.from(JSON.stringify(user, null, 0)).toString('base64');
//             localStorage.setItem('fpfss_user', newUserBase64);
//             this.props.fpfssActions.setUser(user);
//           })
//           .catch(() => {
//             // Failed auth
//             localStorage.removeItem('fpfss_user');
//           });
//         } catch (err) {
//           log.error('Launcher', 'Fpfss saved auth was invalid, clearing...');
//           localStorage.removeItem('fpfss_user');
//         }
//       }
//     })();

//     // Old code from upgrades, not sure if removing breaks something
//     (() => {
//       const askBeforeClosing = true;
//       window.onbeforeunload = (event: BeforeUnloadEvent) => {
//         if (this.props.main.quitting) {
//           return;
//         }
//         event.returnValue = false;
//         const { upgrades } = this.props.main;
//         let stillDownloading = false;
//         for (const stage of upgrades) {
//           if (stage.state.isInstalling) {
//             stillDownloading = true;
//             break;
//           }
//         }
//         if (askBeforeClosing && stillDownloading) {
//           event.returnValue = 1; // (Prevent closing the window)
//         } else {
//           this.unmountBeforeClose();
//         }
//       };
//     })();

//     this.registerIpcListeners();
//     this.registerWebsocketListeners();

//     window.Shared.back.request(BackIn.INIT_LISTEN)
//     .then(data => {
//       if (!data) { throw new Error('INIT_LISTEN response is missing data.'); }
//       for (const index of data.done) {
//         console.log('found ' + index);
//         switch (+index) { // DO NOT REMOVE - Fails to convert to enum without explicitint conversion
//           case BackInit.DATABASE: {
//             this.onDatabaseLoaded();
//             break;
//           }
//           case BackInit.EXTENSIONS: {
//             this.onExtensionsLoad();
//             break;
//           }
//           default: {
//             this.props.mainActions.addLoaded([index]);
//           }
//         }
//       }
//     });

//     // Cache playlist icons (if they are loaded)
//     // if (this.props.main.playlists.length > 0) { this.cachePlaylistIcons(this.props.main.playlists); }

//     // Load Credits
//     fetch(`${getFileServerURL()}/credits.json`)
//     .then(res => res.json())
//     .then(async (data) => {
//       this.props.mainActions.setCredits(CreditsFile.parseCreditsData(data));
//     })
//     .catch((error) => {
//       console.warn(error);
//       log.warn('Launcher', `Failed to load credits.\n${error}`);
//       this.props.mainActions.setCredits({
//         roles: [],
//         profiles: []
//       });
//     });
//   }

//   componentDidMount() {
//     // Call first batch of random games
//     // if (this.props.main.randomGames.length < RANDOM_GAME_ROW_COUNT) { this.rollRandomGames(true); }
//     // Get first set of dropdown values
//     const tagsKey = JSON.stringify(this.props.preferencesData.tagFilters);
//     this.props.searchActions.resetDropdownData(tagsKey);
//   }

//   componentDidUpdate(prevProps: AppProps) {
//     if (this.props.main.loadedAll) {
//       const selectedPlaylistId = this.props.main.selectedPlaylistId;
//       const { preferencesData } = this.props;

//       // Check if theme changed
//       if (preferencesData.currentTheme !== prevProps.preferencesData.currentTheme) {
//         const theme = this.props.main.themeList.find(t => t.id === preferencesData.currentTheme);
//         setTheme(theme);
//       }

//       // Check if logo set changed
//       if (preferencesData.currentLogoSet !== prevProps.preferencesData.currentLogoSet) {
//         this.props.mainActions.incrementLogoVersion();
//       }

//       // Check if playlists need to be updated based on extreme filtering
//       if (preferencesData.browsePageShowExtreme !== prevProps.preferencesData.browsePageShowExtreme) {
//         window.Shared.back.request(BackIn.GET_PLAYLISTS)
//         .then(data => {
//           if (data) {
//             this.props.setMainState({ playlists: data });
//             this.cachePlaylistIcons(data)
//             .catch(console.error);
//           }
//         });
//       }

//       if (
//         this.props.preferencesData.browsePageShowExtreme !== prevProps.preferencesData.browsePageShowExtreme ||
//         JSON.stringify(prevProps.preferencesData.tagFilters) !== JSON.stringify(this.props.preferencesData.tagFilters)) {
//         const tagsKey = JSON.stringify(this.props.preferencesData.tagFilters);
//         this.props.searchActions.resetDropdownData(tagsKey);
//       }

//       // Reset random games if the filters change
//       // @TODO: Is this really the best way to compare array contents? I guess it works
//       if (
//         this.props.preferencesData.browsePageShowExtreme !== prevProps.preferencesData.browsePageShowExtreme ||
//         !arrayShallowStrictEquals(this.props.preferencesData.excludedRandomLibraries, prevProps.preferencesData.excludedRandomLibraries) ||
//         JSON.stringify(prevProps.preferencesData.tagFilters) !== JSON.stringify(this.props.preferencesData.tagFilters)) {
//         this.props.setMainState({
//           randomGames: [],
//           requestingRandomGames: true
//         });
//         window.Shared.back.request(BackIn.RANDOM_GAMES, {
//           count: RANDOM_GAME_ROW_COUNT * 10,
//           excludedLibraries: this.props.preferencesData.excludedRandomLibraries,
//         })
//         .then((data) => {
//           this.props.mainActions.addRandomGames(data);
//         })
//         .catch((error) => {
//           log.error('Launcher', `Error fetching random games - ${error}`);
//         });
//       }

//       // Check for selected game changes

//       // Check if it started or ended editing
//       if (this.props.main.isEditingGame != prevProps.main.isEditingGame) {
//         this.updateCurrentGame(this.props.main.selectedGameId, selectedPlaylistId);
//       }
//       // Update current game and add-apps if the selected game changes
//       if (this.props.main.selectedGameId && this.props.main.selectedGameId !== prevProps.main.selectedGameId) {
//         this.updateCurrentGame(this.props.main.selectedGameId, selectedPlaylistId);
//         this.props.setMainState({ isEditingGame: false });
//       }

//       // Update preference "lastSelectedLibrary"
//       const gameLibrary = getViewName(this.props.location.pathname);
//       if (this.props.location.pathname.startsWith(Paths.BROWSE) &&
//         preferencesData.lastSelectedLibrary !== gameLibrary) {
//         this.props.updatePreferences({ lastSelectedLibrary: gameLibrary });
//       }

//       // Create a new game
//       if (this.props.main.wasNewGameClicked) {
//         const route = preferencesData.lastSelectedLibrary || preferencesData.defaultLibrary || '';

//         if (this.props.location.pathname.startsWith(Paths.BROWSE)) {
//           this.props.setMainState({
//             wasNewGameClicked: false
//           });
//           // Deselect the current game
//           const view = this.props.search.views[route];
//           if (view && view.selectedGame !== undefined) {
//             this.props.searchActions.selectGame({
//               view: route,
//               game: undefined,
//             });
//           }
//         } else {
//           this.props.navigate(joinLibraryRoute(route));
//         }
//       }

//       // Dynamic page opened
//       if (this.props.main.dynamicPage !== undefined && (this.props.main.dynamicPage !== prevProps.main.dynamicPage)) {
//         this.props.navigate(Paths.DYNAMIC);
//       }
//     }
//   }

//   getGameBrowserDivWidth(): number {
//     if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
//     if (!this.appRef.current) { throw new Error('"game-browser" div is missing.'); }
//     return parseInt(document.defaultView.getComputedStyle(this.appRef.current).width || '', 10);
//   }

//   onRightSidebarResize = (event: SidebarResizeEvent): void => {
//     const maxWidth = (this.getGameBrowserDivWidth() - this.props.preferencesData.browsePageLeftSidebarWidth) - 5;
//     const targetWidth = event.startWidth + event.startX - event.event.clientX;
//     this.props.updatePreferences({
//       browsePageRightSidebarWidth: Math.min(targetWidth, maxWidth)
//     });
//   };

//   onGameLaunch = async (gameId: string, override: GameLaunchOverride): Promise<void> => {
//     log.debug('Launcher', 'Launching Game - ' + gameId);
//     this.props.mainActions.markGameBusy(gameId);
//     await window.Shared.back.request(BackIn.LAUNCH_GAME, gameId, 'flashpoint-archive')
//     .catch((error) => {
//       log.error('Launcher', `Failed to launch game - ${gameId} - ERROR: ${error}`);
//     })
//     .finally(() => {
//       this.props.mainActions.unmarkGameBusy(gameId);
//     });
//   };

//   onDeleteSelectedGame = async (): Promise<void> => {
//     const { currentView } = this.props;
//     if (currentView.selectedGame) {
//       this.props.searchActions.selectGame({
//         view: currentView.id,
//         game: undefined
//       });
//       // Delete the game
//       this.onDeleteGame(currentView.selectedGame.id);
//     }
//   };

//   onEditGame = (game: Partial<Game>) => {
//     log.debug('Launcher', `Editing: ${JSON.stringify(game)}`);
//     if (this.props.currentView.selectedGame) {
//       const ng = newGame();
//       Object.assign(ng, { ...this.props.currentView.selectedGame, ...game });
//       this.props.searchActions.updateGame(ng);
//     }
//   };

//   onSaveEditClick = async (): Promise<void> => {
//     if (!this.props.currentView.selectedGame) {
//       console.error('Can\'t save game. "currentGame" is missing.');
//       return;
//     }
//     await this.onSaveGame(this.props.currentView.selectedGame, this.props.main.currentPlaylistEntry);
//     this.props.setMainState({
//       currentGame: this.props.currentView.selectedGame == null ? undefined : this.props.currentView.selectedGame,
//       isEditingGame: false
//     });
//     // this.focusGameGridOrList();
//   };

//   onDiscardEditClick = (): void => {
//     this.props.setMainState({
//       isEditingGame: false,
//       currentGame: this.props.currentView.selectedGame,
//     });
//     // this.focusGameGridOrList();
//   };

//   onStartEditClick = (): void => {
//     if (this.props.preferencesData.enableEditing) {
//       this.props.setMainState({ isEditingGame: true });
//     }
//   };

//   onEditPlaylistNotes = (text: string): void => {
//     if (this.props.main.currentPlaylistEntry) {
//       this.props.setMainState({
//         currentPlaylistEntry: {
//           ...this.props.main.currentPlaylistEntry,
//           notes: text
//         }
//       });
//     }
//   };

//   onUpdateActiveGameData = async (activeDataOnDisk: boolean, activeDataId?: number): Promise<void> => {
//     if (this.props.currentView.selectedGame) {
//       const game = await window.Shared.back.request(BackIn.GET_GAME, this.props.currentView.selectedGame.id);
//       if (game) {
//         game.activeDataOnDisk = activeDataOnDisk;
//         game.activeDataId = activeDataId;
//         if (this.props.currentView.selectedGame) {
//           this.props.searchActions.updateGame(game);
//         }
//         window.Shared.back.request(BackIn.SAVE_GAME, game);
//       }
//     }
//   };

//   onRemovePlaylistGame = async (playlistGame: PlaylistGame): Promise<void> => {
//     // Remove game from playlist
//     if (this.props.currentView.selectedPlaylist) {
//       await window.Shared.back.request(BackIn.DELETE_PLAYLIST_GAME, this.props.currentView.selectedPlaylist.id, playlistGame.gameId);
//       // Remove from playlist on frontend
//       this.props.mainActions.removePlaylistGame({
//         viewId: getViewName(this.props.location.pathname),
//         playlistId: this.props.currentView.selectedPlaylist.id,
//         gameId: playlistGame.gameId
//       });
//     } else {
//       logError('No playlist is selected?');
//       return;
//     }

//     // Reset the state related to the editing
//     this.props.setMainState({
//       isEditingGame: false
//     });

//     function logError(text: string) {
//       console.error('Unable to remove game from selected playlist - ' + text);
//     }
//   };

//   onRightSidebarDeselectPlaylist = (): void => {
//     this.props.searchActions.selectPlaylist({
//       view: this.props.currentView.id,
//       playlist: undefined
//     });
//   };

//   /** Replace the "current game" with the selected game (in the appropriate circumstances). */
//   updateCurrentGame = queueOne(async (gameId?: string, playlistId?: string): Promise<void> => {
//     // Find the selected game in the selected playlist
//     if (gameId) {
//       let gamePlaylistEntry: PlaylistGame | null;

//       if (playlistId) {
//         gamePlaylistEntry = await window.Shared.back.request(BackIn.GET_PLAYLIST_GAME, playlistId, gameId);
//       }

//       // Update game
//       window.Shared.back.request(BackIn.GET_GAME, gameId)
//       .then(fetchedInfo => {
//         if (fetchedInfo) {
//           this.props.setMainState({
//             currentGame: fetchedInfo,
//             currentPlaylistEntry: gamePlaylistEntry == null ? undefined : gamePlaylistEntry
//           });
//         } else { console.log(`Failed to get game. Game is undefined (GameID: "${gameId}").`); }
//       });
//     }
//   });

//   private onGameContextMenuMemo = memoizeOne((playlists: Playlist[], strings: LangContainer, selectedPlaylistId?: string) => {
//     return (event: React.MouseEvent, gameId: string, logoPath: string, screenshotPath: string) => {
//       const fpfssButtons: MenuItemType[] = this.props.preferencesData.fpfssBaseUrl ? [
//         {
//           /* Edit via FPFSS */
//           type: 'button',
//           label: strings.browse.editFpfssGame,
//           enabled: this.props.preferencesData.enableEditing,
//           onClick: () => {
//             this.onFpfssEditGame(gameId);
//           }
//         },
//         {
//           /* Show on FPFSS */
//           type: 'button',
//           label: strings.browse.showOnFpfss,
//           enabled: this.props.preferencesData.enableEditing,
//           onClick: () => {
//             openUrlInWindow(`${this.props.preferencesData.fpfssBaseUrl}/web/game/${gameId}`);
//           }
//         }
//       ] : [];

//       let contextButtons: MenuItemType[] = [
//         {
//           type: 'button',
//           label: strings.menu.addToFavorites,
//           enabled: playlists.filter(p => p.title.includes('Favorites')).length > 0,
//           onClick: () => {
//             const playlistId = playlists.filter(p => p.title.includes('Favorites'))[0].id;
//             window.Shared.back.send(BackIn.ADD_PLAYLIST_GAME, playlistId, gameId);
//           }
//         },
//         {
//           type: 'submenu',
//           label: strings.menu.addToPlaylist,
//           enabled: playlists.length > 0,
//           submenu: UniquePlaylistMenuFactory(playlists,
//             strings,
//             (playlistId) => window.Shared.back.send(BackIn.ADD_PLAYLIST_GAME, playlistId, gameId),
//             selectedPlaylistId)
//         }, {
//           /* Copy Shortcut URL */
//           type: 'button',
//           label: strings.menu.copyShortcutURL,
//           onClick: () => {
//             navigator.clipboard.writeText(`flashpoint://run/${gameId}`);
//           }
//         },
//         {
//           /* Copy Game UUID */
//           type: 'button',
//           label: strings.menu.copyGameUUID,
//           onClick: () => {
//             navigator.clipboard.writeText(gameId);
//           }
//         }, { type: 'separator' }, {
//           /* File Location */
//           type: 'button',
//           label: strings.menu.openFileLocation,
//           enabled: !window.Shared.isBackRemote, // (Local "back" only)
//           onClick: () => {
//             window.Shared.back.request(BackIn.GET_GAME, gameId)
//             .then(async (game) => {
//               if (game) {
//                 const gamePath = await getGamePath(game, window.Shared.config.fullFlashpointPath, this.props.preferencesData.htdocsFolderPath, this.props.preferencesData.dataPacksFolderPath);
//                 if (gamePath) {
//                   const fileExists = await window.electronAPI?.fileExists(gamePath);
//                   if (fileExists) {
//                     window.electronAPI?.showItemInFolder(gamePath);
//                   } else {
//                     const template: DialogStateTemplate = {
//                       largeMessage: true,
//                       message: 'GameData has not been downloaded yet, cannot open the file location!',
//                       buttons: ['Ok'],
//                     };
//                     createNewDialog(this.props.dispatch, template);
//                     return;
//                   }
//                 }
//               }
//             });
//           },
//         },
//         {
//           /* Logo Location */
//           type: 'button',
//           label: strings.menu.openLogoLocation,
//           enabled: !window.Shared.isBackRemote, // (Local "back" only)
//           onClick: async () => {
//             const fullLogoPath = getGameImagePath(logoPath, this.props.preferencesData.imageFolderPath);
//             const fileExists = await window.electronAPI?.fileExists(fullLogoPath);
//             if (fileExists) {
//               window.electronAPI?.showItemInFolder(fullLogoPath);
//             } else {
//               fetch(getGameImageURL(logoPath))
//               .then(() => {
//                 window.electronAPI?.showItemInFolder(fullLogoPath);
//               });
//             }
//           }
//         },
//         {
//           /* Screenshot Location */
//           type: 'button',
//           label: strings.menu.openScreenshotLocation,
//           enabled: !window.Shared.isBackRemote, // (Local "back" only)
//           onClick: async () => {
//             const fullScreenshotPath = getGameImagePath(screenshotPath, this.props.preferencesData.imageFolderPath);
//             const fileExists = await window.electronAPI?.fileExists(fullScreenshotPath);
//             if (fileExists) {
//               window.electronAPI?.showItemInFolder(fullScreenshotPath);
//             } else {
//               fetch(getGameImageURL(logoPath))
//               .then(() => {
//                 window.electronAPI?.showItemInFolder(fullScreenshotPath);
//               });
//             }
//           }
//         }, { type: 'separator' }, {
//           /* Clear Playtime Tracking */
//           type: 'button',
//           label: strings.config.clearPlaytimeTracking,
//           enabled: !window.Shared.isBackRemote, // (Local "back" only)
//           onClick: () => {
//             window.Shared.back.send(BackIn.CLEAR_PLAYTIME_TRACKING_BY_ID, gameId);
//           }
//         }];

//       // Add editing mode fields
//       if (this.props.preferencesData.enableEditing) {
//         const editingButtons: MenuItemType[] = [
//           {
//             /* Load as a curation */
//             type: 'button',
//             label: strings.menu.makeCurationFromGame,
//             enabled: this.props.preferencesData.enableEditing,
//             onClick: () => {
//               window.Shared.back.request(BackIn.CURATE_FROM_GAME, gameId)
//               .then((folder) => {
//                 if (folder) {
//                   // Select the new curation
//                   this.props.curateActions.setCurrentCuration({
//                     folder
//                   });
//                   // Redirect to Curate once it's been made
//                   this.props.navigate(Paths.CURATE);
//                 } else {
//                   createNewDialog(this.props.dispatch, {
//                     message: 'Failed to create curation from this game. No error provided.',
//                     largeMessage: true,
//                     buttons: ['Ok']
//                   });
//                 }
//               })
//               .catch((err: any) => {
//                 createNewDialog(this.props.dispatch, {
//                   message: `Failed to create curation from this game.\nError: ${err.toString()}`,
//                   largeMessage: true,
//                   buttons: ['Ok']
//                 });
//               });
//             }
//           }, ...fpfssButtons, { type: 'separator' }
//         ];
//         contextButtons = contextButtons.concat(editingButtons);
//       }

//       // Add extension contexts
//       for (const contribution of this.props.main.contextButtons) {
//         for (const contextButton of contribution.value) {
//           if (contextButton.context === 'game') {
//             contextButtons.push({
//               type: 'button',
//               label: contextButton.name,
//               onClick: () => {
//                 window.Shared.back.request(BackIn.GET_GAME, gameId)
//                 .then((game) => {
//                   window.Shared.back.request(BackIn.RUN_COMMAND, contextButton.command, [game]);
//                 });
//               }
//             });
//           }
//         }
//       }

//       this.props.openMenu({ items: contextButtons }, getPointer(event));
//     };
//   });

//   onMovePlaylistGame = async (sourceGameId: string, destGameId: string) => {
//     if (this.props.currentView.selectedPlaylist && this.props.currentView.advancedFilter.playlistOrder && (sourceGameId !== destGameId)) {
//       // Send swap to backend, reflect on frontend immediately
//       const library = getViewName(this.props.location.pathname);
//       this.props.searchActions.movePlaylistGame({
//         view: library,
//         sourceGameId,
//         destGameId,
//       });
//     }
//   };

//   copyCrashLog = () => {
//     navigator.clipboard.writeText(this.props.main.mainOutput || '');
//   };

//   render() {
//     const { currentView } = this.props;
//     const playlists = this.orderPlaylistsMemo(this.props.main.playlists);
//     const extremeTags = this.props.preferencesData.tagFilters.filter(t => t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
//     const remoteModules = this.props.main.extensions
//     .filter(ext => !this.props.preferencesData.disabledExtensions.includes(ext.id))
//     .reduce<RemoteModule[]>((prev, cur) => {
//       if (cur.contributes?.moduleFederation) {
//         const remoteModules: RemoteModule[] = cur.contributes.moduleFederation.map(mc => {
//           return {
//             scope: mc.scope,
//             url: `${getFileServerURL()}/extdata/${cur.id}/${mc.path}`
//           };
//         });
//         return prev.concat(remoteModules);
//       } else {
//         return prev;
//       }
//     }, []);

//     const dynamicThemeFileList = this.props.main.extensions
//     .filter(ext => !this.props.preferencesData.disabledExtensions.includes(ext.id))
//     .reduce<string[]>((prev, cur) => prev.concat(cur.contributes?.themeFiles.map(file => {
//       return `${getFileServerURL()}/extdata/${cur.id}/${file}`;
//     }) || []), []);

//     // Props to set to the router
//     const routerProps: AppRouterProps = {
//       onMovePlaylistGame: this.onMovePlaylistGame,
//       fpfssUser: this.props.fpfss.user,
//       gotdList: this.props.main.gotdList,
//       randomGames: this.props.main.randomGames,
//       rollRandomGames: this.rollRandomGames,
//       gamesTotal: this.props.main.gamesTotal,
//       allPlaylists: this.props.main.playlists,
//       playlists: playlists,
//       suggestions: this.props.main.suggestions,
//       appPaths: this.props.main.appPaths,
//       platforms: this.props.main.suggestions.platforms,
//       playlistIconCache: this.props.main.playlistIconCache,
//       onGameContextMenu: this.onGameContextMenuMemo(this.props.main.playlists, this.props.main.lang, this.props.main.selectedPlaylistId),
//       onLaunchGame: this.onGameLaunch,
//       libraries: this.props.main.libraries,
//       serverNames: this.props.main.serverNames,
//       mad4fpEnabled: this.props.main.mad4fpEnabled,
//       localeCode: this.props.main.localeCode,
//       devConsole: this.props.main.devConsole,
//       creditsData: this.props.main.creditsData,
//       creditsDoneLoading: this.props.main.creditsDoneLoading,
//       selectedGameId: currentView.selectedGame?.id,
//       gameRunning: this.checkGameRunningMemo(currentView.selectedGame?.id, this.props.main.services),
//       selectedPlaylistId: currentView.selectedPlaylist?.id,
//       onDeletePlaylist: this.onPlaylistDelete,
//       onUpdatePlaylist: this.onUpdatePlaylist,
//       wasNewGameClicked: this.props.main.wasNewGameClicked,
//       gameLibrary: currentView.id,
//       themeList: this.props.main.themeList,
//       languages: this.props.main.langList,
//       updateInfo: this.props.main.updateInfo,
//       extensions: this.props.main.extensions,
//       devScripts: this.props.main.devScripts,
//       contextButtons: this.props.main.contextButtons,
//       curationTemplates: this.props.main.curationTemplates,
//       logoSets: this.props.main.logoSets,
//       extConfigs: this.props.main.extConfigs,
//       extConfig: this.props.main.extConfig,
//       logoVersion: this.props.main.logoVersion,
//       services: this.props.main.services,
//       manualUrl: this.props.preferencesData.onlineManual || pathToFileUrl(path.join(window.Shared.config.fullFlashpointPath, this.props.preferencesData.offlineManual)),
//       updateFeedMarkdown: this.props.main.updateFeedMarkdown,
//       componentStatuses: this.props.main.componentStatuses,
//       openFlashpointManager: this.openFlashpointManager,
//       metaState: this.props.currentView.data.metaState,
//       dynamicPageProps: this.props.main.dynamicPage,
//       searchStatus: null, // TODO: remove
//     };

//     const showRightSidebar = currentView.selectedGame !== undefined && !hiddenRightSidebarPages.reduce((prev, cur) => prev || this.props.location.pathname.startsWith(cur), false);

//     // Render
//     return (
//       <DynamicThemeProvider fileList={dynamicThemeFileList} >
//         <DynamicComponentProvider manifests={remoteModules}>
//           <LangContext.Provider value={this.props.main.lang}>
//             <ToastContainer
//               theme='dark'
//               className='toast-container'
//               progressClassName='toast-container-progress'
//               hideProgressBar={true}
//               position='bottom-center'/>
//             {!this.props.main.stopRender ? (
//               <>
//                 {/* Backend Crash Log and Report */}
//                 {!this.props.main.socketOpen && !this.props.main.mainOutput && (
//                   <FloatingContainer>
//                     <div className='main-output-header'>Disconnected from Backend</div>
//                     <div>Reconnecting...</div>
//                   </FloatingContainer>
//                 )}
//                 {this.props.main.mainOutput && (
//                   <FloatingContainer>
//                     <div className='main-output-header'>Backend Crash Log</div>
//                     <div className='main-output-content'>{this.props.main.mainOutput}</div>
//                     <div className='main-output-buttons'>
//                       <SimpleButton
//                         value={'Copy Crash Log'}
//                         onClick={this.copyCrashLog} />
//                       { window.electronAPI !== undefined && (
//                         <SimpleButton
//                           value={'Restart Launcher'}
//                           onClick={() => {
//                             this.props.setMainState({
//                               quitting: true
//                             });
//                             window.electronAPI?.restart();
//                           }} />
//                       )}
//                     </div>
//                   </FloatingContainer>
//                 )}
//                 {/* First Open Dialog */}
//                 {this.props.main.openDialogs.length > 0 && this.props.main.socketOpen && (
//                   <Dialog
//                     dialog={this.props.main.openDialogs[0]}
//                     closeDialog={this.props.mainActions.cancelDialog}
//                     finishDialog={this.props.mainActions.resolveDialog}
//                     updateField={this.props.mainActions.updateDialogField} />
//                 )}
//                 {/** Fancy FPFSS edit */}
//                 {this.props.fpfss.editingGame && (
//                   <FloatingContainer floatingClassName='fpfss-edit-container'>
//                     <FpfssEditGame
//                       gameRunning={false}
//                       game={this.props.fpfss.editingGame}
//                       library={this.props.fpfss.editingGame.library}
//                       onGameLaunch={async () => alert('Cannot launch game during FPFSS edit')}
//                       onDeleteSelectedGame={() => {/** unused */ }}
//                       onDeselectPlaylist={() => {/** unused */ }}
//                       isExtreme={false}
//                       onEditClick={() => {/** unused */ }}
//                       onRemovePlaylistGame={() => {/** unused */ }}
//                       onDiscardClick={this.onCancelFpfssEditGame}
//                       onSaveGame={this.onSaveFpfssEditGame}
//                       onEditGame={this.onApplyFpfssEditGame}
//                       onFpfssEditGame={this.onFpfssEditGame}
//                       onUpdateActiveGameData={(disk, id) => id && this.onApplyFpfssEditGameData(id)} />
//                   </FloatingContainer>
//                 )}
//                 {/* Splash screen */}
//                 <SplashScreen
//                   quitting={this.props.main.quitting}
//                   loadedAll={this.props.main.loadedAll}
//                   loaded={this.props.main.loaded} />
//                 {/* Title-bar (if enabled) */}
//                 {window.Shared.config.data.useCustomTitlebar ?
//                   window.Shared.customVersion ? (
//                     <TitleBar title={window.Shared.customVersion} />
//                   ) : (
//                     <TitleBar title={`${APP_TITLE} ${window.Shared.isDev ? '(Dev Mode)' : ''}`} />
//                   ) : undefined}
//                 {/* "Content" */}
//                 {this.props.main.loadedAll ? (
//                   <>
//                     {/* Header */}
//                     <Header
//                       logoutUser={this.logoutUser}
//                       onToggleLeftSidebarClick={this.onToggleLeftSidebarClick}
//                       onToggleRightSidebarClick={this.onToggleRightSidebarClick} />
//                     {/* Main */}
//                     <div className='main'
//                       ref={this.appRef} >
//                       <AppRouter {...routerProps} />
//                       <noscript className='nojs'>
//                         <div style={{ textAlign: 'center' }}>
//                           This website requires JavaScript to be enabled.
//                         </div>
//                       </noscript>
//                       <Activity mode={showRightSidebar ? 'visible' : 'hidden'}>
//                         <ResizableSidebar
//                           show={this.props.preferencesData.browsePageShowRightSidebar}
//                           divider='before'
//                           width={this.props.preferencesData.browsePageRightSidebarWidth}
//                           onResize={this.onRightSidebarResize}>
//                           <RightBrowseSidebar
//                             game={currentView.selectedGame}
//                             playlist={currentView.selectedPlaylist}
//                             isExtreme={isGame(currentView.selectedGame) ? currentView.selectedGame.tags.reduce<boolean>((prev, next) => extremeTags.includes(next) || prev, false) : false}
//                             gameRunning={routerProps.gameRunning}
//                             library={routerProps.gameLibrary}
//                             onGameLaunch={this.onGameLaunch}
//                             onDeleteSelectedGame={this.onDeleteSelectedGame}
//                             onRemovePlaylistGame={this.onRemovePlaylistGame}
//                             onDeselectPlaylist={this.onRightSidebarDeselectPlaylist}
//                             onEditGame={this.onEditGame}
//                             onUpdateActiveGameData={this.onUpdateActiveGameData}
//                             onEditClick={this.onStartEditClick}
//                             onDiscardClick={this.onDiscardEditClick}
//                             onSaveGame={this.onSaveEditClick}
//                             onFpfssEditGame={this.onFpfssEditGame} />
//                         </ResizableSidebar>
//                       </Activity>
//                     </div>
//                     {/* Tasks - @TODO Find a better way to hide it than behind enableEditing */}
//                     {this.props.preferencesData.enableEditing && this.props.tasks.length > 0 && (
//                       <TaskBar
//                         open={this.props.main.taskBarOpen}
//                         onToggleOpen={this.onToggleTaskBarOpen} />
//                     )}
//                     {/* Footer */}
//                     <Footer />
//                     {/* Meta Edit Popup */}
//                   </>
//                 ) : undefined}
//               </>
//             ) : undefined}
//             {this.props.main.downloadOpen && (
//               <FloatingContainer>
//                 {this.props.main.downloadVerifying ? (
//                   <>
//                     <div className='placeholder-download-bar--title'>
//                       {this.props.main.lang.dialog.verifyingGame}
//                     </div>
//                     <div>{this.props.main.lang.dialog.aFewMinutes}</div>
//                   </>
//                 ) : (
//                   <>
//                     <div className='placeholder-download-bar--title'>
//                       {this.props.main.lang.dialog.downloadingGame}
//                     </div>
//                     <div>{`${sizeToString(this.props.main.downloadSize * (this.props.main.downloadPercent / 100))} / ${sizeToString(this.props.main.downloadSize)}`}</div>
//                   </>
//                 )}
//                 {this.props.main.downloadVerifying ? <></> : (
//                   <ProgressBar
//                     wrapperClass='placeholder-download-bar__wrapper'
//                     progressData={{
//                       ...placeholderProgressData,
//                       percentDone: this.props.main.downloadPercent,
//                       usePercentDone: true
//                     }}
//                   />
//                 )}
//                 <SimpleButton
//                   className='cancel-download-button'
//                   value={this.props.main.lang.dialog.cancel}
//                   onClick={() => window.Shared.back.send(BackIn.CANCEL_DOWNLOAD)} />
//               </FloatingContainer>
//             )}
//           </LangContext.Provider>
//         </DynamicComponentProvider>
//       </DynamicThemeProvider>
//     );
//   }

//   private onToggleLeftSidebarClick = (): void => {
//     this.props.updatePreferences({ browsePageShowLeftSidebar: !this.props.preferencesData.browsePageShowLeftSidebar });
//   };

//   private onToggleRightSidebarClick = (): void => {
//     this.props.updatePreferences({ browsePageShowRightSidebar: !this.props.preferencesData.browsePageShowRightSidebar });
//   };

//   private onPlaylistDelete = (playlist: Playlist) => {
//     if (playlist) {
//       const index = this.props.main.playlists.findIndex(p => p.id === playlist.id);
//       if (index >= 0) {
//         const playlists = [...this.props.main.playlists];
//         playlists.splice(index, 1);

//         const cache: Record<string, string> = { ...this.props.main.playlistIconCache };
//         const id = this.props.main.playlists[index].id;
//         if (id in cache) { delete cache[id]; }

//         this.props.setMainState({
//           playlists: playlists,
//           playlistIconCache: cache
//         });
//       }
//     }
//   };

//   private onUpdatePlaylistById = (playlistId: string) => {
//     const playlist = this.props.main.playlists.find(p => p.id === playlistId);
//     if (playlist) {
//       this.onUpdatePlaylist(playlist);
//     }
//   };

//   private onUpdatePlaylist = (playlist: Playlist) => {
//     const newPlaylists = [...this.props.main.playlists];
//     const newPlaylistIconCache = { ...this.props.main.playlistIconCache };
//     // Update or add playlist
//     const index = this.props.main.playlists.findIndex(p => p.id === playlist.id);
//     if (index >= 0) {
//       newPlaylists[index] = playlist;
//     } else {
//       newPlaylists.push(playlist);
//     }

//     // Remove old icon from cache
//     if (playlist.id in this.props.main.playlistIconCache) {
//       delete newPlaylistIconCache[playlist.id];
//       URL.revokeObjectURL(this.props.main.playlistIconCache[playlist.id]); // Free blob from memory
//     }

//     // Cache new icon
//     if (playlist.icon !== undefined) {
//       cacheIcon(playlist.icon).then(url => {
//         this.props.setMainState({
//           playlistIconCache: {
//             ...this.props.main.playlistIconCache,
//             [playlist.id]: url,
//           }
//         });
//       });
//     }

//     this.props.setMainState({
//       playlists: newPlaylists,
//       playlistIconCache: newPlaylistIconCache
//     }); // (This is very annoying to make typesafe)
//   };

//   onSaveGame = async (game: Game, playlistEntry?: PlaylistGame): Promise<void> => {
//     await window.Shared.back.request(BackIn.SAVE_GAME, game);
//     if (playlistEntry) {
//       window.Shared.back.send(BackIn.SAVE_PLAYLIST_GAME, this.props.main.selectedPlaylistId || '', playlistEntry);
//     }
//   };

//   onDeleteGame = (gameId: string): void => {
//     const strings = this.props.main.lang;
//     window.Shared.back.request(BackIn.DELETE_GAME, gameId)
//     .catch((error) => {
//       log.error('Launcher', `Error deleting game: ${error}`);
//       alert(strings.dialog.unableToDeleteGame + '\n\n' + error);
//     });
//   };

//   async cachePlaylistIcons(playlists: Playlist[]) {
//     return Promise.all(playlists.map(p => (async () => {
//       if (p.icon) { return cacheIcon(p.icon); }
//     })()))
//     .then(urls => {
//       const cache: Record<string, string> = {};
//       for (let i = 0; i < playlists.length; i++) {
//         const url = urls[i];
//         if (url) { cache[playlists[i].id] = url; }
//       }
//       this.props.setMainState({ playlistIconCache: cache });
//     });
//   }

//   orderPlaylistsMemo = memoizeOne((playlists: Playlist[]) => {
//     // @FIXTHIS "arcade" should not be hard coded as the "default" library
//     return (
//       [...playlists]
//       .sort((a, b) => {
//         return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
//       })
//     );
//   });

//   private unmountBeforeClose = (): void => {
//     setTimeout(() => {
//       window.Shared.back.allowDeath();
//       if (window.electronAPI !== undefined) {
//         this.props.setMainState({
//           quitting: true
//         });
//         window.Shared.back.request(BackIn.QUIT)
//         .finally(() => {
//           window.close();
//         });
//       }
//     }, 100);
//   };

//   private checkGameRunningMemo = memoizeOne((gameId: string | undefined, services: IService[]) => {
//     return gameId ? !!services.find(s => s.id === `game.${gameId}`) : false;
//   });

//   onToggleTaskBarOpen = (): void => {
//     this.props.setMainState({ taskBarOpen: !this.props.main.taskBarOpen });
//   };

//   rollRandomGames = (first?: boolean) => {
//     const { randomGames, requestingRandomGames } = this.props.main;

//     // Shift in new games from the queue
//     if (first !== true) {
//       this.props.mainActions.shiftRandomGames();
//     }

//     // Request more games to the queue
//     if (randomGames.length <= (RANDOM_GAME_ROW_COUNT * 5) && !requestingRandomGames) {
//       this.props.setMainState({
//         requestingRandomGames: true
//       });

//       window.Shared.back.request(BackIn.RANDOM_GAMES, {
//         count: RANDOM_GAME_ROW_COUNT * 10,
//         excludedLibraries: this.props.preferencesData.excludedRandomLibraries,
//       })
//       .then((data) => {
//         this.props.mainActions.addRandomGames(data);
//       });
//     }
//   };

//   openFlashpointManager = () => {
//     this.props.setMainState({
//       quitting: true
//     });
//     window.Shared.back.send(BackIn.OPEN_FLASHPOINT_MANAGER);
//   };

//   fetchFpfssGame = async (url: string) => {
//     const res = await axios.get(url, {
//       headers: {
//         Authorization: `Bearer ${this.props.fpfss.user?.accessToken}`
//       }
//     });
//     const game = mapFpfssGameToLocal(res.data);
//     console.log(game);
//     this.props.fpfssActions.setGame(game);
//   };

//   openFpfssEditGame = (url: string) => {
//     // Force a tags update
//     if (this.props.preferencesData.gameMetadataSources.length === 0) {
//       alert('No metadata sources in preferences.json, aborting remote edit');
//       return;
//     }
//     const source = this.props.preferencesData.gameMetadataSources[0];
//     window.Shared.back.request(BackIn.SYNC_TAGGED, source)
//     .then(() => {
//       // Edit game in-launcher then send it back to server
//       this.performFpfssAction(async (user) => {
//         if (this.props.fpfss.editingGame) {
//           alert('Game edit already open');
//         } else {
//           // Download Game metadata and add to state
//           return this.fetchFpfssGame(url);
//         }
//       });
//     })
//     .catch((err) => {
//       alert(`Failed to update tags: ${err}`);
//     });
//   };

//   onCancelFpfssEditGame = () => {
//     this.props.fpfssActions.setGame(null);
//   };

//   onSaveFpfssEditGame = async () => {
//     const localGame = this.props.fpfss.editingGame;
//     if (localGame && this.props.fpfss.user) {
//       const game = mapLocalToFpfssGame(localGame);
//       this.props.fpfssActions.setGame(null);
//       const url = `${this.props.preferencesData.fpfssBaseUrl}/api/game/${game.id}`;

//       console.log(JSON.stringify(game));
//       // Post changes
//       await axios.post(url, game, {
//         headers: {
//           Authorization: `Bearer ${this.props.fpfss.user?.accessToken}`
//         }
//       })
//       .then(() => {
//         toast.success('Game Edit Submitted');
//       }).catch((err) => {
//         alert('Error submitting game changes: ' + err);
//       });
//     }
//   };

//   onFpfssEditGame = (gameId: string) => {
//     if (this.props.preferencesData.gameMetadataSources.length > 0) {
//       const url = `${this.props.preferencesData.gameMetadataSources[0].baseUrl}/api/game/${gameId}`;
//       this.openFpfssEditGame(url);
//     }
//   };

//   onSearch = (text: string) => {
//     this.props.searchActions.setSearchText({
//       view: this.props.currentView.id,
//       text,
//     });
//     this.props.searchActions.forceSearch({
//       view: this.props.currentView.id,
//       useCustomViews: this.props.preferencesData.useCustomViews
//     });
//   };

//   onApplyFpfssEditGame = (game: Partial<Game>) => {
//     this.props.fpfssActions.applyGameDelta(game);
//   };

//   onApplyFpfssEditGameData(id: number) {
//     this.props.fpfssActions.applyGameDelta({
//       activeDataId: id
//     });
//   }

//   async doFpfssAuth(): Promise<FpfssUser | null> {
//     const user = await fpfssLogin(this.props.mainActions.createDialog, this.props.mainActions.cancelDialog, this.props.preferencesData.fpfssBaseUrl)
//     .catch((err) => {
//       if (err !== 'User Cancelled') {
//         alert(err);
//       }
//     }) as FpfssUser | null; // Weird void from inferred typing?
//     if (user) {
//       // Store in fpfss state
//       this.props.fpfssActions.setUser(user);
//       // Store in localstorage
//       const userBase64 = Buffer.from(JSON.stringify(user, null, 0)).toString('base64');
//       localStorage.setItem('fpfss_user', userBase64);
//     }
//     return user;
//   }

//   async _performFpfssAction(user: FpfssUser, cb: (user: FpfssUser) => any) {
//     try {
//       await cb(user);
//     } catch (err) {
//       // Check if the error is an axios error, so we can handle lack of auth
//       if (isAxiosError(err)) {
//         // Axios being dumb as bricks here
//         const jsonErr = JSON.parse(JSON.stringify(err));
//         if (jsonErr.status === 401) {
//           // Must reauth
//           this.props.fpfssActions.setUser(null);
//           localStorage.removeItem('fpfss_user');
//           const newUser = await this.doFpfssAuth();
//           if (newUser) {
//             this._performFpfssAction(newUser, cb);
//           }
//           return;
//         }
//       }
//       log.error('Launcher', `[FPFSS] Failed to execute action - ${err}`);
//       alert(`[FPFSS] Failed to execute action - ${err}`);
//     }
//   }

//   /**
//    * Performs a callback with the active FPFSS user.
//    * If the callback throws an axios 401 error, it will automatically try to reauth and retry.
//    *
//    * @param cb Callback to perform with user
//    */
//   async performFpfssAction(cb: (user: FpfssUser) => any) {
//     let user = this.props.fpfss.user;
//     if (!user) {
//       user = await this.doFpfssAuth();
//     }

//     if (user) {
//       // User exists, carry on to callback
//       this._performFpfssAction(user, cb);
//     }
//   }
// }

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
