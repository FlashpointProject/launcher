import { AppDispatch, RootState } from '@renderer/store/store';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';

export const useAppSelector = useSelector.withTypes<RootState>();
export type useAppSelectorType = typeof useAppSelector;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export type useAppDispatchType = typeof useAppDispatch;
