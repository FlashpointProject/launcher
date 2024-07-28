import { PayloadAction, isAnyOf } from '@reduxjs/toolkit';
import { debounce } from '@shared/utils/debounce';
import { startAppListening } from '../listenerMiddleware';
import {
  SearchViewAction,
  selectPlaylist,
  setAdvancedFilter,
  setOrderBy,
  setOrderReverse,
  addData,
  requestKeyset,
  setSearchText,
  ResultsView,
  setFilter,
  SearchFilterAction,
} from './slice';
import store from '../store';
import { BackIn, SearchQuery } from '@shared/back/types';

export function addSearchMiddleware() {
  startAppListening({
    matcher: isAnyOf(selectPlaylist, setAdvancedFilter, setOrderBy, setOrderReverse),
    effect: async(action: PayloadAction<SearchViewAction>, listenerApi) => {
      const state = listenerApi.getState();
      const view = state.search.views[action.payload.view];

      if (view) {
        // Debounce building search text
        debounceBuildQuery(view);
      }
    }
  });

  startAppListening({
    matcher: isAnyOf(setFilter),
    effect: async(action: PayloadAction<SearchFilterAction>, listenerApi) => {
      const state = listenerApi.getState();
      const view = state.search.views[action.payload.filter.viewId];

      if (view) {
        // Debounce building search text
        debounceSearch(view.id, view.searchFilter);
      }
    }
  });
}

const debounceBuildQuery = debounce(async (view: ResultsView) => {
  const filter = await window.Shared.back.request(BackIn.PARSE_QUERY_DATA, {
    viewId: view.id,
    searchId: view.data.searchId + 1,
    text: view.text,
    advancedFilter: view.advancedFilter,
    orderBy: view.orderBy,
    orderDirection: view.orderReverse,
    playlist: view.selectedPlaylist
  });

  store.dispatch(setFilter({ filter }));
}, 125);

const debounceSearch = debounce((viewName: string, searchFilter: SearchQuery) => {
  log.info('Launcher', 'Performing search...');
  // Request first page
  window.Shared.back.request(BackIn.BROWSE_VIEW_FIRST_PAGE, searchFilter)
  .then((data) => {
    store.dispatch(addData({
      view: viewName,
      data: {
        searchId: searchFilter.searchId,
        page: 0,
        games: data.games,
      }
    }));

    // Request keyset
    store.dispatch(requestKeyset({
      view: viewName,
      searchId: searchFilter.searchId,
    }));
  });
}, 50);
