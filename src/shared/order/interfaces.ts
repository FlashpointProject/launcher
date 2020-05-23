import { Game } from '@database/entity/Game';

/** Properties to order games by */
export type GameOrderBy = keyof Game;

/** Ways to order games */
export type GameOrderReverse = 'ASC'|'DESC';
