import { IGameInfo } from '../shared/game/interfaces';
import { GamePropSuggestions, GamePropSuggestionsMap, SuggestionProps } from '../shared/interfaces';

export function getSuggestions(games: IGameInfo[] = [], libraryTitles: string[] = []): Partial<GamePropSuggestions> {
  // Get the values from the game collection & libraries
  const map: GamePropSuggestionsMap = {
    tags: {},
    platform: {},
    playMode: {},
    status: {},
    applicationPath: {},
    library: {},
  };
  for (let game of games) {
    addGamePropValues(map.tags,            game.tags);
    addGamePropValues(map.platform,        game.platform);
    addGamePropValues(map.playMode,        game.playMode);
    addGamePropValues(map.status,          game.status);
    addGamePropValues(map.applicationPath, game.applicationPath);
  }
  for (let title of libraryTitles) {
    map.library[title] = true;
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
