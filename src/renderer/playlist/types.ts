/** Data contained inside a Playlist file. */
export type GamePlaylist = {
  /** Randomly selected universal unique identifier (UUIDv4). */
  id: string;
  /** Game entries in the playlist. */
  games: GamePlaylistEntry[];
  /** Title of the playlist. */
  title: string;
  /** Description of the playlist. */
  description: string;
  /** Author of the playlist. */
  author: string;
  /** Icon of the playlist (Base64 encoded image). */
  icon?: string;
  /** Route of the library this playlist is for. */
  library?: string;
}

/** An entry inside a Playlist file. */
export type GamePlaylistEntry = {
  /* GameID of game. */
  id: string;
  /* Optional notes related to the game (probably about why the game is in the playlist). */
  notes?: string;
}
