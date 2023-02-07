import { BackInit } from '@shared/back/types';

export type SplashScreenProps = {
  loadedAll: boolean;
  loaded: { [key in BackInit]: boolean; };
}

export function SplashScreen(props: SplashScreenProps) {
  const extraClass = (props.loadedAll)
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
        { !props.loaded[BackInit.DATABASE] ? (
          <div className='splash-screen__status'>
            Database
          </div>
        ) : undefined }
        { !props.loaded[BackInit.PLAYLISTS] ? (
          <div className='splash-screen__status'>
            Playlists
          </div>
        ) : undefined }
        { !props.loaded[BackInit.CURATE] ? (
          <div className='splash-screen__status'>
            Curations
          </div>
        ) : undefined }
        { !props.loaded[BackInit.SERVICES] ? (
          <div className='splash-screen__status'>
            Services
          </div>
        ) : undefined }
        { !props.loaded[BackInit.EXTENSIONS] ? (
          <div className='splash-screen__status'>
            Extensions
          </div>
        ) : undefined }
        { !props.loaded[BackInit.EXEC_MAPPINGS] ? (
          <div className='splash-screen__status'>
            Exec Mappings
          </div>
        ) : undefined }
      </div>
    </div>
  );
}
