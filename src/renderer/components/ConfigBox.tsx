import * as React from 'react';

export type ConfigBoxProps = {
  title: string;
  description: string;
  contentClassName?: string;
  bottomChildren?: JSX.Element | JSX.Element[];
}

export function ConfigBox(props: React.PropsWithChildren<ConfigBoxProps>) {
  return (
    <div className='setting__row'>
      <div className='setting__row__top'>
        <p className='setting__row__title'>{props.title}</p>
        <div className={`setting__row__content ${props.contentClassName}`}>
          { props.children }
        </div>
      </div>
      <div className='setting__row__bottom'>
        <p>{props.description}</p>
        {props.bottomChildren}
      </div>
    </div>
  );
}
