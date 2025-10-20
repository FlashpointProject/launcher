import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { BackInit } from '@shared/back/types';

export function SplashScreen() {
  const quitting = useAppSelector(state => state.main.quitting);
  const loadedAll = useAppSelector(state => state.main.loadedAll);
  const loaded = useAppSelector(state => state.main.loaded);

  const extraClass = (loadedAll && !quitting)
    ? ' splash-screen--fade-out'
    : '';

  return (
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
  );
}
