import * as React from 'react';

export type SplashScreenProps = {
  playlistsLoaded: boolean;
  creditsLoaded: boolean;
  upgradesLoaded: boolean;
}

export function SplashScreen(props: SplashScreenProps) {
  const { playlistsLoaded, creditsLoaded, upgradesLoaded } = props;
  const loaded = playlistsLoaded && creditsLoaded && upgradesLoaded;
  const extraClass = loaded ? ' splash-screen--fade-out' : '';
  return (
    <div className={'splash-screen' + extraClass}>
      <div className='splash-screen__logo fp-logo-box'>
        <div className='fp-logo' />
      </div>
      <div className='splash-screen__status-block'>
        <div className='splash-screen__status-header'>
          Loading
        </div>
        {!creditsLoaded ?
          <div className='splash-screen__status'>
            Credits
          </div>
        : undefined}
        {!playlistsLoaded ?
          <div className='splash-screen__status'>
            Playlists
          </div>
        : undefined}
        {!upgradesLoaded ?
          <div className='splash-screen__status'>
              Upgrades
          </div>
        : undefined}
      </div>
    </div>
  );
}
