import { GameOrderBy, GameOrderReverse } from './interfaces';

/** An array with all valid values of GameOrderBy */
export const gameOrderByOptions: GameOrderBy[] = [ 'dateAdded', 'genre', 'platform', 'series', 'title' ];

/** An array with all valid values of GameOrderReverse */
export const gameOrderReverseOptions: GameOrderReverse[] = [ 'ascending', 'descending' ];
