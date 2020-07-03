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
}

export enum RequestState {
  /** Request is waiting to be made. */
  WAITING,
  /** Reqest has been made. Waiting for the response to be received. */
  REQUESTED,
  /** Response has been received. */
  RECEIVED,
}
