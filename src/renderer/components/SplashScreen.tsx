import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { BackInit } from '@shared/back/types';
import { PropsWithChildren, useEffect, useState } from 'react';

type SplashScreenProps = PropsWithChildren;

export function SplashScreen(props: SplashScreenProps) {
  const quitting = useAppSelector(state => state.main.quitting);
  const loadedAll = useAppSelector(state => state.main.loadedAll);
  const loaded = useAppSelector(state => state.main.loaded);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (loadedAll && !quitting) {
      // Give time for anim to happen, then stop rendering entire component
      setTimeout(() => {
        setFinished(true);
      }, 2000);
    }
  }, [loadedAll, quitting]);

  const extraClass = (loadedAll && !quitting)
    ? ' splash-screen--fade-out'
    : '';

  const splashScreen = !finished ? (
    <div className={'splash-screen' + extraClass}>
      <div className='splash-screen__logo fp-logo-box'>
        <div className='fp-logo' />
      </div>
      <div className='splash-screen__status-block'>
        <div className='splash-screen__status-header'>
          { quitting ? 'Closing Down' : 'Loading' }
        </div>
        { !loaded[BackInit.DATABASE] ? (
          <div className='splash-screen__status'>
            Database
          </div>
        ) : undefined }
        { !loaded[BackInit.PLAYLISTS] ? (
          <div className='splash-screen__status'>
            Playlists
          </div>
        ) : undefined }
        { !loaded[BackInit.SERVICES] ? (
          <div className='splash-screen__status'>
            Services
          </div>
        ) : undefined }
        { !loaded[BackInit.EXTENSIONS] ? (
          <div className='splash-screen__status'>
            Extensions
          </div>
        ) : undefined }
        { !loaded[BackInit.EXEC_MAPPINGS] ? (
          <div className='splash-screen__status'>
            Exec Mappings
          </div>
        ) : undefined }
      </div>
    </div>
  ) : undefined;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {splashScreen}
      {loadedAll ? props.children : undefined}
    </div>
  );
}
