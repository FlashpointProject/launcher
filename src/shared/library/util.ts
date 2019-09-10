import GameManagerPlatform from '../../renderer/game/GameManagerPlatform';
import { IGameLibraryFileItem } from './interfaces';
import { LibrariesLang } from '../lang/types';

/** Find the first library flagged as default (undefined if none was found) */
export function findDefaultLibrary(libraries: IGameLibraryFileItem[]): IGameLibraryFileItem|undefined {
  return libraries.find(library => !!library.default);
}

/** Find the first library with a given route (undefined if none was found) */
export function findLibraryByRoute(libraries: IGameLibraryFileItem[], route: string): IGameLibraryFileItem|undefined {
  return libraries.find(library => library.route === route);
}

/**
 * Find the first library that matches the name of a given platform.
 * @param libraries All libraries that are possible matches
 * @param platformName Name (or filename) of the platform file
 */
export function findLibraryByPlatformName(libraries: IGameLibraryFileItem[], platformName: string): IGameLibraryFileItem|undefined {
  return libraries.find(library => !!library.prefix && platformName.startsWith(library.prefix));
}

export function getLibraryPlatforms(libraries: IGameLibraryFileItem[], platforms: GameManagerPlatform[], targetLibrary: IGameLibraryFileItem): GameManagerPlatform[] {
  if (targetLibrary.default) {
    // Find all platforms "used" by other libraries
    const usedPlatforms: GameManagerPlatform[] = [];
    libraries.forEach(library => {
      if (library.prefix && library !== targetLibrary) {
        const prefix = library.prefix;
        platforms.forEach(platform => {
          if (platform.filename.startsWith(prefix)) { usedPlatforms.push(platform); }
        });
      }
    });
    // Get all games from all platforms that are not "used" by other libraries
    return platforms.filter(platform => usedPlatforms.indexOf(platform) === -1);
  } else if (targetLibrary.prefix) {
    const prefix = targetLibrary.prefix;
    return platforms.filter(platform => platform.filename.startsWith(prefix));
  } else { return []; }
}

/**
 * Get the title of a library item from a language sub-container (or return the item's route if none was found).
 * @param item Item to get title of.
 * @param lang Language sub-container to look for title in.
 */
export function getLibraryItemTitle(item: IGameLibraryFileItem, lang?: LibrariesLang): string {
  return lang && lang[item.route] || item.route;
}
