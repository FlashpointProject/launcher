import { IGameLibraryFileItem } from './interfaces';
import { IGameInfo } from '../game/interfaces';
import GameManagerPlatform from 'src/renderer/game/GameManagerPlatform';

/** Find the first library flagged as default (undefined if none was found) */
export function findDefaultLibrary(libraries: IGameLibraryFileItem[]): IGameLibraryFileItem|undefined {
  return libraries.find(library => !!library.default);
}

/** Find the first library with a given route (undefined if none was found) */
export function findLibraryByRoute(libraries: IGameLibraryFileItem[], route: string): IGameLibraryFileItem|undefined {
  return libraries.find(library => library.route === route);
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
