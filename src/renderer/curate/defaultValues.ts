import { IGameInfo } from '../../shared/game/interfaces';

/** Generic associative array with strings as keys and values. */
type StringMap = {
  [key: string]: string;
};

/** Container used when counting applications paths per platform. */
type Count = {
  [platform: string]: {
    [applicationPath: string]: number;
  };
};

/** Container of all default values for curation game meta. */
export type GameMetaDefaults = {
  /** Default application paths (ordered after each platform). */
  addPaths: { [platform: string]: string; };
  language: string;
  platform: string;
  playMode: string;
  status: string;
};

/**
 * Get the default values for curation game meta.
 * @param games Games to get values from.
 */
export function getDefaultMetaValues(games: IGameInfo[]): GameMetaDefaults {
  return {
    // @TODO Make this value not hard-coded (maybe it should be loaded from the preferences file?)
    addPaths: findMostUsedApplicationPaths(games),
    language: 'en',
    platform: 'Flash',
    playMode: 'Single Player',
    status:   'Playable',
  };
}

/**
 * Find the most used "application paths" for each "platform".
 * @param games Games to search through.
 * @returns Format: map["platform"] => "most used application path"
 */
function findMostUsedApplicationPaths(games: IGameInfo[]): StringMap {
  // Count how often each "application path" is used on each "platform"
  const count = countAppPathsPerPlatform(games);
  // Create an object that only has the most used "application paths" per "platform"
  const map: StringMap = {};
  for (let platform in count) {
    const platformMap = count[platform];
    // Create a sorted array with all the "application paths" used on this "platform"
    // (sorted from most used to least used)
    const sorted = (
      Object.keys(platformMap)
      .sort((a, b) => platformMap[b] - platformMap[a])
    );
    // Assign the most used "application path"
    map[platform] = sorted[0] || '';
  }
  return map;
}

/**
 * Count the number of times each "application path" appears on each "platform".
 * @param games Games to count from.
 */
function countAppPathsPerPlatform(games: IGameInfo[]): Count {
  // Count the number of times each "Application Path" appears on each "Platform"
  const count: Count = {};
  for (let game of games) {
    // Get the platform map (if there is none, create and assign one)
    let platformMap = count[game.platform];
    if (!platformMap) { platformMap = count[game.platform] = {}; }
    // Increment the count of the application path
    platformMap[game.applicationPath] = (platformMap[game.applicationPath] || 0) + 1;
  }
  return count;
}
