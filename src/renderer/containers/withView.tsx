import { ResultsView } from '@renderer/store/search/slice';
import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { getViewName } from '@renderer/Util';
import { useAppSelector } from '@renderer/hooks/useAppSelector';

export type WithViewProps = {
  currentView: ResultsView;
  currentViewName: string;
};

export function withView<Props extends WithViewProps>(Component: React.ComponentType<Props>) {
  return function WrappedComponent(props: Omit<Props, keyof WithViewProps>) {
    const location = useLocation();
    const viewName = getViewName(location.pathname);
    const search = useAppSelector((state) => state.search);
    const view = search.views[viewName];
    return <Component
      {...(props as Props)}
      currentView={view}
      currentViewName={viewName}
    />;
  };
}
