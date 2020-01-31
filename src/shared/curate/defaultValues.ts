import { Game } from '@database/entity/Game';

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
  appPaths: { [platform: string]: string; };
  language: string;
  platform: string;
  playMode: string;
  status: string;
  library: string;
};

/**
 * Get the default values for curation game meta.
 * @param games Games to get values from.
 */
export function getDefaultMetaValues(appPaths: { [platform: string]: string; }): GameMetaDefaults {
  return {
    // @TODO Make this value not hard-coded (maybe it should be loaded from the preferences file?)
    appPaths: appPaths,
    language: 'en',
    platform: 'Flash',
    playMode: 'Single Player',
    status:   'Playable',
    library:  'Arcade'.toLowerCase() // must be lower case
  };
}