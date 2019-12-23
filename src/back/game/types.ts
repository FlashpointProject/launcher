import { OrderGamesOpts } from '../../shared/game/GameFilter';
import { IGameInfo } from '../../shared/game/interfaces';
import { GamePlaylist } from '../../shared/interfaces';
import { GamePlatform } from '../../shared/platform/interfaces';
import { EventQueue } from '../util/EventQueue';
import { ErrorCopy } from '../util/misc';

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

export type GameManagerState = {
  /** All working platforms */
  platforms: GamePlatform[];
  /** Platforms path, used to build new platforms later */
  platformsPath: string;
  /** Cached previous searches */
  searchCaches: SearchCache[];
  /** Event queue for saving to file (used to avoid collisions with saving to file). */
  saveQueue: EventQueue;
}

export type LoadPlatformError = ErrorCopy & {
  /** File path of the platform file the error is related to. */
  filePath: string;
}
