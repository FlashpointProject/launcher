import * as React from 'react';
import { Omit } from '../../shared/interfaces';

type a = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
export type SimpleButtonProps = Omit<a, 'type'>;

export class SimpleButton extends React.PureComponent<SimpleButtonProps> {
  render() {
    const { className, ...rest } = this.props;
    return (
      <input type='button'
             className={'simple-button' + (className ? ' '+className : '') }
             { ...rest } />
    );
  }
}
