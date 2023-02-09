import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { GameOfTheDay, ViewGame } from '@shared/back/types';
import { AppExtConfigData } from '@shared/config/interfaces';
import { ExtensionContribution, IExtensionDescription, ILogoSet } from '@shared/extensions/interfaces';
import { GamePropSuggestions, IService } from '@shared/interfaces';
import { LangFile } from '@shared/lang';
import { ITheme } from '@shared/ThemeFile';
import { Menu } from 'electron';
import { AppUpdater, UpdateInfo } from 'electron-updater';
import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import { AboutPage, AboutPageProps } from './components/pages/AboutPage';
import { DeveloperPage, DeveloperPageProps } from './components/pages/DeveloperPage';
import { IFramePage, IFramePageProps } from './components/pages/IFramePage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import ConnectedBrowsePage, { ConnectedBrowsePageProps } from './containers/ConnectedBrowsePage';
import { ConnectedConfigPage, ConnectedConfigPageProps } from './containers/ConnectedConfigPage';
import { ConnectedCuratePage, ConnectedCuratePageProps } from './containers/ConnectedCuratePage';
import { ConnectedHomePage, ConnectedHomePageProps } from './containers/ConnectedHomePage';
import { ConnectedLogsPage } from './containers/ConnectedLogsPage';
import { ConnectedTagCategoriesPage } from './containers/ConnectedTagCategoriesPage';
import { ConnectedTagsPage } from './containers/ConnectedTagsPage';
import { CreditsData } from './credits/types';
import { UpdateView, ViewGameSet } from './interfaces';
import { Paths } from './Paths';

export type AppRouterProps = {
  gotdList: GameOfTheDay[];
  games: ViewGameSet;
  randomGames: ViewGame[];
  rollRandomGames: () => void;
  gamesTotal?: number;
  allPlaylists: Playlist[];
  playlists: Playlist[];
  suggestions: Partial<GamePropSuggestions>;
  appPaths: Record<string, string>;
  platforms: Record<string, string[]>;
  platformsFlat: string[];
  onSaveGame: (game: Game, playlistEntry?: PlaylistGame) => Promise<Game | null>;
  onDeleteGame: (gameId: string) => void;
  onLaunchGame: (gameId: string) => void;
  onOpenExportMetaEdit: (gameId: string) => void;
  updateView: UpdateView;
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
  onGameContextMenu: (gameId: string) => Menu;
  onSelectGame: (gameId?: string) => void;
  onUpdatePlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlist: Playlist) => void;
  onSelectPlaylist: (library: string, playlistId: string | undefined) => void;
  wasNewGameClicked: boolean;
  gameLibrary: string;
  themeList: ITheme[];
  languages: LangFile[];
  updateInfo: UpdateInfo | undefined,
  autoUpdater: AppUpdater,
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
};

export class AppRouter extends React.Component<AppRouterProps> {
  render() {
    const homeProps: ConnectedHomePageProps = {
      gotdList: this.props.gotdList,
      platforms: this.props.platforms,
      playlists: this.props.allPlaylists,
      onGameContextMenu: this.props.onGameContextMenu,
      onSelectPlaylist: this.props.onSelectPlaylist,
      onLaunchGame: this.props.onLaunchGame,
      onGameSelect: this.props.onSelectGame,
      updateInfo: this.props.updateInfo,
      autoUpdater: this.props.autoUpdater,
      randomGames: this.props.randomGames,
      rollRandomGames: this.props.rollRandomGames,
      logoVersion: this.props.logoVersion,
      updateFeedMarkdown: this.props.updateFeedMarkdown,
      selectedGameId: this.props.selectedGameId
    };
    const browseProps: ConnectedBrowsePageProps = {
      games: this.props.games,
      updateView: this.props.updateView,
      gamesTotal: this.props.gamesTotal,
      playlists: this.props.playlists,
      playlistIconCache: this.props.playlistIconCache,
      onGameContextMenu: this.props.onGameContextMenu,
      onSaveGame: this.props.onSaveGame,
      onDeleteGame: this.props.onDeleteGame,
      selectedGameId: this.props.selectedGameId,
      selectedPlaylistId: this.props.selectedPlaylistId,
      onSelectGame: this.props.onSelectGame,
      onUpdatePlaylist: this.props.onUpdatePlaylist,
      onDeletePlaylist: this.props.onDeletePlaylist,
      onSelectPlaylist: this.props.onSelectPlaylist,
      wasNewGameClicked: this.props.wasNewGameClicked,
      gameLibrary: this.props.gameLibrary,
      logoVersion: this.props.logoVersion,
      contextButtons: this.props.contextButtons,
    };
    const configProps: ConnectedConfigPageProps = {
      themeList: this.props.themeList,
      logoSets: this.props.logoSets,
      logoVersion: this.props.logoVersion,
      availableLangs: this.props.languages,
      libraries: this.props.libraries,
      platforms: this.props.platformsFlat,
      localeCode: this.props.localeCode,
      serverNames: this.props.serverNames,
      extensions: this.props.extensions,
      extConfigs: this.props.extConfigs,
      extConfig: this.props.extConfig,
    };
    const aboutProps: AboutPageProps = {
      creditsData: this.props.creditsData,
      creditsDoneLoading: this.props.creditsDoneLoading
    };
    const curateProps: ConnectedCuratePageProps = {
      extCurationTemplates: this.props.curationTemplates,
      extContextButtons: this.props.contextButtons,
      mad4fpEnabled: this.props.mad4fpEnabled
    };
    const developerProps: DeveloperPageProps = {
      devConsole: this.props.devConsole,
      devScripts: this.props.devScripts,
      services: this.props.services
    };
    const iframePageProps: IFramePageProps = {
      url: this.props.manualUrl
    };
    return (
      <Switch>
        <PropsRoute
          exact
          path={Paths.HOME}
          component={ConnectedHomePage}
          { ...homeProps } />
        <PropsRoute
          path={Paths.BROWSE}
          component={ConnectedBrowsePage}
          { ...browseProps } />
        <PropsRoute
          path={Paths.TAGS}
          component={ConnectedTagsPage} />
        <PropsRoute
          path={Paths.CATEGORIES}
          component={ConnectedTagCategoriesPage} />
        <PropsRoute
          path={Paths.LOGS}
          component={ConnectedLogsPage} />
        <PropsRoute
          path={Paths.CONFIG}
          component={ConnectedConfigPage}
          { ...configProps } />
        <PropsRoute
          path={Paths.MANUAL}
          component={IFramePage}
          { ...iframePageProps } />
        <PropsRoute
          path={Paths.ABOUT}
          component={AboutPage}
          { ...aboutProps } />
        <PropsRoute
          path={Paths.CURATE}
          component={ConnectedCuratePage}
          { ...curateProps } />
        <PropsRoute
          path={Paths.DEVELOPER}
          component={DeveloperPage}
          { ...developerProps } />
        <Route component={NotFoundPage} />
      </Switch>
    );
  }
}

// Reusable way to pass properties down a router and to its component.
const PropsRoute = ({ component, ...rest }: any) => (
  <Route
    { ...rest }
    render={routeProps => renderMergedProps(component, routeProps, rest)} />
);

function renderMergedProps(component: any, ...rest: any[]) {
  const finalProps = Object.assign({}, ...rest);
  return React.createElement(component, finalProps);
}
