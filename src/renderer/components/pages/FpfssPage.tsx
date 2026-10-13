import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { getLastValidPage } from '@renderer/store/history/slice';
import { getPlatformIconURL, getViewNameFpfss } from '@renderer/Util';
import { Paths } from '@shared/Paths';
import { isGame } from '@shared/utils/misc';
import { Content } from 'flashpoint-launcher';
import { LeftSidebarItem } from 'flashpoint-launcher-renderer';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LeftSidebar } from '../LeftSidebar';
import { RightBrowseSidebarFpfss } from '../RightBrowseSidebar';

type FpfssViewInfo = {
  viewName: string;
  title?: string;
  platform?: string;
}

export function FpfssPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const strings = useLocalization();
  const dispatch = useAppDispatch();
  const logoVersion = useAppSelector(state => state.main.logoVersion);
  const allViews = useAppSelector(state => state.search.views);
  const names = Object.keys(allViews).filter(v => v.startsWith('!fpfss-'));
  const selectablePages = names.map<FpfssViewInfo>(name => {
    const game: Content = allViews[name].editingGame;
    return {
      viewName: name,
      title: game.title,
      platform: isGame(game) ? game.primaryPlatform : undefined
    };
  });
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  // If we're opened via a pathname set that view to current
  useEffect(() => {
    const viewName = getViewNameFpfss(location.pathname);
    if (viewName !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPage(viewName);
    }
  }, [location.pathname]);

  const getViewName = () => {
    const pageExists = selectedPage !== null && selectablePages.findIndex(view => view.viewName === selectedPage) !== -1;
    if (pageExists) {
      return selectedPage;
    } else if (selectablePages.length > 0) {
      return selectablePages[0].viewName;
    }
  };
  const viewName = getViewName();
  const view = useAppSelector(state => viewName ? state.search.views[viewName] : undefined);

  const sidebarItems = selectablePages.map<LeftSidebarItem>((page) => {
    return {
      key: page.viewName,
      title: page.title || strings.browse.noTitle,
      icon: page.platform ? (
        <div
          className='curate-list-item__icon'
          style={{ backgroundImage: `url('${getPlatformIconURL(page.platform, logoVersion)}')` }} />
      ) : undefined
    };
  });

  const selectNextView = async (lastValidPage?: Location) => {
    const availableViews = selectablePages.filter(p => p.viewName !== viewName);
    if (availableViews.length > 0) {
      setSelectedPage(availableViews[0].viewName);
    } else {
      // Navigate back to last valid page if
      return new Promise<void>((resolve) => {
        dispatch(getLastValidPage()).unwrap()
        .then((validLoc) => {
          if (validLoc !== undefined) {
            navigate(validLoc.pathname);
          } else {
            navigate(Paths.HOME);
          }
          setTimeout(() => resolve(), 200); // Give time to navigate away before current view clears
        });
      });
    }
  };

  if (view) {
    return <div className='fpfss-page'>
      <div className='fpfss-page-left-sidebar-wrapper'>
        <LeftSidebar
          key={'fpfss-page'}
          header={'Open Edits'}
          selected={view.id}
          onSelect={(key) => setSelectedPage(key)}
          items={sidebarItems}
          rowHeight={20}/>
      </div>
      <RightBrowseSidebarFpfss
        view={view}
        onSave={selectNextView}
        onDiscard={selectNextView}/>
    </div>;
  } else {
    return <div>
      No FPFSS edits open yet
    </div>;
  }
}
