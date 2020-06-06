import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { BrowsePageLayout } from '@shared/BrowsePageLayout';
import { GamePropSuggestions } from '@shared/interfaces';
import { LangContainer, LangFile } from '@shared/lang';
import { Theme } from '@shared/ThemeFile';
import { AppUpdater, UpdateInfo } from 'electron-updater';
import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import { GameOrderChangeEvent } from './components/GameOrder';
import { AboutPage, AboutPageProps } from './components/pages/AboutPage';
import { DeveloperPage, DeveloperPageProps } from './components/pages/DeveloperPage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import ConnectedBrowsePage, { ConnectedBrowsePageProps } from './containers/ConnectedBrowsePage';
import { ConnectedConfigPage, ConnectedConfigPageProps } from './containers/ConnectedConfigPage';
import { ConnectedCuratePage, ConnectedCuratePageProps } from './containers/ConnectedCuratePage';
import { ConnectedHomePage, ConnectedHomePageProps } from './containers/ConnectedHomePage';
import { ConnectedLogsPage } from './containers/ConnectedLogsPage';
import { ConnectedTagCategoriesPage, ConnectedTagCategoriesPageProps } from './containers/ConnectedTagCategoriesPage';
import { ConnectedTagsPage, ConnectedTagsPageProps } from './containers/ConnectedTagsPage';
import { CreditsData } from './credits/types';
import { UpdateView, ViewGameSet } from './interfaces';
import { Paths } from './Paths';
import { UpgradeStage } from './upgrade/types';

export type AppRouterProps = {
  games: ViewGameSet;
  gamesTotal?: number;
  playlists: Playlist[];
  suggestions: Partial<GamePropSuggestions>;
  appPaths: Record<string, string>;
  platforms: Record<string, string[]>;
  platformsFlat: string[];
  onSaveGame: (game: Game, playlistEntry?: PlaylistGame) => void;
  onDeleteGame: (gameId: string) => void;
  onLaunchGame: (gameId: string) => void;
  onQuickSearch: (search: string) => void;
  onOpenExportMetaEdit: (gameId: string) => void;
  updateView: UpdateView;
  playlistIconCache: Record<string, string>;
  libraries: string[];
  serverNames: string[];
  mad4fpEnabled: boolean;
  localeCode: string;

  upgrades: UpgradeStage[];
  creditsData?: CreditsData;
  creditsDoneLoading: boolean;
  order?: GameOrderChangeEvent;
  gameScale: number;
  gameLayout: BrowsePageLayout;
  selectedGameId?: string;
  selectedPlaylistId?: string;
  onSelectGame: (gameId?: string) => void;
  onUpdatePlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlist: Playlist) => void;
  onSelectPlaylist: (library: string, playlistId: string | undefined) => void;
  wasNewGameClicked: boolean;
  onDownloadUpgradeClick: (stage: UpgradeStage, strings: LangContainer) => void;
  gameLibrary: string;
  themeList: Theme[];
  languages: LangFile[];
  updateInfo: UpdateInfo | undefined,
  autoUpdater: AppUpdater,
};

export class AppRouter extends React.Component<AppRouterProps> {
  render() {
    const homeProps: ConnectedHomePageProps = {
      platforms: this.props.platforms,
      playlists: this.props.playlists,
      upgrades: this.props.upgrades,
      onSelectPlaylist: this.props.onSelectPlaylist,
      onLaunchGame: this.props.onLaunchGame,
      onDownloadUpgradeClick: this.props.onDownloadUpgradeClick,
      updateInfo: this.props.updateInfo,
      autoUpdater: this.props.autoUpdater
    };
    const browseProps: ConnectedBrowsePageProps = {
      games: this.props.games,
      updateView: this.props.updateView,
      gamesTotal: this.props.gamesTotal,
      playlists: this.props.playlists,
      suggestions: this.props.suggestions,
      playlistIconCache: this.props.playlistIconCache,
      onSaveGame: this.props.onSaveGame,
      onDeleteGame: this.props.onDeleteGame,
      onQuickSearch: this.props.onQuickSearch,
      onOpenExportMetaEdit: this.props.onOpenExportMetaEdit,
      order: this.props.order,
      gameScale: this.props.gameScale,
      gameLayout: this.props.gameLayout,
      selectedGameId: this.props.selectedGameId,
      selectedPlaylistId: this.props.selectedPlaylistId,
      onSelectGame: this.props.onSelectGame,
      onUpdatePlaylist: this.props.onUpdatePlaylist,
      onDeletePlaylist: this.props.onDeletePlaylist,
      onSelectPlaylist: this.props.onSelectPlaylist,
      wasNewGameClicked: this.props.wasNewGameClicked,
      gameLibrary: this.props.gameLibrary,
    };
    const tagsProps: ConnectedTagsPageProps = {
      tagScale: this.props.gameScale
    };
    const tagCategoriesProps: ConnectedTagCategoriesPageProps = {
      tagScale: this.props.gameScale
    };
    const configProps: ConnectedConfigPageProps = {
      themeList: this.props.themeList,
      availableLangs: this.props.languages,
      platforms: this.props.platformsFlat,
      localeCode: this.props.localeCode,
      serverNames: this.props.serverNames,
    };
    const aboutProps: AboutPageProps = {
      creditsData: this.props.creditsData,
      creditsDoneLoading: this.props.creditsDoneLoading
    };
    const curateProps: ConnectedCuratePageProps = {
      suggestions: this.props.suggestions,
      appPaths: this.props.appPaths,
      libraries: this.props.libraries,
      mad4fpEnabled: this.props.mad4fpEnabled,
    };
    const developerProps: DeveloperPageProps = {
      platforms: this.props.platformsFlat,
      playlists: this.props.playlists,
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
          component={ConnectedTagsPage}
          { ...tagsProps } />
        <PropsRoute
          path={Paths.CATEGORIES}
          component={ConnectedTagCategoriesPage}
          { ...tagCategoriesProps } />
        <PropsRoute
          path={Paths.LOGS}
          component={ConnectedLogsPage} />
        <PropsRoute
          path={Paths.CONFIG}
          component={ConnectedConfigPage}
          { ...configProps } />
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

/** Reusable way to pass properties down a router and to its component. */
const PropsRoute = ({ component, ...rest }: any) => (
  <Route
    { ...rest }
    render={routeProps => renderMergedProps(component, routeProps, rest)} />
);

function renderMergedProps(component: any, ...rest: any[]) {
  const finalProps = Object.assign({}, ...rest);
  return React.createElement(component, finalProps);
}
