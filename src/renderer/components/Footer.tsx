import { useView } from '@renderer/hooks/search';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { usePreferences } from '@renderer/hooks/usePreferences';
import { setMainState } from '@renderer/store/main/slice';
import { GENERAL_VIEW_ID } from '@renderer/store/search/slice';
import { BackIn, ComponentState } from '@shared/back/types';
import { parseBrowsePageLayout, stringifyBrowsePageLayout } from '@shared/BrowsePageLayout';
import { getLibraryItemTitle } from '@shared/library/util';
import { updatePreferencesData } from '@shared/preferences/util';
import { formatString } from '@shared/utils/StringFormatter';
import * as React from 'react';
import { useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gameScaleSpan, getViewName } from '../Util';
import { LangContext } from '../util/lang';

const scaleSliderMax = 1000;

export function Footer() {
  const scaleSliderRef = useRef<HTMLInputElement | null>(null);
  const strings = useContext(LangContext);
  const dispatch = useAppDispatch();
  const { allGamesTotal, componentStatuses } = useAppSelector(state => ({
    allGamesTotal: state.main.gamesTotal,
    componentStatuses: state.main.componentStatuses
  }));
  const location = useLocation();
  const libraryPath = getViewName(location.pathname);
  const { browsePageLayout, browsePageGameScale } = usePreferences();
  const view = useView();

  const currentLabel = libraryPath && getLibraryItemTitle(libraryPath, strings.libraries);
  const fpmAvailable = componentStatuses.length > 0;
  const updatesReady = componentStatuses.filter(c => c.state === ComponentState.NEEDS_UPDATE).length;
  const gamesTotal = (view && view.data.total != undefined) ? view.data.total : -1;
  const scale = Math.min(Math.max(0, browsePageGameScale), 1);

  const onScaleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updatePreferencesData({ browsePageGameScale: +event.currentTarget.value / scaleSliderMax });
  };

  const setScaleSliderValue = (scale: number) => {
    if (scaleSliderRef.current) {
      if (scale < 0) { scale = 0; }
      else if (scale > 1) { scale = 1; }
      scaleSliderRef.current.value = (Math.min(Math.max(0, scale), 1) * scaleSliderMax).toFixed(1).toString();
      updatePreferencesData({ browsePageGameScale: scale });
    }
  };

  // Allow ctrl + and ctrl - to change scale
  React.useEffect(() => {
    const onGlobalKeydown = (event: KeyboardEvent) => {
      const scaleDif = 0.1; // How much the scale should change per increase/decrease
      // Increase Game Scale (CTRL PLUS)
      if (event.ctrlKey && (event.keyCode === 187 || event.keyCode === 61 || event.keyCode === 171)) {
        const scale = browsePageGameScale;
        setScaleSliderValue(scale + scaleDif);
        event.preventDefault();
      }
      // Decrease Game Scale (CTRL MINUS)
      else if (event.ctrlKey && (event.keyCode === 189 || event.keyCode === 173)) {
        const scale = browsePageGameScale;
        setScaleSliderValue(scale - scaleDif);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onGlobalKeydown);

    return () => {
      window.removeEventListener('keydown', onGlobalKeydown);
    };
  });

  const onLayoutChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseBrowsePageLayout(event.target.value);
    if (value === undefined) { throw new Error(`Layout selector option has an invalid value (${event.target.value})`); }
    updatePreferencesData({ browsePageLayout: value });
  };

  return (
    <div className='footer'>
      {/* Left Side */}
      <div className='footer__wrap footer__left'>
        <div className='footer__left__inner'>
          {/* Update Panel */}
          { fpmAvailable && (
            <div
              onClick={() => {
                dispatch(setMainState({
                  quitting: true
                }));
                window.Shared.back.send(BackIn.OPEN_FLASHPOINT_MANAGER);
              }}
              className={`${updatesReady > 0 ? 'footer__update-panel-updates-ready' : 'footer__update-panel-up-to-date'} footer__update-panel footer__wrap`}>
              {updatesReady ? formatString(strings.home.componentUpdatesReady, updatesReady.toString()) : strings.app.openFlashpointManager }
            </div>
          )}
          {/* Game Count */}
          <div className='footer__game-count'>
            <p>{`${strings.app.total}: ${allGamesTotal}`}</p>
            {currentLabel && view.id !== GENERAL_VIEW_ID && strings.app.searchResults ? (
              <>
                <p>|</p>
                <p>{`${strings.app.searchResults}: ${gamesTotal > -1 ? gamesTotal : strings.misc.searching}`}</p>
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
            <div className='footer__layout-title'>{strings.app.layout}</div>
          </div>
          <div className='footer__wrap'>
            <div>
              <select
                className='footer__layout-selector simple-selector'
                value={stringifyBrowsePageLayout(browsePageLayout)}
                onChange={onLayoutChange}>
                <option value='list'>{strings.app.list}</option>
                <option value='grid'>{strings.app.grid}</option>
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
                value={scale * scaleSliderMax}
                min={0}
                max={scaleSliderMax}
                ref={scaleSliderRef}
                onChange={onScaleSliderChange} />
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
