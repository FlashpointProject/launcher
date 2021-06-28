import * as React from 'react';
import { OpenIcon } from './OpenIcon';

export type HomePageBoxProps = {
  minimized: boolean;
  cssKey: string;
  title: string;
  onToggleMinimize: () => void;
}

export function HomePageBox(props: React.PropsWithChildren<HomePageBoxProps>) {
  return (
    <div className={`home-page__box home-page__box--${props.cssKey}`}>
      <div className='home-page__box-head'>
        <div className='home-page__box-head--title'>{props.title}</div>
        <div className='home-page__box-head--minimize'
          onClick={props.onToggleMinimize}>
          { props.minimized ? (
            <OpenIcon icon='chevron-bottom' />
          ) : (
            <OpenIcon icon='chevron-top' />
          )}
        </div>
      </div>
      { !props.minimized && (
        <ul className='home-page__box-body'>
          {props.children}
        </ul>
      )}
    </div>
  );
}
