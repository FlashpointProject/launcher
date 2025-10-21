import { Paths } from '@shared/Paths';
import { Activity, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AboutPage } from './pages/AboutPage';
import { ConfigPage } from './pages/ConfigPage';
import { CuratePage } from './pages/CuratePage';
import { DownloadsPage } from './pages/Downloads';
import { HomePage } from './pages/HomePage';
import { IFramePage } from './pages/IFramePage';
import { LoadingPage } from './pages/LoadingPage';
import { LogsPage } from './pages/LogsPage';
import { TagCategoriesPage } from './pages/TagCategoriesPage';
import { TagsPage } from './pages/TagsPage';

export type ActivityRoutesProps = {
  onGameContextMenu: (event: React.MouseEvent, gameId: string, logoPath: string, screenshotPath: string) => void;
  manualUrl: string;
}

export function ActivityRoutes({ onGameContextMenu, manualUrl }: ActivityRoutesProps) {
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
