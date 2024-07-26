import { useLocation } from 'react-router-dom';
import { getViewName } from '@renderer/Util';
import { useAppSelector } from '@renderer/hooks/useAppSelector';

export function useView() {
  const location = useLocation();
  const viewName = getViewName(location.pathname);
  const search = useAppSelector((state) => state.search);
  return search.views[viewName];
}
