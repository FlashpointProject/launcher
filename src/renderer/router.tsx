import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import { BrowsePageLayout } from '../shared/BrowsePageLayout';
import { IAdditionalApplicationInfo, IGameInfo } from '../shared/game/interfaces';
import { LangFile } from '../shared/lang';
import { PlatformInfo } from '../shared/platform/interfaces';
import { GameOrderChangeEvent } from './components/GameOrder';
import { AboutPage, AboutPageProps } from './components/pages/AboutPage';
import { CuratePage, CuratePageProps } from './components/pages/CuratePage';
import { DeveloperPage, DeveloperPageProps } from './components/pages/DeveloperPage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import ConnectedBrowsePage, { ConnectedBrowsePageProps } from './containers/ConnectedBrowsePage';
import { ConnectedConfigPage, ConnectedConfigPageProps } from './containers/ConnectedConfigPage';
import { ConnectedHomePage, ConnectedHomePageProps } from './containers/ConnectedHomePage';
import { ConnectedLogsPage } from './containers/ConnectedLogsPage';
import { CreditsData } from './credits/types';
import { GameImageCollection } from './image/GameImageCollection';
import { CentralState, GAMES, SUGGESTIONS } from './interfaces';
import { Paths } from './Paths';
import { GamePlaylist } from './playlist/types';
import { IThemeListItem } from './theme/ThemeManager';

export type AppRouterProps = {
  games: GAMES;
  gamesTotal: number;
  playlists: GamePlaylist[];
  suggestions: SUGGESTIONS;
  platforms: PlatformInfo[];
  save: (game: IGameInfo, addApps: IAdditionalApplicationInfo[] | undefined, saveToFile: boolean) => void;
  launchGame: (gameId: string) => void;
  deleteGame: (gameId: string) => void;
  /** Semi-global prop. */
  central: CentralState;
  /** Credits data (if any). */
  creditsData?: CreditsData;
  creditsDoneLoading: boolean;
  order?: GameOrderChangeEvent;
  gameScale: number;
  gameLayout: BrowsePageLayout;
  gameImages: GameImageCollection;
  selectedGame?: IGameInfo;
  selectedPlaylist?: GamePlaylist;
  onSelectGame?: (game?: IGameInfo) => void;
  onSelectPlaylist: (playlist?: GamePlaylist, route?: string) => void;
  wasNewGameClicked: boolean;
  onDownloadTechUpgradeClick: () => void;
  onDownloadScreenshotsUpgradeClick: () => void;
  gameLibrary: string;
  themeItems: IThemeListItem[];
  reloadTheme: (themePath: string | undefined) => void;
  languages: LangFile[];
  updateLocalization: () => void;
};

export class AppRouter extends React.Component<AppRouterProps> {
  render() {
    const homeProps: ConnectedHomePageProps = {
      platforms: this.props.platforms,
      launchGame: this.props.launchGame,
      central: this.props.central,
      onSelectPlaylist: this.props.onSelectPlaylist,
      gameImages: this.props.gameImages,
      onDownloadTechUpgradeClick: this.props.onDownloadTechUpgradeClick,
      onDownloadScreenshotsUpgradeClick: this.props.onDownloadScreenshotsUpgradeClick,
    };
    const browseProps: ConnectedBrowsePageProps = {
      games: this.props.games,
      gamesTotal: this.props.gamesTotal,
      playlists: this.props.playlists,
      suggestions: this.props.suggestions,
      save: this.props.save,
      launchGame: this.props.launchGame,
      deleteGame: this.props.deleteGame,

      central: this.props.central,
      order: this.props.order,
      gameScale: this.props.gameScale,
      gameLayout: this.props.gameLayout,
      gameImages: this.props.gameImages,
      selectedGame: this.props.selectedGame,
      selectedPlaylist: this.props.selectedPlaylist,
      onSelectGame: this.props.onSelectGame,
      onSelectPlaylist: this.props.onSelectPlaylist,
      wasNewGameClicked: this.props.wasNewGameClicked,
      gameLibrary: this.props.gameLibrary,
    };
    const configProps: ConnectedConfigPageProps = {
      themeItems: this.props.themeItems,
      reloadTheme: this.props.reloadTheme,
      availableLangs: this.props.languages,
      updateLocalization: this.props.updateLocalization,
    };
    const aboutProps: AboutPageProps = {
      creditsData: this.props.creditsData,
      creditsDoneLoading: this.props.creditsDoneLoading
    };
    const curateProps: CuratePageProps = {
      games: this.props.games,
      gameImages: this.props.gameImages
    };
    const developerProps: DeveloperPageProps = {
      platforms: this.props.platforms,
      central: this.props.central,
      gameImages: this.props.gameImages,
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
          component={CuratePage}
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
