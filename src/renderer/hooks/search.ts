import { useLocation } from 'react-router-dom';
import { getViewName } from '@renderer/Util';
import { useAppSelector } from '@renderer/hooks/useAppSelector';

export function useView() {
  const location = useLocation();
  const viewName = getViewName(location.pathname);
  return useAppSelector((state) => state.search.views[viewName]);
}

export function useViewName() {
  const location = useLocation();
  return getViewName(location.pathname);
}
