/** Represents a collection of games */
export interface IGameCollection {
  games: IGameInfo[];
}

/** Represents the meta data for a single Game */
export interface IGameInfo {
  /** Full title of the game */
  title: string;
  /** Game series the game belongs to (empty string if none) */
  series: string;
  /** Name of the developer(s) of the game (developer names are separated by ',') */
  developer: string;
  /** How playable the game is
   *  (Game Status seems to be the same on all games in the XML)
   *  (@TODO Figure out a way to get the game status)
   */
  //status: GameInfoStatus;
  /** Game is not suitable for children */
  extreme: boolean;
  /** Main genre of the game */
  genre: string;
  /** Source if the game files, either full URL or the name of the website */
  source: string;
  /** Path to the application that runs the game */
  applicationPath: string;
  /** Command line argument(s) passed to the application to launch the game */
  launchCommand: string;
}

/** Status of a games playability */
export enum GameInfoStatus {
  /** Fully playable from beginning to end */
  Playable,
  /** File has been tinkered with to make it load */
  PlayableHacked,
  /** Only works in a web browser */
  PlayableWebBrowser,
  /** Game cannot be finished due to missing files */
  PlayablePartial,
}
