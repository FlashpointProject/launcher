import { createAction } from 'typesafe-actions';
import { LibraryActionTypes } from './types';
import { IGameLibraryFile } from '../../../shared/library/interfaces';

export const updateLibrary = createAction(LibraryActionTypes.UPDATE_LIBRARY, resolve => {
  return (data: Partial<IGameLibraryFile>) => resolve(data);
});
