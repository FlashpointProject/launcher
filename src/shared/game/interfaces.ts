/** Represents a collection of games */
export interface IGameCollection {
  games: IGameInfo[];
}

/** Represents a single Game */
export interface IGameInfo {
  title: string;
  genre: string;
  platform: string;
  applicationPath: string;
  commandLine: string;
}


