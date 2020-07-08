export enum MainActionType {
  // @TODO Temporary (should be separated into individual actions)
  /** Drop in replacement for "this.setState". */
  SET_STATE = '@@main/SET_STATE',
  /** Drop in replacement for "this.setState" when only editing the state of a single view. */
  SET_VIEW_STATE = '@@main/SET_VIEW_STATE',
  // Normal actions
  /** Set the query of a view. */
  SET_VIEW_QUERY = '@@main/SET_VIEW_QUERY',
  /** Set the current "boundries" of a view. These describe the range of currently visible pages. */
  SET_VIEW_BOUNDRIES = '@@main/SET_VIEW_BOUNDRIES',
  /** Set the meta of a view. */
  SET_VIEW_META = '@@main/SET_VIEW_META',
  /** Flag pages of a view as requested. This is to prevent the same pages from being requested multiple times. */
  REQUEST_VIEW_PAGES = '@@main/REQUEST_VIEW_PAGES',
  /** Add pages to a view. */
  ADD_VIEW_PAGES = '@@main/ADD_VIEW_PAGES',
  /** Set the order. This is a "central order" used by all views. */
  SET_ORDER = '@@main/SET_ORDER',
  /** Set the credits data (or at least flag it as done loading it). */
  SET_CREDITS = '@@main/SET_CREDITS',
  /** Stop rendering. */
  STOP_RENDER = '@@main/STOP_RENDER',
  /** Open the meta exporter overlay. */
  OPEN_META_EXPORTER = '@@main/OPEN_META_EXPORTER',
  /** Close the meta exporter overlay. */
  CLOSE_META_EXPORTER = '@@main/CLOSE_META_EXPORTER',
  /** Flag things as loaded. */
  ADD_LOADED = '@@main/ADD_LOADED',
  /** Set the total number of games. */
  SET_GAMES_TOTAL = '@@main/SET_GAMES_TOTAL',
  /** Set the suggestions. */
  SET_SUGGESTIONS = '@@main/SET_SUGGESTIONS',
  /** Set the locale. */
  SET_LOCALE = '@@main/SET_LOCALE',
  /** Set the language. */
  SET_LANGUAGE = '@@main/SET_LANGUAGE',
  /** Set the language list. */
  SET_LANGUAGE_LIST = '@@main/SET_LANGUAGE_LIST',
  /** Set the theme list. */
  SET_THEME_LIST = '@@main/SET_THEME_LIST',
  /** Set the playlists. */
  SET_PLAYLISTS = '@@main/SET_PLAYLISTS',
  /** Set the upgrades. */
  SET_UPGRADES = '@@main/SET_UPGRADES',
  /** Set the update info. */
  SET_UPDATE_INFO = '@@main/SET_UPDATE_INFO',
  /** Create a new game. This is an ancient and wonky system! */
  CLICK_NEW_GAME = '@@main/CLICK_NEW_GAME',
  /** Perform this action AFTER creating a new game (using CLICK_NEW_GAME)! */
  CLICK_NEW_GAME_END = '@@main/CLICK_NEW_GAME_END',
  /** Remove the currently displayed random games and shift in new games from the queue. */
  SHIFT_RANDOM_GAMES = '@@main/SHIFT_RANDOM_GAMES',
  /** Flag random games as being requested. */
  REQUEST_RANDOM_GAMES = '@@main/REQUEST_RANDOM_GAMES',
  /** Add random games to the end of the queue and unset the flag for requesting random games. */
  RESPONSE_RANDOM_GAMES = '@@main/RESPONSE_RANDOM_GAMES',
  /** Remove all queued random games (the currently displayed games are NOT removed). */
  CLEAR_RANDOM_GAMES = '@@main/CLEAR_RANDOM_GAMES',
}

export enum RequestState {
  /** Request is waiting to be made. */
  WAITING,
  /** Reqest has been made. Waiting for the response to be received. */
  REQUESTED,
  /** Response has been received. */
  RECEIVED,
}
