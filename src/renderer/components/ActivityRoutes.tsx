import { Paths } from '@shared/Paths';
import { Activity, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoadingPage } from './pages/LoadingPage';
import { TagsPage } from './pages/TagsPage';
import { TagCategoriesPage } from './pages/TagCategoriesPage';
import { DownloadsPage } from './pages/Downloads';
import { LogsPage } from './pages/LogsPage';
import { CuratePage } from './pages/CuratePage';
import { IFramePage } from './pages/IFramePage';
import { AboutPage } from './pages/AboutPage';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { ConfigPage } from './pages/ConfigPage';

export type ActivityRoutesProps = {
  onGameContextMenu: (event: React.MouseEvent, gameId: string, logoPath: string, screenshotPath: string) => void;
  manualUrl: string;
}

export function ActivityRoutes({ onGameContextMenu, manualUrl }: ActivityRoutesProps) {
  const fpfssBaseUrl = useAppSelector(state => state.preferences.fpfssBaseUrl);

  return (
    <>
      <ActivityRoute path={Paths.LOADING}>
        <LoadingPage/>
      </ActivityRoute>
      <ActivityRoute path={Paths.HOME} exact>
        <HomePage onGameContextMenu={onGameContextMenu}/>
      </ActivityRoute>
      <ActivityRoute path={Paths.TAGS}>
        <TagsPage/>
      </ActivityRoute>
      <ActivityRoute path={Paths.CATEGORIES}>
        <TagCategoriesPage/>
      </ActivityRoute>
      <ActivityRoute path={Paths.DOWNLOADS}>
        <DownloadsPage/>
      </ActivityRoute>
      <ActivityRoute path={Paths.LOGS}>
        <LogsPage/>
      </ActivityRoute>
      <ActivityRoute path={Paths.MANUAL}>
        <IFramePage url={manualUrl}/>
      </ActivityRoute>
      <ActivityRoute path={Paths.CURATE}>
        <CuratePage/>
      </ActivityRoute>
      <ActivityRoute path={Paths.CONFIG}>
        <ConfigPage/>
      </ActivityRoute>
      <ActivityRoute path={Paths.ABOUT}>
        <AboutPage/>
      </ActivityRoute>
      <ActivityRoute path={Paths.FPFSS}>
        <IFramePage url={fpfssBaseUrl}/>
      </ActivityRoute>
    </>
  );
}

type ActivityRouteProps = {
  children: ReactNode,
  path: string,
  exact?: boolean;
}

function ActivityRoute({ path, children, exact }: ActivityRouteProps) {
  const { pathname } = useLocation();
  const showChildren = exact ?
    pathname === path :
    pathname.startsWith(path);

  return (
    <Activity mode={showChildren ? 'visible' : 'hidden'}>
      {children}
    </Activity>
  );
}
