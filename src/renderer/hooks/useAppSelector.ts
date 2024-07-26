import { RootState } from '@renderer/store/store';
import { useSelector } from 'react-redux';

export function useAppSelector<T>(func: (state: RootState) => T) {
  return useSelector((state: RootState) => func(state));
}
