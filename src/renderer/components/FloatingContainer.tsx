import * as React from 'react';

type FloatingContainerProps = {
  floatingClassName?: string
  children: React.JSX.Element | React.JSX.Element[];
  onClick?: () => void;
} & React.HTMLProps<HTMLDivElement>;

export function FloatingContainer(props: FloatingContainerProps) {
  return (
    <div className='floating-container__wrapper'
      { ...props }
      onClick={props.onClick}>
      <div className={`floating-container ${props.floatingClassName}`}>
        {props.children}
      </div>
    </div>
  );
}
