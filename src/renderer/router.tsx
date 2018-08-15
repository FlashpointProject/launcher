import * as React from 'react';
import { Route, Switch, HashRouter } from 'react-router-dom';
import { HomePage } from './components/pages/HomePage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import { BrowsePage } from './components/pages/BrowsePage';
import { ILaunchBoxPlatform } from '../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from './components/generic/search/Search';

export interface IAppRouterProps {
  platform?: ILaunchBoxPlatform;
  search?: ISearchOnSearchEvent;
}

export class AppRouter extends React.Component<IAppRouterProps, {}> {
  /**
   * Some arbitrary key that changes between each render (that has a different url)
   * (This makes the page "reload" (re-instanciate the route component(s)) if a page with the same path links to another page with the same path)
   */
  private _key: number = 0;

  constructor(props: IAppRouterProps) {
    super(props);
  }

  render() {
    const props = {
      platform: this.props.platform,
      search: this.props.search,
    };
    return (
      <Switch key={(this._key++ % 1000)}>
        <Route exact path="/" component={HomePage} />
        <PropsRoute exact path="/browse" component={BrowsePage} {...props} />
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
