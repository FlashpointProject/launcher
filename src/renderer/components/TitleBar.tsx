import * as React from 'react';

export type TitleBarProps = {
  /** Title to display. */
  title?: string;
};

/** Title bar of the window (the top-most part of the window). */
export function TitleBar(props: TitleBarProps) {
  return (
    <div className='title-bar'>
      <div className='title-bar__inner'>
        <p className='title-bar__title'>{props.title || ''}</p>
        <div className='title-bar__button-bar'>
          <div
            className='title-bar__button-bar__min'
            onClick={window.Shared.minimize} />
          <div
            className='title-bar__button-bar__max'
            onClick={window.Shared.maximize} />
          <div
            className='title-bar__button-bar__cross'
            onClick={window.Shared.close} />
        </div>
      </div>
    </div>
  );
}
