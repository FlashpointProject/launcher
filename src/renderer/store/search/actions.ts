import { action } from 'typesafe-actions';
import { SearchActionTypes, SearchQuery } from './types';

export const setQuery = (query: SearchQuery) => action(SearchActionTypes.SET_QUERY, query);
