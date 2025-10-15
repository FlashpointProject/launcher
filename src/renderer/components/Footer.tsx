import { useView } from '@renderer/hooks/search';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { setMainState } from '@renderer/store/main/slice';
import { updatePreferences } from '@renderer/store/preferences/slice';
import { GENERAL_VIEW_ID } from '@renderer/store/search/slice';
import { BackIn, ComponentState } from '@shared/back/types';
import { parseBrowsePageLayout, stringifyBrowsePageLayout } from '@shared/BrowsePageLayout';
import { getLibraryItemTitle } from '@shared/library/util';
import { formatString } from '@shared/utils/StringFormatter';
import * as React from 'react';
import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { getViewName } from '../Util';
import { LangContext } from '../util/lang';
import { FooterScaler } from './FooterScaler';
import { ScaleValues } from 'flashpoint-launcher';

export function Footer() {
  const strings = useContext(LangContext);
  const dispatch = useAppDispatch();
  const { allGamesTotal, componentStatuses } = useAppSelector(state => ({
    allGamesTotal: state.main.gamesTotal,
    componentStatuses: state.main.componentStatuses
  }));
  const location = useLocation();
  const libraryPath = getViewName(location.pathname);
  const scaleKey = getScaleKey(location.pathname);
  const browsePageLayout = useAppSelector((state) => state.preferences.browsePageLayout);
  const view = useView();

  const currentLabel = libraryPath && getLibraryItemTitle(libraryPath, strings.libraries);
  const fpmAvailable = componentStatuses.length > 0;
  const updatesReady = componentStatuses.filter(c => c.state === ComponentState.NEEDS_UPDATE).length;
  const gamesTotal = (view && view.data.total != undefined) ? view.data.total : -1;

  const onLayoutChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseBrowsePageLayout(event.target.value);
    if (value === undefined) { throw new Error(`Layout selector option has an invalid value (${event.target.value})`); }
    dispatch(updatePreferences({ browsePageLayout: value }));
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
          <FooterScaler scaleKey={scaleKey}/>
        </div>
      </div>
    </div>
  );
}

function getScaleKey(pathname: string): keyof ScaleValues {
  if (pathname.startsWith('/logs')) {
    return 'logs';
  }
  return 'browse';
}
