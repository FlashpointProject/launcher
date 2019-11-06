import { IAppConfigData } from '../config/interfaces';
import { IAppPreferencesData } from '../preferences/interfaces';

export enum BackIn {
  GET_BORING_STUFF,
  /** Get the full config and preferences objects. */
  GET_CONFIG_AND_PREFERENCES,
  /** Update any number of configs. */
  UPDATE_CONFIG,
  /** Update any number of preferences. */
  UPDATE_PREFERENCES,
  /** Load the backend game manager */
  LOAD_GAMEMANAGER,
  /** Get a list of loaded platforms */
  GET_PLATFORMS,
  /** Find a game */
  FIND_GAME,
  /** Search for games */
  SEARCH_GAMES,
  /** Remove a game or add app */
  REMOVE_GAMEAPP,
  /** Update any number of games or add apps metadata */
  UPDATE_META,
}

export enum BackOut {
  GET_BORING_STUFF_RESPONSE,
  GET_CONFIG_AND_PREFERENCES_RESPONSE,
  UPDATE_CONFIG_RESPONSE,
  UPDATE_PREFERENCES_RESPONSE,
  LOAD_GAMEMANAGER_RESPONSE,
  GET_PLATFORMS_RESPONSE,
  FIND_GAME_RESPONSE,
  SEARCH_GAMES_RESPONSE,
  REMOVE_GAMEAPP_RESPONSE,
  UPDATE_META_RESPONSE,
}

export type WrappedRequest = {
  /** Identifier of the response */
  id: string;
  /** Type of the request */
  type: BackIn;
  /** Data contained in the response (if any) */
  data?: any;
}

export type WrappedResponse<T = any> = {
  /** Identifier of the response */
  id: string;
  /** Type of the response */
  type: BackOut;
  /** Data contained in the response (if any) */
  data?: T;
}

export type BackInitArgs = {
  /** Path to the folder containing the preferences and config files. */
  configFolder: string;
  /** Secret string used for authentication. */
  secret: string;
}

export type GetBoringStuffData = {
  totalGames: number;
}

export type GetConfigAndPrefsResponse = {
  config: IAppConfigData;
  preferences: IAppPreferencesData;
}

