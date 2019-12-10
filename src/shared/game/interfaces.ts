import { PlatformInfo } from '../platform/interfaces';
import { OrderGamesOpts } from './GameFilter';
import { GamePlaylist } from '../interfaces';

export const UNKNOWN_LIBRARY = 'unknown';

/** Represents a collection of games */
export interface IGameCollection {
  games: IGameInfo[];
  additionalApplications: IAdditionalApplicationInfo[];
}

/**
 * Represents the meta data for a single Game (that gets saved)
 * (This will replace "IRawLaunchBoxGame" once a JSON format is used instead of XML)
 */
export interface IPureGameInfo {
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
  dateAdded: string;
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
  /** Date of when the game was released */
  releaseDate: string;
  /** Version of the game */
  version: string;
  /** Original description of the game (probably given by the game's creator or publisher) */
  originalDescription: string;
  /** The language(s) the game is in */
  language: string;
}

/** Represents the meta data for a single Game (including temporary data) */
export interface IGameInfo extends IPureGameInfo {
  /** Library this game belongs to */
  library: string;
  /** The title but reconstructed to be suitable for sorting and ordering (and not be shown visually) */
  orderTitle: string;
  /** If the game is a placeholder (and can therefore not be saved) */
  placeholder: boolean;
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
  /** Command line argument(s) passed to the application to launch the game */
  launchCommand: string;
  /** Name of the additional application */
  name: string;
  /** @TODO Write this comment */
  waitForExit: boolean;
}

/** Server Response - Template for all responses */
export type ServerResponse = {
  /** Success of the request */
  success: boolean;
  /** Error message if unsuccessful */
  error?: Error;
  /** Response (if any) empty if unsuccessful */
  result?: any;
}

/** Server Response - Return all platforms info */
export type FetchPlatformInfoResponse = {
  /** Info for all platforms */
  platforms: PlatformInfo[];
}

/** Client Request - Fetch a game */
export type FetchGameRequest = {
  /** Id of the game */
  id: string;
}

/** Server Response - Return a requested game with its addApps */
export type FetchGameResponse = {
  /** Game info found */
  game: IGameInfo;
  /** Additional applications of the game found */
  addApps: IAdditionalApplicationInfo[];
}

/** Client Request - Remove a game or additional application */
export type GameAppDeleteRequest = {
  /** ID of the game or addapp to remove */
  id: string;
}

/** Client Request - Add a game */
export type GameAddRequest = {
  /** Metadata of the game to add */
  meta: IPureGameInfo;
}

/** Client Request - Add an additional application */
export type AppAddRequest = {
  /** Metadata of the additional application to add */
  meta: IAdditionalApplicationInfo;
}

/** Client Request - Information needed to make a search */
export type SearchRequest = {
  /** String to use as a search query */
  query: string;
  /** Offset to begin in a search result */
  offset: number;
  /** Max number of results to return */
  limit: number;
  /** Opts to search by */
  orderOpts: OrderGamesOpts;
  /** Library to search (all if none) */
  library?: string;
  /** Playlist to filter by (if any) */
  playlist?: GamePlaylist;
}

/** Server Response - List of games from a search */
export type SearchResults = SearchRequest & {
  /** Total number of results found */
  total: number;
  /** Games returned from a search query */
  results: IGameInfo[];
}

/** Client Request - Metadata updates */
export type MetaUpdate = {
  /** Any game entries to update */
  games: IGameInfo[];
  /** Any add app entries to update */
  addApps: IAdditionalApplicationInfo[];
  /** Library to move games and add apps to */
  library? : string;
  /** Save to disk immediately after updating the entries */
  saveToDisk: boolean;
}