import { IGameLibraryFileItem } from '../../shared/library/interfaces';
import GameManagerPlatform from '../game/GameManagerPlatform';

/** Game properties that will have suggestions gathered and displayed. */
type SuggestionProps = (
    'tags'
  | 'platform'
  | 'playMode'
  | 'status'
  | 'applicationPath'
  | 'library'
);

/** Temporarily used to store the suggestions for performance reasons. */
type GamePropSuggestionsMap = {
  /** A map of suggestions for a single game property. */
  [P in SuggestionProps]: {
    /** The key is the suggestion value. */
    [key: string]: true; // (Some arbitrary true-y value, it is only used to confirm that the key exists)
  };
};

/** Suggestions for game properties organized by property. */
export type GamePropSuggestions = {
  [P in SuggestionProps]: string[];
};

/**
 * Get some of the game property values from a game collection.
 * @param platforms Game Collection to read Game property values from.
 * @param libraries Libraries to include in the suggestions.
 * @returns The game property values in the collection (that were extracted).
 */
export function getSuggestions(platforms: GameManagerPlatform[] = [], libraries: IGameLibraryFileItem[] = []): Partial<GamePropSuggestions> {
  // Get the values from the game collection & libraries
  const map: GamePropSuggestionsMap = {
    tags: {},
    platform: {},
    playMode: {},
    status: {},
    applicationPath: {},
    library: {},
  };
  for (let platform of platforms) {
    if (platform.collection) {
      for (let game of platform.collection.games) {
        addGamePropValues(map.tags,            game.tags);
        addGamePropValues(map.platform,        game.platform);
        addGamePropValues(map.playMode,        game.playMode);
        addGamePropValues(map.status,          game.status);
        addGamePropValues(map.applicationPath, game.applicationPath);
      }
    }
  }
  for (let library of libraries) {
    map.library[library.title] = true;
  }
  // Create a more usable object to store the values in
  const sugs: Partial<GamePropSuggestions> = {};
  for (let key in map) {
    sugs[key as SuggestionProps] = (
      Object.keys(map[key as SuggestionProps])
      .filter(val => val !== '')
      .sort()
    );
  }
  return sugs;
}

/**
 * Add Game property value(s) to a dictionary.
 * @param dict Dictionary to add value(s) to (see the documentation of GamePropSuggestionsMap).
 * @param value Game property value(s) (It can contain multiple values that are semi-colon separated).
 */
function addGamePropValues(dict: { [key: string]: true }, value: string): void {
  if (value.indexOf(';') >= 0) { // (Multiple values)
    const values = value.split(';');
    for (let v of values) { dict[v.trim()] = true; }
  } else { // (Single value)
    dict[value] = true;
  }
}
