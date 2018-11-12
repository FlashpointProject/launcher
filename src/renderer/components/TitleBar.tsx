import * as React from 'react';
import { IDefaultProps } from '../interfaces';

export interface ITitleBarProps extends IDefaultProps {
  title?: string;
}

export class TitleBar extends React.Component<ITitleBarProps> {
  constructor(props: ITitleBarProps) {
    super(props);
  }

  render() {
    return (
      <div className="title-bar">
        <p className="title-bar__title">{this.props.title || ''}</p>
        <div className="title-bar__button-bar">
          <div className="title-bar__button-bar__min" onClick={window.External.minimize} />
          <div className="title-bar__button-bar__max" onClick={window.External.maximize} />
          <div className="title-bar__button-bar__cross" onClick={window.External.close} />
        </div>
      </div>
    );
  }
}
