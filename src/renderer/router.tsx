import { RequestState } from '@renderer/store/search/slice';
import { Paths } from '@shared/Paths';
import { ITheme } from '@shared/ThemeFile';
import { ComponentStatus, FpfssUser, GameOfTheDay } from '@shared/back/types';
import { AppExtConfigData } from '@shared/config/interfaces';
import { ExtensionContribution, IExtensionDescription, ILogoSet } from '@shared/extensions/interfaces';
import { GamePropSuggestions, IService } from '@shared/interfaces';
import { LangFile } from '@shared/lang';
import { UpdateInfo } from 'electron-updater';
import { GameLaunchOverride, Playlist, ViewGame } from 'flashpoint-launcher';
import { Route, Routes } from 'react-router-dom';
import { AboutPage, AboutPageProps } from './components/pages/AboutPage';
import { BrowsePage, BrowsePageProps } from './components/pages/BrowsePage';
import { CuratePage } from './components/pages/CuratePage';
import { DownloadsPage } from './components/pages/Downloads';
import { DynamicPage, DynamicPageProps } from './components/pages/DynamicPage';
import { HomePage, HomePageProps } from './components/pages/HomePage';
import { IFramePage, IFramePageProps } from './components/pages/IFramePage';
import { LoadingPage } from './components/pages/LoadingPage';
import { LogsPage } from './components/pages/LogsPage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import { TagCategoriesPage } from './components/pages/TagCategoriesPage';
import { TagsPage } from './components/pages/TagsPage';
import { ConnectedConfigPage, ConnectedConfigPageProps } from './containers/ConnectedConfigPage';
import { CreditsData } from './credits/types';

export type AppRouterProps = {
  fpfssUser: FpfssUser | null;
  gotdList: GameOfTheDay[] | undefined;
  randomGames: ViewGame[];
  rollRandomGames: () => void;
  gamesTotal: number;
  allPlaylists: Playlist[];
  playlists: Playlist[];
  suggestions: Partial<GamePropSuggestions>;
  appPaths: Record<string, string>;
  platforms: string[];
  onLaunchGame: (gameId: string, override: GameLaunchOverride) => void;
  playlistIconCache: Record<string, string>;
  libraries: string[];
  serverNames: string[];
  mad4fpEnabled: boolean;
  localeCode: string;
  devConsole: string;
  creditsData?: CreditsData;
  creditsDoneLoading: boolean;
  selectedGameId?: string;
  gameRunning: boolean;
  selectedPlaylistId?: string;
  onGameContextMenu: (event: React.MouseEvent, gameId: string, logoPath: string, screenshotPath: string) => void;
  onUpdatePlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlist: Playlist) => void;
  wasNewGameClicked: boolean;
  gameLibrary: string;
  themeList: ITheme[];
  languages: LangFile[];
  updateInfo: UpdateInfo | undefined,
  extensions: IExtensionDescription[],
  devScripts: ExtensionContribution<'devScripts'>[],
  contextButtons: ExtensionContribution<'contextButtons'>[],
  curationTemplates: ExtensionContribution<'curationTemplates'>[],
  logoSets: ILogoSet[],
  extConfigs: ExtensionContribution<'configuration'>[],
  extConfig: AppExtConfigData,
  services: IService[],
  logoVersion: number,
  updateFeedMarkdown: string,
  manualUrl: string,
  componentStatuses: ComponentStatus[],
  openFlashpointManager: () => void,
  onMovePlaylistGame: (sourceGameId: string, destGameId: string) => void,
  searchStatus: string | null,
  dynamicPageProps?: DynamicPageProps,
  metaState?: RequestState,
};

export function AppRouter(props: AppRouterProps) {
  const homeProps: HomePageProps = {
    gotdList: props.gotdList,
    platforms: props.platforms,
    onGameContextMenu: props.onGameContextMenu,
    onLaunchGame: props.onLaunchGame,
    randomGames: props.randomGames,
    rollRandomGames: props.rollRandomGames,
    updateFeedMarkdown: props.updateFeedMarkdown,
    selectedGameId: props.selectedGameId,
  };
  const browseProps: BrowsePageProps = {
    sourceTable: 'browse-page',
    gamesTotal: props.gamesTotal,
    playlists: props.playlists,
    libraries: props.libraries,
    playlistIconCache: props.playlistIconCache,
    onGameContextMenu: props.onGameContextMenu,
    onUpdatePlaylist: props.onUpdatePlaylist,
    onDeletePlaylist: props.onDeletePlaylist,
    logoVersion: props.logoVersion,
    contextButtons: props.contextButtons,
    onMovePlaylistGame: props.onMovePlaylistGame,
    searchStatus: props.searchStatus,
    metaState: props.metaState,
  };
  const configProps: ConnectedConfigPageProps = {
    themeList: props.themeList,
    logoSets: props.logoSets,
    logoVersion: props.logoVersion,
    availableLangs: props.languages,
    libraries: props.libraries,
    platforms: props.platforms,
    localeCode: props.localeCode,
    serverNames: props.serverNames,
    extensions: props.extensions,
    extConfigs: props.extConfigs,
    extConfig: props.extConfig,
  };
  const aboutProps: AboutPageProps = {
    creditsData: props.creditsData,
    creditsDoneLoading: props.creditsDoneLoading
  };
  const curateProps: CuratePageProps = {
    extCurationTemplates: props.curationTemplates,
    extContextButtons: props.contextButtons,
    mad4fpEnabled: props.mad4fpEnabled,
    logoVersion: props.logoVersion,
  };
  const iframePageProps: IFramePageProps = {
    url: props.manualUrl
  };
  return (
    <Routes>
      <Route
        path={Paths.LOADING}
        element={<LoadingPage/>}/>
      <Route
        path={Paths.HOME}
        element={<HomePage {...homeProps}/>}/>
      <Route
        path={Paths.BROWSE}
        element={<BrowsePage {...browseProps}/>}/>
      <Route
        path={Paths.TAGS}
        element={<TagsPage/>}/>
      <Route
        path={Paths.CATEGORIES}
        element={<TagCategoriesPage/>}/>
      <Route
        path={Paths.DOWNLOADS}
        element={<DownloadsPage/>}/>
      <Route
        path={Paths.LOGS}
        element={<LogsPage/>}/>
      <Route
        path={Paths.CONFIG}
        element={<ConnectedConfigPage {...configProps}/>}/>
      <Route
        path={Paths.MANUAL}
        element={<IFramePage {...iframePageProps} />}/>
      <Route
        path={Paths.ABOUT}
        element={<AboutPage {...aboutProps}/>}/>
      <Route
        path={Paths.CURATE}
        element={<CuratePage {...curateProps} />}/>
      <Route
        path={Paths.DYNAMIC}
        element={<DynamicPage name={props.dynamicPageProps?.name || ''} props={props.dynamicPageProps?.props}/>}/>
      <Route element={<NotFoundPage/>}/>
    </Routes>
  );
}
