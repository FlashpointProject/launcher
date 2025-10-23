import { useViewName } from '@renderer/hooks/search';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { setMainState } from '@renderer/store/main/slice';
import { updatePreferences } from '@renderer/store/preferences/slice';
import { GENERAL_VIEW_ID } from '@renderer/store/search/slice';
import { BackIn, ComponentState } from '@shared/back/types';
import { parseBrowsePageLayout, stringifyBrowsePageLayout } from '@shared/BrowsePageLayout';
import { getLibraryItemTitle } from '@shared/library/util';
import { formatString } from '@shared/utils/StringFormatter';
import { ScaleValues } from 'flashpoint-launcher';
import * as React from 'react';
import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { getViewName } from '../Util';
import { LangContext } from '../util/lang';
import { FooterScaler } from './FooterScaler';

export function Footer() {
  const strings = useContext(LangContext);
  const dispatch = useAppDispatch();
  const allGamesTotal = useAppSelector(state => state.main.gamesTotal);
  const componentStatuses = useAppSelector(state => state.main.componentStatuses);
  const location = useLocation();
  const libraryPath = getViewName(location.pathname);
  const scaleKey = getScaleKey(location.pathname);
  const browsePageLayout = useAppSelector((state) => state.preferences.browsePageLayout);
  const viewName = useViewName();
  const gamesTotal = useAppSelector(state => {
    if (viewName in state.search.views && state.search.views[viewName].data.total !== undefined) {
      return state.search.views[viewName].data.total;
    }
    return -1;
  });

  const currentLabel = libraryPath && getLibraryItemTitle(libraryPath, strings.libraries);
  const fpmAvailable = componentStatuses.length > 0;
  const updatesReady = componentStatuses.filter(c => c.state === ComponentState.NEEDS_UPDATE).length;

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
            {currentLabel && viewName !== GENERAL_VIEW_ID && !viewName.startsWith('!fpfss-') && strings.app.searchResults ? (
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
