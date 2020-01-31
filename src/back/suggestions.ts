import { Game } from '@database/entity/Game';
import { GamePropSuggestions } from '@shared/interfaces';
import { GameManager } from './game/GameManager';

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
