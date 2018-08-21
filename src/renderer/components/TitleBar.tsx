import * as React from 'react';
import { IDefaultProps } from '../interfaces';

export interface ITitleBarProps extends IDefaultProps {
  title?: string;
}

export class TitleBar extends React.Component<ITitleBarProps> {
  constructor(props: ITitleBarProps) {
    super(props);
    this.onMinimizeClick = this.onMinimizeClick.bind(this);
    this.onMaximizeClick = this.onMaximizeClick.bind(this);
    this.onCrossClick = this.onCrossClick.bind(this);
  }

  render() {
    return (
      <div className="title-bar">
        <p className="title-bar__title">{this.props.title || ''}</p>
        <div className="title-bar__button-bar">
          <div className="title-bar__button-bar__min" onClick={this.onMinimizeClick} />
          <div className="title-bar__button-bar__max" onClick={this.onMaximizeClick} />
          <div className="title-bar__button-bar__cross" onClick={this.onCrossClick} />
        </div>
      </div>
    );
  }

  /** When the minimize button is pressed (_) */
  onMinimizeClick(e: React.MouseEvent) {
    window.External.minimize();
  }

  /** When the maximize button is pressed ([]) */
  onMaximizeClick(e: React.MouseEvent) {
    window.External.maximize();
  }

  /** When the cross button is pressed (X) */
  onCrossClick(e: React.MouseEvent) {
    window.External.close();
  }
}
