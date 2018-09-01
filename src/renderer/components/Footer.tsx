import * as React from 'react';
import { IDefaultProps } from '../interfaces';

export interface IFooterProps extends IDefaultProps {
  gameCount?: number;
  /** Value of the scale slider (between 0 - 1) (Unchanged if undefined)*/
  scaleSliderValue?: number;
  /** When the value of the scale slider is changed (value is between 0 and 1) */
  onScaleSliderChange?: (value: number) => void;
}

export class Footer extends React.Component<IFooterProps, {}> {
  private static scaleSliderMax: number = 100;

  constructor(props: IFooterProps) {
    super(props);
    this.onScaleSliderChange = this.onScaleSliderChange.bind(this);
  }

  render() {
    let scale: number|undefined = this.props.scaleSliderValue;
    if (scale !== undefined) {
      scale = Math.min(Math.max(0, scale), 1) * Footer.scaleSliderMax;
    }
    return (
      <div className="footer">
        <div className="footer__game-count">
          {(this.props.gameCount !== undefined) ? (
            <>Games Total: {this.props.gameCount}</>
          ) : (
            <>No Games Found!</>
          )}
        </div>
        <div className="footer__scale-slider">
          <input type="range" min="0" max={Footer.scaleSliderMax} value={scale} onChange={this.onScaleSliderChange}/>
        </div>
      </div>
    );
  }
  
  onScaleSliderChange(event: React.ChangeEvent<HTMLInputElement>): void {
    if (this.props.onScaleSliderChange) {
      this.props.onScaleSliderChange(event.target.valueAsNumber / Footer.scaleSliderMax);
    }
  }
}
