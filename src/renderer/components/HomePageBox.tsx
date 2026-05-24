import * as React from 'react';
import { OpenIcon } from './OpenIcon';
import { HomePageBoxProps } from 'flashpoint-launcher-renderer';

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
