import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import { BrowsePageLayout } from '../shared/BrowsePageLayout';
import { IGameInfo } from '../shared/game/interfaces';
import { GameOrderChangeEvent } from './components/GameOrder';
import { AboutPage, AboutPageProps } from './components/pages/AboutPage';
import { CuratePage, CuratePageProps } from './components/pages/CuratePage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import ConnectedBrowsePage, { ConnectedBrowsePageProps } from './containers/ConnectedBrowsePage';
import { ConnectedConfigPage, ConnectedConfigPageProps } from './containers/ConnectedConfigPage';
import { ConnectedDeveloperPage } from './containers/ConnectedDeveloperPage';
import { ConnectedHomePage, ConnectedHomePageProps } from './containers/ConnectedHomePage';
import { ConnectedLogsPage } from './containers/ConnectedLogsPage';
import { ICreditsData } from './credits/interfaces';
import { GameImageCollection } from './image/GameImageCollection';
import { CentralState } from './interfaces';
import { Paths } from './Paths';
import { IGamePlaylist } from './playlist/interfaces';
import { IThemeListItem } from './theme/ThemeManager';
import { Language } from 'src/shared/lang/types';

export type AppRouterProps = {
  /** Semi-global prop. */
  central: CentralState;
  /** Credits data (if any). */
  creditsData?: ICreditsData;
  creditsDoneLoading: boolean;
  order?: GameOrderChangeEvent;
  gameScale: number;
  gameLayout: BrowsePageLayout;
  gameImages: GameImageCollection;
  selectedGame?: IGameInfo;
  selectedPlaylist?: IGamePlaylist;
  onSelectGame?: (game?: IGameInfo) => void;
  onSelectPlaylist: (playlist?: IGamePlaylist, route?: string) => void;
  wasNewGameClicked: boolean;
  onDownloadTechUpgradeClick: () => void;
  onDownloadScreenshotsUpgradeClick: () => void;
  gameLibraryRoute: string;
  themeItems: IThemeListItem[];
  reloadTheme: (themePath: string | undefined) => void;
  languages: Language[];
  updateLocalization: () => void;
};

export class AppRouter extends React.Component<AppRouterProps> {
  render() {
    const homeProps: ConnectedHomePageProps = {
      central: this.props.central,
      onSelectPlaylist: this.props.onSelectPlaylist,
      gameImages: this.props.gameImages,
      onDownloadTechUpgradeClick: this.props.onDownloadTechUpgradeClick,
      onDownloadScreenshotsUpgradeClick: this.props.onDownloadScreenshotsUpgradeClick,
    };
    const browseProps: ConnectedBrowsePageProps = {
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
      gameLibraryRoute: this.props.gameLibraryRoute,
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
      games: this.props.central.games,
      gameImages: this.props.gameImages
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
          component={ConnectedDeveloperPage}
          central={this.props.central}
          gameImages={this.props.gameImages} />
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
