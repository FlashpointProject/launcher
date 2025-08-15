import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { getViewName } from '@renderer/Util';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { NotFoundPage } from '@renderer/components/pages/NotFoundPage';
import { Content, ResultsView } from 'flashpoint-launcher';

export type WithViewProps<T extends Content> = {
  currentView: ResultsView<T>;
  currentViewName: string;
};

export function withView<T extends Content, Props extends WithViewProps<T>>(Component: React.ComponentType<Props>) {
  return function WrappedComponent(props: Omit<Props, keyof WithViewProps<T>>) {
    const location = useLocation();
    const viewName = getViewName(location.pathname);
    const search = useAppSelector((state) => state.search);
    const view = search.views[viewName];
    if (view) {
      return <Component
        {...(props as Props)}
        currentView={view}
        currentViewName={viewName}
      />;
    } else {
      return <NotFoundPage />;
    }
  };
}
