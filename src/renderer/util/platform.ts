import { Game } from '@database/entity/Game';

/** platform.ts is suggestion.ts modified for retreival of platform type */
export function getPlatforms(games: Game[]): string [] {
  // Get the values from the game collection
  const map: { [key: string]: true } = {};
  for (let game of games) {
    getGamePropValues(map, game.platform);
  }
  // Create a more usable object to store the values in
  const plat: string [] = Object.keys(map).filter(val => val !== '').sort();
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
