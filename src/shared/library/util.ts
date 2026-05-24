import { GameOrderBy, GameOrderReverse, LangContainer } from 'flashpoint-launcher';

/**
 * Get the title of a library item from a language sub-container (or return the item's route if none was found).
 *
 * @param library Library ID
 * @param lang Language sub-container to look for title in.
 */
export function getLibraryItemTitle(library: string, lang?: LangContainer['libraries']): string {
  return lang && lang[library] || library;
}

export type ViewQuery = {
  /** Query string. */
  text: string;
  /** The field to order the games by. */
  orderBy: GameOrderBy;
  /** The way to order the games. */
  orderReverse: GameOrderReverse;
  /** Playlist to search */
  playlistId?: string;
  /** If extreme games are included. */
  extreme: boolean;
}
