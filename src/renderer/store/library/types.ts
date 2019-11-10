import { GameLibraryFile } from '../../../shared/library/types';

export const enum LibraryActionTypes {
  UPDATE_LIBRARY = '@@library/UPDATE_LIBRARY',
}

export interface ILibraryState {
  readonly data: GameLibraryFile;
}
