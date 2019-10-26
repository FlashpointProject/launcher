import { createAction } from 'typesafe-actions';
import { GameLibraryFile } from '../../../shared/library/types';
import { LibraryActionTypes } from './types';

export const updateLibrary = createAction(LibraryActionTypes.UPDATE_LIBRARY, resolve => {
  return (data: Partial<GameLibraryFile>) => resolve(data);
});
