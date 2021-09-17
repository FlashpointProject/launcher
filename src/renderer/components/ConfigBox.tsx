import * as React from 'react';

export type ConfigBoxProps = {
  title: string;
  description: string;
  swapChildren?: boolean;
  contentClassName?: string;
  bottomChildren?: JSX.Element | JSX.Element[];
}

export function ConfigBox(props: React.PropsWithChildren<ConfigBoxProps>) {
  return (
    <div className='setting__row'>
      <div className={`setting__row__top ${props.swapChildren ? 'setting__row__top--swapchildren' : ''}`}>
        <p className='setting__row__title'>{props.title}</p>
        <div className={`setting__row__content ${props.contentClassName} ${props.swapChildren ? 'setting__row__content--bottom-margin' : ''}`}>
          { props.swapChildren && <p className='setting__row__description'>{props.description}</p> }
          { props.swapChildren ? props.bottomChildren : props.children }
        </div>
      </div>
      <div className='setting__row__bottom'>
        { !props.swapChildren && <p className='setting__row__description'>{props.description}</p> }
        { props.swapChildren ? props.children : props.bottomChildren }
      </div>
    </div>
  );
}
