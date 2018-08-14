import * as React from 'react';
import { Route, Switch, HashRouter } from 'react-router-dom';
import { HomePage } from './components/pages/HomePage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import { BrowsePage } from './components/pages/BrowsePage';

export class AppRouter extends React.Component<{}, {}> {
  /**
   * Some arbitrary key that changes between each render (that has a different url)
   * (This makes the page "reload" (re-instanciate the route component(s)) if a page with the same path links to another page with the same path)
   */
  private _key: number = 0;

  constructor(props: {}) {
    super(props);
  }

  render() {
    return (
      <Switch key={(this._key++ % 1000)}>
      <Route exact path="/" component={HomePage} />
      <Route exact path="/browse" component={BrowsePage} />
      <Route component={NotFoundPage} />
    </Switch>
    );
  }
}
