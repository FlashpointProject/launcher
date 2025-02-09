import { isAnyOf, PayloadAction } from '@reduxjs/toolkit';
import { BackIn, SearchQuery } from '@shared/back/types';
import { updatePreferencesData } from '@shared/preferences/util';
import { debounce } from '@shared/utils/debounce';
import { startAppListening } from '../listenerMiddleware';
import store from '../store';
import {
  addData,
  createViews,
  GENERAL_VIEW_ID,
  requestKeyset,
  resetDropdownData,
  ResultsView,
  SearchCreateViewsAction,
  SearchFilterAction,
  SearchViewAction,
  selectGame,
  selectPlaylist,
  setAdvancedFilter,
  setDropdownData,
  setExpanded,
  setFilter,
  setOrderBy,
  setOrderReverse,
  setSearchText
} from './slice';

export function addSearchMiddleware() {
  // Build filter immediately
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

    // Build filter immediately
    startAppListening({
      matcher: isAnyOf(resetDropdownData),
      effect: async(action: PayloadAction<string>, listenerApi) => {
        const state = listenerApi.getOriginalState();
        if (state.search.dropdowns.key !== action.payload) {
          // Key has changed, fire off the updates
          const tfgs = window.Shared.preferences.data.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !window.Shared.preferences.data.browsePageShowExtreme));
          const startTime = Date.now();
          const key = action.payload;

          window.Shared.back.request(BackIn.GET_TAGS, tfgs)
            .then((data) => {
              console.log(`Found ${data.length} tags in ${Date.now() - startTime}ms`);
              store.dispatch(setDropdownData({ tags: data, key }));
            });

          window.Shared.back.request(BackIn.GET_DISTINCT_DEVELOPERS, tfgs)
            .then((data) => {
              console.log(`Found ${data.length} developers in ${Date.now() - startTime}ms`);
              store.dispatch(setDropdownData({ developers: data, key }));
            });

          window.Shared.back.request(BackIn.GET_DISTINCT_PUBLISHERS, tfgs)
            .then((data) => {
              console.log(`Found ${data.length} publishers in ${Date.now() - startTime}ms`);
              store.dispatch(setDropdownData({ publishers: data, key }));
            });

          window.Shared.back.request(BackIn.GET_DISTINCT_SERIES, tfgs)
            .then((data) => {
              console.log(`Found ${data.length} series in ${Date.now() - startTime}ms`);
              store.dispatch(setDropdownData({ series: data, key }));
            });
        }
      }
    });

  // Restore games and playlists in restored views
  startAppListening({
    matcher: isAnyOf(createViews),
    effect: async(action: PayloadAction<SearchCreateViewsAction>, listenerApi) => {
      const state = listenerApi.getState();
      if (action.payload.storedViews && action.payload.storedViews.length > 0) {
        const playlists = await window.Shared.back.request(BackIn.GET_PLAYLISTS);

        for (const storedView of action.payload.storedViews) {
          const view = state.search.views[storedView.view];
          if (view && view.id !== GENERAL_VIEW_ID) {
            if (storedView.selectedGameId) {
              // Attempt to restore game
              window.Shared.back.request(BackIn.GET_GAME, storedView.selectedGameId)
              .then((game) => {
                if (game) {
                  store.dispatch(selectGame({
                    view: storedView.view,
                    game
                  }));
                }
              });
            }
            if (storedView.selectedPlaylistId) {
              // Attempt to restore playlist
              const matchedPlaylist = playlists.find((p) => p.id === storedView.selectedPlaylistId);
              if (matchedPlaylist) {
                store.dispatch(selectPlaylist({
                  view: storedView.view,
                  playlist: matchedPlaylist
                }));
              }
            }
          }
        }
      }
    }
  });

  // Save stored view
  startAppListening({
    matcher: isAnyOf(setSearchText, selectGame, selectPlaylist, setAdvancedFilter, setOrderBy, setOrderReverse, setExpanded),
    effect: async(action: PayloadAction<SearchViewAction>, listenerApi) => {
      const state = listenerApi.getState();
      const view = state.search.views[action.payload.view];

      if (view && view.id !== GENERAL_VIEW_ID) {
        const newStoredViews = [...window.Shared.preferences.data.storedViews];
        const existingStoredView = newStoredViews.find(s => s.view === action.payload.view);
        if (existingStoredView) {
          existingStoredView.text = view.text;
          existingStoredView.advancedFilter = view.advancedFilter;
          existingStoredView.orderBy = view.orderBy;
          existingStoredView.orderReverse = view.orderReverse;
          existingStoredView.selectedPlaylistId = view.selectedPlaylist ? view.selectedPlaylist.id : undefined;
          existingStoredView.selectedGameId = view.selectedGame ? view.selectedGame.id : undefined;
          existingStoredView.expanded = view.expanded;
        } else {
          newStoredViews.push({
            view: action.payload.view,
            text: view.text,
            advancedFilter: view.advancedFilter,
            orderBy: view.orderBy,
            orderReverse: view.orderReverse,
            selectedPlaylistId: view.selectedPlaylist ? view.selectedPlaylist.id : undefined,
            selectedGameId: view.selectedGame ? view.selectedGame.id : undefined,
            expanded: view.expanded,
          });
        }
        updatePreferencesData({
          storedViews: newStoredViews
        });
      }
    }
  });

  // Send search for new filter
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
