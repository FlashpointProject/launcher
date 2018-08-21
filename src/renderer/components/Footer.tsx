import * as React from 'react';
import { IDefaultProps } from '../interfaces';

export interface IFooterProps extends IDefaultProps {
  gameCount?: number;
}

export const Footer: React.StatelessComponent<IFooterProps> = (props: IFooterProps) => {
  return (
    <div className="footer">
      {(props.gameCount !== undefined) ? (
        <>Games Total: {props.gameCount}</>
      ) : (
        <>No Games Found!</>
      )}
    </div>
  );
};
