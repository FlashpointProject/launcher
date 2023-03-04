import { GameOrderBy, GameOrderReverse } from 'flashpoint-launcher';

/** An array with all valid values of GameOrderBy */
export const gameOrderByOptions: GameOrderBy[] = [ 'dateAdded', 'dateModified', 'tags', 'series', 'title', 'developer', 'publisher' ];

/** An array with all valid values of GameOrderReverse */
export const gameOrderReverseOptions: GameOrderReverse[] = [ 'ASC', 'DESC' ];
