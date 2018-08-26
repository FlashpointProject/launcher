import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import { HomePage } from './components/pages/HomePage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import { BrowsePage } from './components/pages/BrowsePage';
import { ISearchOnSearchEvent } from './components/generic/search/Search';
import { ICentralState } from './interfaces';
import { AboutPage } from './components/pages/AboutPage';
import { IGameOrderChangeEvent } from './components/GameOrder';
import LogsPage from './components/pages/LogsPage';
import { ConfigPage } from './components/pages/ConfigPage';
import { IAppConfigData } from '../shared/config/IAppConfigData';

export interface IAppRouterProps {
  central?: ICentralState;
  search?: ISearchOnSearchEvent;
  order?: IGameOrderChangeEvent;
  logData: string;
  config: IAppConfigData;
}

export class AppRouter extends React.Component<IAppRouterProps, {}> {
  render() {
    const props = {
      central: this.props.central,
      search: this.props.search,
      order: this.props.order,
    };

    return (
      <Switch>
        <Route exact path="/" component={HomePage} />
        <PropsRoute path="/browse" component={BrowsePage} {...props} />
        <PropsRoute path="/logs" component={LogsPage} logData={this.props.logData} />
        <PropsRoute path="/config" component={ConfigPage} config={this.props.config} />
        <Route path="/about" component={AboutPage} />
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
