import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { OrderGamesOpts } from '@shared/game/GameFilter';
import { EventQueue } from '../util/EventQueue';
import { ErrorCopy } from '../util/misc';
import { Tag } from '@database/entity/Tag';

export type UpdateMetaOptions = {
  /** Game entry to add or edit. */
  game: Game;
}

export type RemoveGameResult = {
  /**
   * Indices of all removed games.
   * (gameIndices[platform_index] = [ game_index, ... ])
   */
  gameIndices: number[][];
  /**
   * Indices of all remove add-apps.
   * (addAppIndices[platform_index] = { [addapp_id]: addapp_index })
   */
  addAppIndices: Record<string, number>[];
}

export type SearchCache = {
  query: SearchCacheQuery;
  total: number;
  results: Game[];
}

export type SearchCacheQuery = {
  query: string;
  orderOpts: OrderGamesOpts;
  library?: string;
  playlist?: Playlist | undefined;
}

export type GameManagerState = {
  /** Platforms path, used to build new platforms later */
  platformsPath: string;
  /** Event queue for saving to file (used to avoid collisions with saving to file). */
  saveQueue: EventQueue;
  /** Log messages from the GameManager. */
  log: (content: string) => void;
}

export type LoadPlatformError = ErrorCopy & {
  /** File path of the platform file the error is related to. */
  filePath: string;
}