import { WithMainStateProps } from '@renderer/containers/withMainState';
import { MainActionType } from '@renderer/store/main/enums';
import { BackIn, ComponentState } from '@shared/back/types';
import { parseBrowsePageLayout, stringifyBrowsePageLayout } from '@shared/BrowsePageLayout';
import { getLibraryItemTitle } from '@shared/library/util';
import { updatePreferencesData } from '@shared/preferences/util';
import { formatString } from '@shared/utils/StringFormatter';
import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { WithPreferencesProps } from '../containers/withPreferences';
import { gameScaleSpan, getBrowseSubPath } from '../Util';
import { LangContext } from '../util/lang';

export type FooterProps = RouteComponentProps & WithPreferencesProps & WithMainStateProps;

/** The footer that is always visible at the bottom of the main window. */
export class Footer extends React.Component<FooterProps> {
  static contextType = LangContext;
  declare context: React.ContextType<typeof LangContext>;

  static scaleSliderMax = 1000;
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
    const scale = Math.min(Math.max(0, this.props.preferencesData.browsePageGameScale), 1);
    const libraryPath = getBrowseSubPath(this.props.location.pathname);
    const currentLabel = libraryPath && getLibraryItemTitle(libraryPath, this.props.main.lang.libraries);
    const view = this.props.main.views[libraryPath];
    const gamesTotal = (view && view.total != undefined) ? view.total : -1;
    const fpmAvailable = this.props.main.componentStatuses.length > 0;
    const updatesReady = this.props.main.componentStatuses.filter(c => c.state === ComponentState.NEEDS_UPDATE).length;

    return (
      <div className='footer'>
        {/* Left Side */}
        <div className='footer__wrap footer__left'>
          <div className='footer__left__inner'>
            {/* Update Panel */}
            { fpmAvailable && (
              <div
                onClick={() => {
                  this.props.setMainState({
                    quitting: true
                  });
                  window.Shared.back.send(BackIn.OPEN_FLASHPOINT_MANAGER);
                }}
                className={`${updatesReady > 0 ? 'footer__update-panel-updates-ready' : 'footer__update-panel-up-to-date'} footer__update-panel footer__wrap`}>
                {updatesReady ? formatString(this.context.home.componentUpdatesReady, updatesReady.toString()) : strings.openFlashpointManager }
              </div>
            )}
            {/* Game Count */}
            <div className='footer__game-count'>
              <p>{`${strings.total}: ${this.props.main.gamesTotal}`}</p>
              {currentLabel && strings.searchResults ? (
                <>
                  <p>|</p>
                  <p>{`${strings.searchResults}: ${gamesTotal > -1 ? gamesTotal : this.context.misc.searching}`}</p>
                </>
              ) : undefined}
            </div>
          </div>
        </div>
        {/* Right Side */}
        <div className='footer__wrap footer__right'>
          <div className='footer__right__inner'>
            {/* Layout Selector */}
            <div className='footer__wrap'>
              <div className='footer__layout-title'>{strings.layout}</div>
            </div>
            <div className='footer__wrap'>
              <div>
                <select
                  className='footer__layout-selector simple-selector'
                  value={stringifyBrowsePageLayout(this.props.preferencesData.browsePageLayout)}
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
    );
  }

  onNewGameClick = () => {
    // @TODO Replace this with a proper action (it should both change the location and state of the current or most recent view)
    this.props.dispatchMain({ type: MainActionType.CLICK_NEW_GAME });
  };

  onScaleSliderChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    updatePreferencesData({ browsePageGameScale: +event.currentTarget.value / Footer.scaleSliderMax });
  };

  onLayoutChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = parseBrowsePageLayout(event.target.value);
    if (value === undefined) { throw new Error(`Layout selector option has an invalid value (${event.target.value})`); }
    updatePreferencesData({ browsePageLayout: value });
  };

  onGlobalKeydown = (event: KeyboardEvent): void => {
    const scaleDif = 0.1; // How much the scale should change per increase/decrease
    // Increase Game Scale (CTRL PLUS)
    if (event.ctrlKey && event.key === '+') {
      const scale = this.props.preferencesData.browsePageGameScale;
      this.setScaleSliderValue(scale + scaleDif);
      event.preventDefault();
    }
    // Decrease Game Scale (CTRL MINUS)
    else if (event.ctrlKey && event.key === '-') {
      const scale = this.props.preferencesData.browsePageGameScale;
      this.setScaleSliderValue(scale - scaleDif);
      event.preventDefault();
    }
  };

  /**
   * Set the value of the scale slider.
   *
   * @param scale Value (between 0 and 1).
   */
  setScaleSliderValue(scale: number): void {
    if (this.scaleSliderRef.current) {
      const value = Math.min(Math.max(0, scale), 1) * Footer.scaleSliderMax;
      this.scaleSliderRef.current.value = value + '';
      updatePreferencesData({ browsePageGameScale: scale });
    }
  }
}
