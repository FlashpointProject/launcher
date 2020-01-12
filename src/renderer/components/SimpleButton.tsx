import * as React from 'react';
import { Omit } from '@shared/interfaces';

/** Props for an input element. */
type InputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export type SimpleButtonProps = Omit<InputProps, 'type'>;

/** A normal button, but with the "simple-button" css class added. */
export function SimpleButton(props: SimpleButtonProps) {
  const { className, ...rest } = props;
  return (
    <input
      type='button'
      className={'simple-button' + (className ? ' '+className : '')}
      { ...rest } />
  );
}
