import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import { BrowsePageLayout } from '../shared/BrowsePageLayout';
import { IGameInfo } from '../shared/game/interfaces';
import { LangFile } from '../shared/lang';
import { GameOrderChangeEvent } from './components/GameOrder';
import { AboutPage, AboutPageProps } from './components/pages/AboutPage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import ConnectedBrowsePage, { ConnectedBrowsePageProps } from './containers/ConnectedBrowsePage';
import { ConnectedConfigPage, ConnectedConfigPageProps } from './containers/ConnectedConfigPage';
import { ConnectedCuratePage, ConnectedCuratePageProps } from './containers/ConnectedCuratePage';
import { ConnectedDeveloperPage } from './containers/ConnectedDeveloperPage';
import { ConnectedHomePage, ConnectedHomePageProps } from './containers/ConnectedHomePage';
import { ConnectedLogsPage } from './containers/ConnectedLogsPage';
import { CreditsData } from './credits/types';
import { GameImageCollection } from './image/GameImageCollection';
import { CentralState } from './interfaces';
import { Paths } from './Paths';
import { GamePlaylist } from './playlist/types';
import { IThemeListItem } from './theme/ThemeManager';
import { UpgradeStage } from './upgrade/types';

export type AppRouterProps = {
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
  onDownloadUpgradeClick: (stage: UpgradeStage) => void;
  gameLibraryRoute: string;
  themeItems: IThemeListItem[];
  reloadTheme: (themePath: string | undefined) => void;
  languages: LangFile[];
  updateLocalization: () => void;
  platformList: string[];
};

export class AppRouter extends React.Component<AppRouterProps> {
  render() {
    const homeProps: ConnectedHomePageProps = {
      central: this.props.central,
      onSelectPlaylist: this.props.onSelectPlaylist,
      gameImages: this.props.gameImages,
      onDownloadUpgradeClick: this.props.onDownloadUpgradeClick
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
      platformList: this.props.platformList
    };
    const aboutProps: AboutPageProps = {
      creditsData: this.props.creditsData,
      creditsDoneLoading: this.props.creditsDoneLoading
    };
    const curateProps: ConnectedCuratePageProps = {
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
          component={ConnectedCuratePage}
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
