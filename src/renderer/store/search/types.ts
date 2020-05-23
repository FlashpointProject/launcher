export interface SearchQuery {
  text: string;
}

export const enum SearchActions {
  SET_QUERY = '@@search/SET_QUERY',
}

export interface SearchState {
  readonly query: SearchQuery;
}
