import { GameCollection } from '../../shared/game/GameCollection';

/** Properties that are suggested */
type SuggestionProps = (
    'developer'
  | 'genre'
  | 'series'
  | 'publisher'
  | 'source'
  | 'platform'
  | 'playMode'
  | 'status'
  | 'applicationPath'
);

/** Temporarily used to store the values as keys/props for performance reasons */
type GamePropSuggestionsMap = {
  [P in SuggestionProps]: {
    [key: string]: true
  }
};

export type GamePropSuggestions = {
  [P in SuggestionProps]: string[]
};

export function getSuggestions(collection: GameCollection): Partial<GamePropSuggestions> {
  console.time('getSuggestions');
  // Get the values from the game collection
  const map: GamePropSuggestionsMap = {
    developer: {},
    genre: {},
    series: {},
    publisher: {},
    source: {},
    platform: {},
    playMode: {},
    status: {},
    applicationPath: {},
  };
  for (let key in collection.games) {
    const game = collection.games[key];
    getGamePropValues(map.developer,       game.developer);
    getGamePropValues(map.genre,           game.genre);
    getGamePropValues(map.series,          game.series);
    getGamePropValues(map.publisher,       game.publisher);
    getGamePropValues(map.source,          game.source);
    getGamePropValues(map.platform,        game.platform);
    getGamePropValues(map.playMode,        game.playMode);
    getGamePropValues(map.status,          game.status);
    getGamePropValues(map.applicationPath, game.applicationPath);
  }
  // Create a more usable object to store the values in
  const sugs: Partial<GamePropSuggestions> = {};
  for (let key in map) {
    sugs[key as SuggestionProps] = Object.keys(map[key as SuggestionProps]);
  }
  // Done
  console.timeEnd('getSuggestions');
  return sugs;
}

function getGamePropValues(dict: { [key: string]: true }, value: string) {
  if (value.indexOf(';') >= 0) { // (Multiple values)
    const vals = value.split(';');
    for (let v of vals) { dict[v.trim()] = true; }
  } else { // (Single value)
    dict[value] = true;
  }
}
