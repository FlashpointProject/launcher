import * as React from 'react';
import { BrowsePageLayout, parseBrowsePageLayout, stringifyBrowsePageLayout } from '@shared/BrowsePageLayout';
import { LangContainer } from '@shared/lang';
import { formatString } from '@shared/utils/StringFormatter';
import { WithPreferencesProps } from '../containers/withPreferences';
import { gameScaleSpan } from '../Util';
import { LangContext } from '../util/lang';

type OwnProps = {
  /** Total number of games. */
  totalCount?: number;
  /** Label of the current browse library (if any). */
  currentLabel?: string;
  /** Number of games in the current browse library (if there is a current browse library). */
  currentCount?: number;
  /** Value of the scale slider (between 0 and 1). */
  scaleSliderValue: number;
  /** Called when the value of the scale slider is changed (value is between 0 and 1). */
  onScaleSliderChange?: (value: number) => void;
  /** Current BrowsePage layout. */
  layout: BrowsePageLayout;
  /** Called when the value of the layout selector is changed. */
  onLayoutChange?: (value: BrowsePageLayout) => void;
  /** Called when the "New Game" button is clicked. */
  onNewGameClick?: () => void;
};

export type FooterProps = OwnProps & WithPreferencesProps;

export interface Footer {
  context: LangContainer;
}

/** The footer that is always visible at the bottom of the main window. */
export class Footer extends React.Component<FooterProps> {
  static scaleSliderMax: number = 1000;
  /** Reference to the scale slider. */
  scaleSliderRef: React.RefObject<HTMLInputElement> = React.createRef();

  componentDidMount() {
    window.addEventListener('keydown', this.onGlobalKeydown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onGlobalKeydown);
  }

  render() {
    const strings = this.context.app;
    const { currentCount, currentLabel, layout, onNewGameClick, preferencesData, scaleSliderValue, totalCount } = this.props;
    const scale = Math.min(Math.max(0, scaleSliderValue), 1);
    return (
      <div className='footer'>
        {/* Left Side */}
        <div className='footer__wrap'>
          {/* Game Count */}
          <div className='footer__game-count'>
            <p>{`${strings.total}: ${totalCount}`}</p>
            { currentLabel && strings.searchResults ? (
              <>
                <p>|</p>
                <p>{`${strings.searchResults}: ${currentCount}`}</p>
              </>
            ) : undefined }
          </div>
        </div>
        {/* Right Side */}
        <div className='footer__wrap footer__right'>
          <div>
            <div className='footer__right__inner'>
              {/* New Game */}
              { preferencesData.enableEditing ? (
                <div className='footer__wrap'>
                  <div className='simple-center'>
                    <input
                      type='button'
                      value={strings.newGame}
                      onClick={onNewGameClick}
                      className='footer__new-game simple-button simple-center__vertical-inner' />
                  </div>
                </div>
              ) : undefined }
              {/* Layout Selector */}
              <div className='footer__wrap'>
                <div>
                  <select
                    className='footer__layout-selector simple-selector'
                    value={stringifyBrowsePageLayout(layout)}
                    onChange={this.onLayoutChange}>
                    <option value='list'>{strings.list}</option>
                    <option value='grid'>{strings.grid}</option>
                  </select>
                </div>
              </div>
              {/* Scale Slider */}
              <div className='footer__wrap footer__scale-slider'>
                <div className='footer__scale-slider__inner'>
                  <div className='footer__scale-slider__icon footer__scale-slider__icon--left simple-center'>
                    <div>-</div>
                  </div>
                  <div className='footer__scale-slider__icon footer__scale-slider__icon--center simple-center' />
                  <div className='footer__scale-slider__icon footer__scale-slider__icon--right simple-center'>
                    <div>+</div>
                  </div>
                  <input
                    type='range'
                    className='footer__scale-slider__input hidden-slider'
                    value={scale * Footer.scaleSliderMax}
                    min={0}
                    max={Footer.scaleSliderMax}
                    ref={this.scaleSliderRef}
                    onChange={this.onScaleSliderChange} />
                </div>
              </div>
              {/* Slider Percent */}
              <div className='footer__wrap footer__scale-percent'>
                <p>{Math.round(100 + (scale - 0.5) * 200 * gameScaleSpan)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  onScaleSliderChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.scaleSliderChange(event.target);
  }

  onLayoutChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    if (this.props.onLayoutChange) {
      const value = parseBrowsePageLayout(event.target.value);
      if (value === undefined) { throw new Error(`Layout selector option has an invalid value (${event.target.value})`); }
      this.props.onLayoutChange(value);
    }
  }

  onGlobalKeydown = (event: KeyboardEvent): void => {
    const scaleDif = 0.1; // How much the scale should change per increase/decrease
    // Increase Game Scale (CTRL PLUS)
    if (event.ctrlKey && event.key === '+') {
      const scale = this.props.preferencesData.browsePageGameScale;
      this.setScaleSliderValue(scale + scaleDif);
      event.preventDefault();
    }
    // Decrease Game Scale (CTRL MINUS)
    if (event.ctrlKey && event.key === '-') {
      const scale = this.props.preferencesData.browsePageGameScale;
      this.setScaleSliderValue(scale - scaleDif);
      event.preventDefault();
    }
  }

  /**
   * Call this after the scale slider element has changed value.
   * @param element Scale slider element.
   */
  scaleSliderChange(element: HTMLInputElement): void {
    if (this.props.onScaleSliderChange) {
      this.props.onScaleSliderChange(element.valueAsNumber / Footer.scaleSliderMax);
    }
  }

  /**
   * Set the value of the scale slider.
   * @param scale Value (between 0 and 1).
   */
  setScaleSliderValue(scale: number): void {
    if (this.scaleSliderRef.current) {
      const value = Math.min(Math.max(0, scale), 1) * Footer.scaleSliderMax;
      this.scaleSliderRef.current.value = value+'';
      this.scaleSliderChange(this.scaleSliderRef.current);
    }
  }

  static contextType = LangContext;
}
