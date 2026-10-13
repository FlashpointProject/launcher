import { Paths } from '@shared/Paths';
import { CustomRoute, StateWrapperProps } from 'flashpoint-launcher-renderer';
import { Activity, ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DynamicComponent } from './DynamicComponent';
import { CuratePage } from './pages/CuratePage';
import { FpfssPage } from './pages/FpfssPage';
import { HomePage } from './pages/HomePage';
import { IFramePage } from './pages/IFramePage';
import { LogsPage } from './pages/LogsPage';
import { TagsPage } from './pages/TagsPage';

export type ActivityRoutesProps = {
  manualUrl: string;
  customRoutes: CustomRoute[];
}

export function ActivityRoutes({ manualUrl, customRoutes }: ActivityRoutesProps) {
  return (
    <>
      <ActivityRoute path={Paths.HOME} exact>
        <HomePage/>
      </ActivityRoute>
      <ActivityRoute path={Paths.TAGS}>
        <TagsPage/>
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
      <ActivityRoute path={Paths.FPFSS}>
        <FpfssPage/>
      </ActivityRoute>
      { customRoutes.filter(r => r.keepLoaded).map(route =>
        <ActivityRoute key={route.path} path={route.path}>
          <DynamicComponent name={route.component} props={{}}/>
        </ActivityRoute>
      )}
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
    <StateWrapper show={showChildren}>
      {children}
    </StateWrapper>
  );
}

export function StateWrapper({ show, children }: StateWrapperProps) {
  const [shownOnce, setShownOnce] = useState(false);

  if (!shownOnce && !show) {
    return <></>;
  }

  if (!shownOnce && show) {
    setShownOnce(true);
  }

  return (
    <Activity mode={show ? 'visible' : 'hidden'}>
      {children}
    </Activity>
  );
}
