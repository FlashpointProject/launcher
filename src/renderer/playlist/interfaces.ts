/** Playlist in memory (after being loaded / before being saved) */
export interface IGamePlaylist {
  /** Randomly selected universal unique identifier (UUIDv4) */
  id: string;
  games: IGamePlaylistEntry[];
  title: string;
  description: string;
  author: string;
  icon?: string;
}

export interface IGamePlaylistEntry {
  /* GameID of game */
  id: string;
  /* Optional notes related to the game (probably about why the game is in the playlist) */
  notes?: string;
}
