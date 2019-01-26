import { IGameLibraryFileItem } from './interfaces';

/** Find the first library flagged as default (undefined if none was found) */
export function findDefaultLibrary(libraries: IGameLibraryFileItem[]): IGameLibraryFileItem|undefined {
  return libraries.find(library => !!library.default);
}
