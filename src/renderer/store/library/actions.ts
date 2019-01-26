import { createAction } from 'typesafe-actions';
import { IGameLibraryFile } from '../../../shared/library/interfaces';
import { LibraryActionTypes } from './types';

export const updateLibrary = createAction(LibraryActionTypes.UPDATE_LIBRARY, resolve => {
  return (data: Partial<IGameLibraryFile>) => resolve(data);
});
