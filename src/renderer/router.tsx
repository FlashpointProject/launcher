import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import { BrowsePageLayout } from '../shared/BrowsePageLayout';
import { IGameInfo } from '../shared/game/interfaces';
import { IGameOrderChangeEvent } from './components/GameOrder';
import { AboutPage, IAboutPageProps } from './components/pages/AboutPage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import ConnectedBrowsePage, { IConnectedBrowsePageProps } from './containers/ConnectedBrowsePage';
import { ConnectedConfigPage, IConnectedConfigPageProps } from './containers/ConnectedConfigPage';
import { ConnectedHomePage, IConnectedHomePageProps } from './containers/ConnectedHomePage';
import { ConnectedLogsPage } from './containers/ConnectedLogsPage';
import { ICentralState } from './interfaces';
import { Paths } from './Paths';
import { IGamePlaylist } from './playlist/interfaces';
import { ConnectedDeveloperPage } from './containers/ConnectedDeveloperPage';
import { ICreditsData } from './credits/interfaces';
import { IThemeListItem } from './theme/ThemeManager';

export interface IAppRouterProps {
  central: ICentralState;
  creditsData?: ICreditsData;
  creditsDoneLoading: boolean;
  order?: IGameOrderChangeEvent;
  gameScale: number;
  gameLayout: BrowsePageLayout;
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
}

export class AppRouter extends React.Component<IAppRouterProps, {}> {
  render() {
    const homeProps: IConnectedHomePageProps = {
      central: this.props.central,
      onSelectPlaylist: this.props.onSelectPlaylist,
      onDownloadTechUpgradeClick: this.props.onDownloadTechUpgradeClick,
      onDownloadScreenshotsUpgradeClick: this.props.onDownloadScreenshotsUpgradeClick,
    };
    const browseProps: IConnectedBrowsePageProps = {
      central: this.props.central,
      order: this.props.order,
      gameScale: this.props.gameScale,
      gameLayout: this.props.gameLayout,
      selectedGame: this.props.selectedGame,
      selectedPlaylist: this.props.selectedPlaylist,
      onSelectGame: this.props.onSelectGame,
      onSelectPlaylist: this.props.onSelectPlaylist,
      wasNewGameClicked: this.props.wasNewGameClicked,
      gameLibraryRoute: this.props.gameLibraryRoute,
    };
    const configProps: IConnectedConfigPageProps = {
      themeItems: this.props.themeItems,
      reloadTheme: this.props.reloadTheme
    };
    const aboutProps: IAboutPageProps = {
      creditsData: this.props.creditsData,
      creditsDoneLoading: this.props.creditsDoneLoading
    };
    return (
      <Switch>
        <PropsRoute exact path={Paths.HOME} component={ConnectedHomePage}
                    {...homeProps} />
        <PropsRoute path={Paths.BROWSE} component={ConnectedBrowsePage}
                    {...browseProps} />
        <PropsRoute path={Paths.LOGS} component={ConnectedLogsPage} />
        <PropsRoute path={Paths.CONFIG} component={ConnectedConfigPage}
                    {...configProps} />
        <PropsRoute path={Paths.ABOUT} component={AboutPage}
                    {...aboutProps} />
        <PropsRoute path={Paths.DEVELOPER} component={ConnectedDeveloperPage}
                    central={this.props.central} />
        <Route component={NotFoundPage} />
      </Switch>
    );
  }
}

// Reusable way to pass properties down a router and to its component
const renderMergedProps = (component: any, ...rest: any[]) => {
  const finalProps = Object.assign({}, ...rest);
  return (
    React.createElement(component, finalProps)
  );
}
const PropsRoute = ({ component, ...rest }: any) => {
  return (
    <Route {...rest} render={routeProps => {
      return renderMergedProps(component, routeProps, rest);
    }}/>
  );
}
