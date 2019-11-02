import { GamePlaylist } from "src/renderer/playlist/types";
import { OrderGamesOpts } from "src/shared/game/GameFilter";
import { IGameInfo } from '../../shared/game/interfaces';


export interface LoadPlatformError extends Error {
  /** File path of the platform file the error is related to. */
  filePath: string;
}

export type SearchCache = {
  query: SearchCacheQuery;
  total: number;
  results: IGameInfo[];
}

export type SearchCacheQuery = {
  query: string;
  orderOpts: OrderGamesOpts;
  library?: string;
  playlist?: GamePlaylist | undefined;
}