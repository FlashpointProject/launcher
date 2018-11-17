import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import { NotFoundPage } from './components/pages/NotFoundPage';
import { ICentralState } from './interfaces';
import { AboutPage } from './components/pages/AboutPage';
import { IGameOrderChangeEvent } from './components/GameOrder';
import { LogsPage } from './components/pages/LogsPage';
import { ConfigPage } from './components/pages/ConfigPage';
import { Paths } from './Paths';
import { BrowsePageLayout } from '../shared/BrowsePageLayout';
import { HomePage } from './components/pages/HomePage';
import { IGameInfo } from '../shared/game/interfaces';
import { IGamePlaylist } from './playlist/interfaces';
import ConnectedBrowsePage, { IConnectedBrowsePageProps } from './containers/ConnectedBrowsePage';

export interface IAppRouterProps {
  central: ICentralState;
  order?: IGameOrderChangeEvent;
  logData: string;
  gameScale: number;
  gameLayout: BrowsePageLayout;
  selectedGame?: IGameInfo;
  selectedPlaylist?: IGamePlaylist;
  onSelectGame?: (game?: IGameInfo) => void;
  onSelectPlaylist?: (playlist?: IGamePlaylist) => void;
  wasNewGameClicked: boolean;
}

export class AppRouter extends React.Component<IAppRouterProps, {}> {
  render() {
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
    };
    return (
      <Switch>
        <PropsRoute exact path={Paths.home} component={HomePage}
                    central={this.props.central} gameScale={this.props.gameScale} />
        <PropsRoute path={Paths.browse} component={ConnectedBrowsePage}
                    {...browseProps} />
        <PropsRoute path={Paths.logs} component={LogsPage}
                    logData={this.props.logData} />
        <PropsRoute path={Paths.config} component={ConfigPage} />
        <Route path={Paths.about} component={AboutPage} />
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
