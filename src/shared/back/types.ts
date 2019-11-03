export enum BackIn {
  /** Load the preferences from the file. */
  LOAD_PREFERENCES,
  /** Get the full preferences object. */
  GET_PREFERENCES,
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
  LOAD_PREFERENCES_RESPONSE,
  GET_PREFERENCES_RESPONSE,
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
  requestType: BackIn;
  /** Data contained in the response (if any) */
  data?: any;
}

export type WrappedResponse = {
  /** Identifier of the response */
  id: string;
  /** Type of the message */
  responseType: BackOut;
  /** Data contained in the response (if any) */
  data?: any;
}

export type BackInitArgs = {
  /** Lower limit of the range of ports that the back should listen on. */
  portMin: number;
  /** Upper limit of the range of ports that the back should listen on. */
  portMax: number;
  /** Path to the preferences file. */
  preferencesPath: string;
  /** Secret string used for authentication. */
  secret: string;
}
