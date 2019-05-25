/** platform.ts is suggestion.ts modified for retreival of platform type */
import { GameCollection } from '../../shared/game/GameCollection';

/** Properties that are suggested */
type PlatformProps = (
  | 'platform'
);

/** Temporarily used to store the values as keys/props for performance reasons */
type GamePropPlatformMap = {
  [P in PlatformProps]: {
    [key: string]: true
  }
};

export type GamePropPlatform = {
  [P in PlatformProps]: string[]
};

export function getPlatform(collection: GameCollection): string [] {
  // Get the values from the game collection
  const map: GamePropPlatformMap = {
    platform: {}
  };
  for (let key in collection.games) {
    const game = collection.games[key];
    getGamePropValues(map.platform,game.platform);
  }
  // Create a more usable object to store the values in
  const plat: string [] = Object.keys(map.platform).filter(val => val !== '').sort();
  return plat;
}

function getGamePropValues(dict: { [key: string]: true }, value: string) {
  if (value.indexOf(';') >= 0) { // (Multiple values)
    const values = value.split(';');
    for (let v of values) { dict[v.trim()] = true; }
  } else { // (Single value)
    dict[value] = true;
  }
}
