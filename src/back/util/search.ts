import { AppPreferencesData } from 'flashpoint-launcher';
import { QueryData, SearchQuery } from '@shared/back/types';
import {
  GameSearchDirection,
  GameSearchSortable,
  mergeGameFilters, newSubfilter,
  parseUserSearchInput
} from '@fparchive/flashpoint-archive';
import { isAdvFilterEmpty, parseAdvancedFilter } from '@shared/search/util';
import { deepCopy } from '@shared/Util';

export function createSearchFilter(query: QueryData, preferences: AppPreferencesData): SearchQuery {
  // Build filter for this new search
  const { viewId, searchId, text, advancedFilter, orderBy, orderDirection, playlist } = query;
  const search = parseUserSearchInput(text).search;

  // Merge advanced filter
  if (!isAdvFilterEmpty(advancedFilter)) {
    const advFilter = parseAdvancedFilter(advancedFilter);
    search.filter = mergeGameFilters(search.filter, advFilter);
  }

  switch (orderDirection) {
    case 'ASC':
      search.order.direction = GameSearchDirection.ASC;
      break;
    case 'DESC':
      search.order.direction = GameSearchDirection.DESC;
      break;
  }

  console.log(`Order by: ${orderBy}`);
  if (advancedFilter.playlistOrder && playlist !== undefined) {
    search.order.column = GameSearchSortable.CUSTOM;
  } else {
    switch (orderBy) {
      case 'custom':
        search.order.column = GameSearchSortable.CUSTOM;
        break;
      case 'title':
        search.order.column = GameSearchSortable.TITLE;
        break;
      case 'developer':
        search.order.column = GameSearchSortable.DEVELOPER;
        break;
      case 'publisher':
        search.order.column = GameSearchSortable.PUBLISHER;
        break;
      case 'series':
        search.order.column = GameSearchSortable.SERIES;
        break;
      case 'platform':
        search.order.column = GameSearchSortable.PLATFORM;
        break;
      case 'dateAdded':
        search.order.column = GameSearchSortable.DATEADDED;
        break;
      case 'dateModified':
        search.order.column = GameSearchSortable.DATEMODIFIED;
        break;
      case 'releaseDate':
        search.order.column = GameSearchSortable.RELEASEDATE;
        break;
      case 'lastPlayed':
        if (!search.filter.higherThan.playcount && search.filter.equalTo.playcount === undefined && search.filter.equalTo.playtime === undefined && playlist === undefined) {
          // When searching outside a playlist, treat playtime sorting like a history
          console.log('limiting playcount');
          search.filter.higherThan.playcount = 0;
        }
        search.order.column = GameSearchSortable.LASTPLAYED;
        break;
      case 'playtime':
        if (!search.filter.higherThan.playcount && search.filter.equalTo.playcount === undefined && search.filter.equalTo.playtime === undefined && playlist === undefined) {
          // When searching outside a playlist, treat playtime sorting like a history
          console.log('limiting playcount');
          search.filter.higherThan.playcount = 0;
        }
        search.order.column = GameSearchSortable.PLAYTIME;
        break;
      default:
        search.order.column = GameSearchSortable.TITLE;
    }
  }


  // Tag filters
  const filteredTags = preferences.tagFilters
  .filter(t => t.enabled || (t.extreme && !preferences.browsePageShowExtreme))
  .map(t => t.tags)
  .reduce((prev, cur) => prev.concat(cur), []);
  if (filteredTags.length > 0) {
    const filter = newSubfilter();
    filter.exactBlacklist.tags = filteredTags;
    filter.matchAny = true;
    search.filter.subfilters.push(filter);
  }

  // Optional view library filter
  // if (!playlist && !search.filter.exactWhitelist.library && view.library) {
  //   search.filter.exactWhitelist.library = [view.library];
  // }

  // Playlist filter
  if (playlist) {
    search.customIdOrder = playlist.games.map(g => g.gameId);
    const inner = deepCopy(search.filter);
    // Cheap, but may be limited by playlist size?
    const playlistFilter = newSubfilter();
    playlistFilter.exactWhitelist.id = playlist.games.map(g => g.gameId);
    playlistFilter.matchAny = true;
    const newFilter = newSubfilter();
    newFilter.matchAny = false;
    newFilter.subfilters = [inner, playlistFilter];
    search.filter = newFilter;
  }

  return {
    ...search,
    viewId,
    searchId,
    page: 0,
    playlist,
  };
}
