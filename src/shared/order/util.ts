import { GameOrderBy, GameOrderReverse } from 'flashpoint-launcher';

/** An array with all valid values of GameOrderBy */
export const gameOrderByOptions: GameOrderBy[] = [ 'title', 'developer', 'publisher', 'series', 'platform', 'dateAdded', 'dateModified', 'releaseDate', 'lastPlayed', 'playtime' ];

/** An array with all valid values of GameOrderReverse */
export const gameOrderReverseOptions: GameOrderReverse[] = [ 'ASC', 'DESC' ];
