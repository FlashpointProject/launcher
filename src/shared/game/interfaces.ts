/** Represents a collection of games */
export interface IGameCollection {
  games: IGameInfo[];
}

/** Represents the meta data for a single Game */
export interface IGameInfo {
  /** ID of the game (unique identifier) */
  id: string;
  /** Full title of the game */
  title: string;
  /** Game series the game belongs to (empty string if none) */
  series: string;
  /** Name of the developer(s) of the game (developer names are separated by ',') */
  developer: string;
  /** Platform the game runs on (Flash, HTML5, Shockwave etc.) */
  platform: string;
  /** If the game is "broken" or not */
  broken: boolean;
  /** Game is not suitable for children */
  extreme: boolean;
  /** If the game is single player or multiplayer, and if the multiplayer is cooperative or not */
  playMode: string;
  /** How playable the game is */
  status: string;
  /** Information that could be useful for the player (of varying importance) */
  notes: string;
  /** Main genre of the game */
  genre: string;
  /** Source if the game files, either full URL or the name of the website */
  source: string;
  /** Path to the application that runs the game */
  applicationPath: string;
  /** Command line argument(s) passed to the application to launch the game */
  launchCommand: string;
}

/** Status of a games playability (Currently unused) */
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
