import { OrderGamesOpts } from '@shared/game/GameFilter';
import { IAdditionalApplicationInfo, IGameInfo } from '@shared/game/interfaces';
import { GamePlaylist } from '@shared/interfaces';
import { GamePlatform } from '@shared/platform/interfaces';
import { EventQueue } from '../util/EventQueue';
import { ErrorCopy } from '../util/misc';

export type UpdateMetaOptions = {
  /** Game entry to add or edit. */
  game: IGameInfo;
  /** All additional applications of that game entry (any missing ones will be deleted). */
  addApps: IAdditionalApplicationInfo[];
  /** Save to disk immediately after updating the entries. */
  saveToDisk: boolean;
}

export type RemoveGameOptions = {
  /** ID of the game to remove. */
  gameId: string;
  /** Save to disk immediately after removing the entries. */
  saveToDisk: boolean;
}

export type RemoveGameResult = {
  /** All platforms that were edited. */
  edited: GamePlatform[];
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
  /** Event queue for saving to file (used to avoid collisions with saving to file). */
  saveQueue: EventQueue;
}

export type LoadPlatformError = ErrorCopy & {
  /** File path of the platform file the error is related to. */
  filePath: string;
}
