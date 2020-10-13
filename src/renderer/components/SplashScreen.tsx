import * as React from 'react';

export type SplashScreenProps = {
  gamesLoaded: boolean;
  upgradesLoaded: boolean;
  creditsLoaded: boolean;
  curationsLoaded: boolean;
  miscLoaded: boolean;
}

export function SplashScreen(props: SplashScreenProps) {
  const { gamesLoaded, upgradesLoaded, creditsLoaded, curationsLoaded, miscLoaded } = props;
  const extraClass = (gamesLoaded && upgradesLoaded && creditsLoaded && curationsLoaded && miscLoaded)
    ? ' splash-screen--fade-out'
    : '';

  return (
    <div className={'splash-screen' + extraClass}>
      <div className='splash-screen__logo fp-logo-box'>
        <div className='fp-logo' />
      </div>
      <div className='splash-screen__status-block'>
        <div className='splash-screen__status-header'>
          Loading
        </div>
        { !gamesLoaded ? (
          <div className='splash-screen__status'>
            Games
          </div>
        ) : undefined }
        { !upgradesLoaded ? (
          <div className='splash-screen__status'>
            Upgrades
          </div>
        ) : undefined }
        { !creditsLoaded ? (
          <div className='splash-screen__status'>
            Credits
          </div>
        ) : undefined }
        { !curationsLoaded ? (
          <div className='splash-screen__status'>
            Curations
          </div>
        ) : undefined }
        { !miscLoaded ? (
          <div className='splash-screen__status'>
            Misc
          </div>
        ) : undefined }
      </div>
    </div>
  );
}
