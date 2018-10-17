/** Represents a collection of games */
export interface IGameCollection {
  games: IGameInfo[];
  additionalApplications: IAdditionalApplicationInfo[];
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
  /** Name of the publisher of the game */
  publisher: string;
  /** Date-time of when the game was added to collection */
  dateAdded: number;
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
  /** The title but reconstructed to be suitable for sorting and ordering (and not be shown visually) */
  orderTitle: string;
}

/** Represents the meta data for a single additional application */
export interface IAdditionalApplicationInfo {
  /** ID of the additional application (unique identifier) */
  id: string;
  /** ID of the game this additional application is for */
  gameId: string;
  /** Path to the application that runs the additional application */
  applicationPath: string;
  /**
   * If the additional application should run before the game.
   * (If true, this will always run when the game is launched)
   * (If false, this will only run when specifically launched)
   */
  autoRunBefore: boolean;
  /** Command line argument(s) used when launching the additional application */
  commandLine: string;
  /** Name of the additional application */
  name: string;
  /** @TODO Write this comment */
  waitForExit: boolean;
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

/** A game search query, contains the information needed to make a search */
export interface IGameSearchQuery {
  /** Text to filter game titles with */
  text: string;
  /** Allowed platforms (if empty show all, otherwise show only the ones in the array) */
  platforms?: string[];
  /** Allowed developers (if empty show all, otherwise show only the ones in the array) */
  developers?: string[];
  /** Allowed genres (if empty show all, otherwise show only the ones in the array) */
  genres?: string[];
}
