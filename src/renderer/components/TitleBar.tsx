import { VERSION } from '@shared/version';

export type TitleBarProps = {
  /** Title to display. */
  title?: string;
};

// Title bar of the window (the top-most part of the window).
export function TitleBar(props: TitleBarProps) {
  return (
    <div className='title-bar'>
      <div className='title-bar__inner'>
        <p className='title-bar__title'>{props.title || ''}</p>
        <p className='title-bar__build'>{VERSION}</p>
        <div className='title-bar__button-bar'>
          {window.electronAPI !== undefined && (
            <>
              <div
                className='title-bar__button-bar__min'
                onClick={window.electronAPI?.minimize} /><div
                className='title-bar__button-bar__max'
                onClick={window.electronAPI?.maximize} /><div
                className='title-bar__button-bar__cross'
                onClick={window.electronAPI?.close} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
