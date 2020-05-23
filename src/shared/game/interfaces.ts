import { AdditionalApp } from '../../database/entity/AdditionalApp';
import { Game } from '../../database/entity/Game';
import { Playlist } from '../../database/entity/Playlist';
import { OrderGamesOpts } from './GameFilter';

export const UNKNOWN_LIBRARY = 'unknown';

/** Server Response - Template for all responses */
export type ServerResponse = {
  /** Success of the request */
  success: boolean;
  /** Error message if unsuccessful */
  error?: Error;
  /** Response (if any) empty if unsuccessful */
  result?: any;
}

/** Client Request - Fetch a game */
export type FetchGameRequest = {
  /** Id of the game */
  id: string;
}

/** Server Response - Return a requested game */
export type FetchGameResponse = {
  /** Game found */
  game: Game;
}

/** Client Request - Remove a game or additional application */
export type GameAppDeleteRequest = {
  /** ID of the game or addapp to remove */
  id: string;
}

/** Client Request - Add a game */
export type GameAddRequest = {
  /** Game to add */
  game: Game;
}

/** Client Request - Add an additional application */
export type AppAddRequest = {
  /** Add App to add */
  addApp: AdditionalApp;
}

/** Client Request - Information needed to make a search */
export type SearchRequest = {
  /** String to use as a search query */
  query: string;
  /** Offset to begin in a search result */
  offset: number;
  /** Max number of results to return */
  limit: number;
  /** Opts to search by */
  orderOpts: OrderGamesOpts;
  /** Library to search (all if none) */
  library?: string;
  /** Playlist to filter by (if any) */
  playlist?: Playlist;
}

/** Server Response - List of games from a search */
export type SearchResults = SearchRequest & {
  /** Total number of results found */
  total: number;
  /** Games returned from a search query */
  results: Game[];
}
