import * as React from 'react';
import * as AppConstants from '../../../shared/AppConstants';

export const HomePage: React.StatelessComponent<{}> = () => {
  return (
    <div className="home">
      <h1 className="home__title">{AppConstants.appTitle}</h1>
      <p className="home__subtitle">{`${AppConstants.appSubtitle} (${AppConstants.appVersionString}`})</p>
      <br/>
      <div className="home__tutorial">
        <b>Tutorial:</b><br/>
        Click the <i>Browse</i> button at the top-left to show all games.<br/>
        <i>Double Click</i> any game in the games list to launch it.<br/>
      </div>
    </div>
  );
};
