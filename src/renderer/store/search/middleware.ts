import { PayloadAction, isAnyOf } from '@reduxjs/toolkit';
import { debounce } from '@shared/utils/debounce';
import { startAppListening } from '../listenerMiddleware';
import {
  SearchViewAction,
  forceSearch,
  selectPlaylist,
  setAdvancedFilter,
  setOrderBy, setOrderReverse, addData, RequestState, requestKeyset,
} from './slice';
import store from '../store';
import { BackIn, SearchQuery } from '@shared/back/types';

export function addSearchMiddleware() {
  startAppListening({
    matcher: isAnyOf(selectPlaylist, setAdvancedFilter, forceSearch, setOrderBy, setOrderReverse),
    effect: async(action: PayloadAction<SearchViewAction>, listenerApi) => {
      const state = listenerApi.getState();
      const view = state.search.views[action.payload.view];

      if (view) {
        // Perform search
        debounceSearch(action.payload.view, view.searchFilter);
      }
    }
  });
}

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
