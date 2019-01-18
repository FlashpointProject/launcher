import { IGameLibraryFile } from '../../../shared/library/interfaces';

export const enum LibraryActionTypes {
  UPDATE_LIBRARY = '@@library/UPDATE_LIBRARY',
}

export interface ILibraryState {
  readonly data: IGameLibraryFile;
}
