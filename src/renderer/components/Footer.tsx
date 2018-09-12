import * as React from 'react';
import { IDefaultProps } from '../interfaces';
import { BrowsePageLayout, parseBrowsePageLayout, stringifyBrowsePageLayout } from '../../shared/BrowsePageLayout';

export interface IFooterProps extends IDefaultProps {
  gameCount?: number;
  /** Value of the scale slider (between 0 - 1) */
  scaleSliderValue: number;
  /** When the value of the scale slider is changed (value is between 0 and 1) */
  onScaleSliderChange?: (value: number) => void;
  /** BrowsePage layout */
  layout: BrowsePageLayout;
  /** When the value of the layout selector is changed */
  onLayoutChange?: (value: BrowsePageLayout) => void;
}

export class Footer extends React.Component<IFooterProps, {}> {
  private static scaleSliderMax: number = 100;

  constructor(props: IFooterProps) {
    super(props);
    this.onScaleSliderChange = this.onScaleSliderChange.bind(this);
    this.onLayoutChange = this.onLayoutChange.bind(this);
  }

  render() {
    let scale: number = Math.min(Math.max(0, this.props.scaleSliderValue), 1) * Footer.scaleSliderMax;
    return (
      <div className="footer">
        <div className="footer__game-count">
          {(this.props.gameCount !== undefined) ? (
            <>Games Total: {this.props.gameCount}</>
          ) : (
            <>No Games Found!</>
          )}
        </div>
        <div className="footer__right">
          <select className="footer__layout-selector simple-selector" value={stringifyBrowsePageLayout(this.props.layout)} onChange={this.onLayoutChange}>
            <option value='list'>List</option>
            <option value='grid'>Grid</option>
          </select>
          <div className="footer__scale-slider">
            <input className="footer__scale-slider__inner simple-slider" type="range" onChange={this.onScaleSliderChange}
                   min="0" max={Footer.scaleSliderMax} value={scale}/>
          </div>
        </div>
      </div>
    );
  }
  
  onScaleSliderChange(event: React.ChangeEvent<HTMLInputElement>): void {
    if (this.props.onScaleSliderChange) {
      this.props.onScaleSliderChange(event.target.valueAsNumber / Footer.scaleSliderMax);
    }
  }
  
  onLayoutChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    if (this.props.onLayoutChange) {
      const value = parseBrowsePageLayout(event.target.value);
      if (value === undefined) { throw new Error(`Layout selector option has an invalid value (${event.target.value})`); }
      this.props.onLayoutChange(value);
    }
  }
}
