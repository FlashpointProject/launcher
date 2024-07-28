import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { deepCopy } from '@shared/Util';
import { AppPreferencesData, Game, GameOrderBy, GameOrderReverse, Playlist, ViewGame } from 'flashpoint-launcher';
import {
  ElementPosition,
  GameSearchDirection,
  GameSearchSortable,
  mergeGameFilters,
  newSubfilter,
  parseUserSearchInput
} from '@fparchive/flashpoint-archive';
import { BackIn, PageKeyset, SearchQuery } from '@shared/back/types';
import { parseAdvancedFilter } from '@shared/search/util';
import { VIEW_PAGE_SIZE } from '@shared/constants';

export const GENERAL_VIEW_ID = '!general!';

export enum RequestState {
  /** Request is waiting to be made. */
  WAITING,
  /** Request has been made. Waiting for the response to be received. */
  REQUESTED,
  /** Response has been received. */
  RECEIVED,
}

export type SwapPlaylistGameData = {
  view: string;
  sourceGameId: string;
  destGameId: string;
}

export type ResultsViewData = {
  searchId: number;
  games: Record<number, ViewGame>;
  total?: number;
  pages: Record<number, RequestState>;
  keyset: PageKeyset;
  metaState: RequestState;
}

export type SearchAddDataActionData = {
  searchId: number;
  page?: number;
  games?: ViewGame[];
  total?: number;
  pages?: Record<number, RequestState>;
  keyset?: PageKeyset;
}

export type ResultsView = {
  id: string;
  library?: string;
  selectedGame?: Game,
  selectedPlaylist?: Playlist,
  data: ResultsViewData;
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
  text: string;
  textPositions: ElementPosition[];
  advancedFilter: AdvancedFilter;
  searchFilter: SearchQuery;
  loaded: boolean;
}

export type AdvancedFilter = {
  installed?: boolean;
}

type SearchState = {
  views: Record<string, ResultsView>,
}

export type SearchSetTextAction = {
  view: string;
  text: string;
}

export type SearchSetGameAction = {
  view: string;
  game?: Game;
}

export type SearchSetPlaylistAction = {
  view: string;
  playlist?: Playlist;
}

export type SearchOrderByAction = {
  view: string;
  value: GameOrderBy;
}

export type SearchOrderReverseAction = {
  view: string;
  value: GameOrderReverse;
}

export type SearchAdvancedFilterAction = {
  view: string;
  filter: AdvancedFilter;
}

export type SearchViewAction = {
  view: string;
}

export type SearchAddDataAction = {
  view: string;
  data: SearchAddDataActionData;
}

export type SearchRequestRange = {
  view: string;
  searchId: number;
  start: number;
  count: number;
}

const initialState: SearchState = {
  views: {
    [GENERAL_VIEW_ID]: {
      id: GENERAL_VIEW_ID,
      advancedFilter: {},
      data: {
        searchId: 0,
        keyset: [],
        games: [],
        pages: {},
        metaState: RequestState.WAITING,
      },
      loaded: false,
      orderBy: 'title',
      orderReverse: 'ASC',
      searchFilter: {
        ...parseUserSearchInput('').search,
        viewId: GENERAL_VIEW_ID,
        searchId: 0,
        page: 0,
      },
      text: '',
      textPositions: [],
    }
  }
};

export type RequestKeysetAction = {
  view: string;
  searchId: number;
}

export const requestKeyset = createAsyncThunk(
  'search/requestKeyset',
  async (payload: RequestKeysetAction, { getState, dispatch }) => {
    const state = getState() as { search: SearchState };
    const view = state.search.views[payload.view];
    log.debug('Search', `KEYSET - Cur: ${view.data.searchId} Recv: ${payload.searchId}`);

    if (view && payload.searchId === view.data.searchId) {
      const data = await window.Shared.back.request(BackIn.BROWSE_VIEW_KEYSET, view.searchFilter);
      // Dispatch an action to handle the keyset data
      dispatch(addData({ view: payload.view, data: {
        searchId: payload.searchId,
        keyset: data.keyset,
        total: data.total,
      } }));
    }
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    createViews(state: SearchState, { payload }: PayloadAction<string[]>) {
      console.log(`Creating views for: ${payload}`);
      for (const view of payload) {
        if (!state.views[view]) {
          state.views[view] = {
            id: view,
            library: view,
            advancedFilter: {},
            data: {
              searchId: 0,
              keyset: [],
              games: [],
              pages: {},
              metaState: RequestState.WAITING,
            },
            loaded: false,
            orderBy: 'title',
            orderReverse: 'ASC',
            searchFilter: {
              ...parseUserSearchInput('').search,
              viewId: view,
              searchId: 0,
              page: 0,
            },
            text: '',
            textPositions: [],
          };
        }
      }
    },
    setSearchText(state: SearchState, { payload }: PayloadAction<SearchSetTextAction>) {
      const view = state.views[payload.view];
      if (view) {
        const { positions } = parseUserSearchInput(payload.text);
        view.text = payload.text;
        view.textPositions = positions;
        console.log('new pos');
        console.log(positions);
        // Filter will update on force
      }
    },
    selectPlaylist(state: SearchState, { payload }: PayloadAction<SearchSetPlaylistAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.selectedPlaylist = payload.playlist ? deepCopy(payload.playlist) : undefined;
        view.searchFilter = createSearchFilter(payload.view, view, window.Shared.preferences.data);
      }
    },
    selectGame(state: SearchState, { payload }: PayloadAction<SearchSetGameAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.selectedGame = payload.game ? deepCopy(payload.game) : undefined;
      }
    },
    forceSearch(state: SearchState, { payload }: PayloadAction<SearchViewAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.searchFilter = createSearchFilter(payload.view, view, window.Shared.preferences.data);
      }
    },
    setOrderBy(state: SearchState, { payload }: PayloadAction<SearchOrderByAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.orderBy = payload.value;
        view.searchFilter = createSearchFilter(payload.view, view, window.Shared.preferences.data);
      }
    },
    setOrderReverse(state: SearchState, { payload }: PayloadAction<SearchOrderReverseAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.orderReverse = payload.value;
        view.searchFilter = createSearchFilter(payload.view, view, window.Shared.preferences.data);
      }
    },
    setAdvancedFilter(state: SearchState, { payload }: PayloadAction<SearchAdvancedFilterAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.advancedFilter = payload.filter;
        view.searchFilter = createSearchFilter(payload.view, view, window.Shared.preferences.data);
      }
    },
    requestRange(state: SearchState, { payload }: PayloadAction<SearchRequestRange>) {
      const view = state.views[payload.view];
      const { start, count, searchId } = payload;
      console.log(`Range requested - ${start} - len:${count}`);
      if (view && view.data.searchId === searchId) { // Ignore outdated requests
        // Iterate over requested page numbers
        const end = start + count;
        for (let i = start; i < end; i++) {
          // Make sure page exists and is waiting
          if (i > 0 && view.data.pages[i] === RequestState.WAITING && view.data.keyset[i-1]) {
            // Form the new request
            view.data.pages[i] = RequestState.REQUESTED;
            const searchFilter: SearchQuery = {
              ...view.searchFilter,
              offset: view.data.keyset[i-1],
              page: i,
            };
            console.log(`requested page ${i}`);
            // Fire and forget request, registered handler will properly handle response
            window.Shared.back.send(BackIn.BROWSE_VIEW_PAGE, searchFilter);
          }
        }
      }
    },
    swapPlaylistGame(state: SearchState, { payload }: PayloadAction<SwapPlaylistGameData>) {
      const view = state.views[payload.view];
      const { sourceGameId, destGameId } = payload;

      if (view && view.selectedPlaylist) {
        const sourceIdx = view.selectedPlaylist.games.findIndex(g => g.gameId === sourceGameId);
        const destIdx = view.selectedPlaylist.games.findIndex(g => g.gameId === destGameId);
        if (sourceIdx > -1 && destIdx > -1) {
          const replacedGame = view.selectedPlaylist.games[destIdx];
          view.selectedPlaylist.games[destIdx] = view.selectedPlaylist.games[sourceIdx];
          view.selectedPlaylist.games[sourceIdx] = replacedGame;

          // Update the playlist file
          window.Shared.back.send(BackIn.SAVE_PLAYLIST, view.selectedPlaylist);
        }
      }
    },
    updateGame(state: SearchState, { payload }: PayloadAction<Game>) {
      for (const viewName of Object.keys(state.views)) {
        const view = state.views[viewName];
        if (view.selectedGame && view.selectedGame.id === payload.id) {
          view.selectedGame = payload;
        }
      }
    },
    addData(state: SearchState, { payload }: PayloadAction<SearchAddDataAction>) {
      const startTime = Date.now();
      const data = payload.data;
      console.log(payload);
      const view = state.views[payload.view];
      if (view) {
        log.debug('Search', `ADD DATA - Cur: ${view.data.searchId} Recv: ${payload.data.searchId}`);
        // If data has lower id, search results are outdated, discard
        if (view.data.searchId > data.searchId) {
          return;
        }

        // If data has higher id, current data is outdated, replace
        if (view.data.searchId < data.searchId) {
          view.data = {
            searchId: data.searchId,
            pages: {},
            keyset: [],
            games: {},
            total: undefined,
            metaState: RequestState.REQUESTED,
          };
        }

        // Add data
        if (data.total !== undefined) {
          view.data.total = data.total;
        }

        // Replace keyset and set up page records
        if (data.keyset) {
          view.data.keyset = data.keyset;
          const length = Object.keys(data.keyset).length + 1;
          const pages: Record<number, RequestState> = {};

          for (let i = 0; i < length; i++) {
            pages[i] = RequestState.WAITING;
          }

          pages[0] = RequestState.RECEIVED; // First page will always exist by the time a keyset returns

          view.data.pages = pages;
        }

        // Copy all changed page states
        if (data.pages) {
          Object.assign(view.data.pages, data.pages);
        }

        if (data.page !== undefined && data.games) {
          if (data.page === 0 && data.games.length === 0) {
            // No games in first page, must be empty results
            console.log('no results');
            view.data.total = 0;
          } else {
            const startIdx = VIEW_PAGE_SIZE * data.page;
            for (let i = 0; i < data.games.length; i++) {
              view.data.games[startIdx + i] = data.games[i];
            }
            view.data.pages[data.page] = RequestState.RECEIVED;
          }
          view.data.metaState = RequestState.RECEIVED;
        }
      }

      console.log(`PERF - addData - ${Date.now() - startTime}ms`);
    }
  },
});

function createSearchFilter(viewName: string, view: ResultsView, preferences: AppPreferencesData): SearchQuery {
  // Build filter for this new search
  const search = parseUserSearchInput(view.text).search;

  view.data.keyset = [];
  view.data.games = {};
  view.data.pages = {};
  view.data.total = undefined;
  view.data.metaState = RequestState.REQUESTED;

  // Merge advanced filter
  if (view.advancedFilter.installed === true || view.advancedFilter.installed === false) {
    const advFilter = parseAdvancedFilter(view.advancedFilter);
    search.filter = mergeGameFilters(search.filter, advFilter);
  }

  switch (view.orderReverse) {
    case 'ASC':
      search.order.direction = GameSearchDirection.ASC;
      break;
    case 'DESC':
      search.order.direction = GameSearchDirection.DESC;
      break;
  }

  switch (view.orderBy) {
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
      if (!search.filter.higherThan.playcount && search.filter.equalTo.playcount === undefined && search.filter.equalTo.playtime === undefined && !view.selectedPlaylist) {
        // When searching outside a playlist, treat playtime sorting like a history
        search.filter.higherThan.playcount = 0;
      }
      search.order.column = GameSearchSortable.LASTPLAYED;
      break;
    case 'playtime':
      if (!search.filter.higherThan.playcount && search.filter.equalTo.playcount === undefined && search.filter.equalTo.playtime === undefined && !view.selectedPlaylist) {
        // When searching outside a playlist, treat playtime sorting like a history
        search.filter.higherThan.playcount = 0;
      }
      search.order.column = GameSearchSortable.PLAYTIME;
      break;
    default:
      search.order.column = GameSearchSortable.TITLE;
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
  if (!view.selectedPlaylist && !search.filter.exactWhitelist.library && view.library) {
    // search.filter.exactWhitelist.library = [view.library];
  }

  // Playlist filter
  if (view.selectedPlaylist) {
    search.customIdOrder = view.selectedPlaylist.games.map(g => g.gameId);
    search.order.column = GameSearchSortable.CUSTOM;
    const inner = deepCopy(search.filter);
    // Cheap, but may be limited by playlist size?
    const playlistFilter = newSubfilter();
    playlistFilter.exactWhitelist.id = view.selectedPlaylist.games.map(g => g.gameId);
    playlistFilter.matchAny = true;
    const newFilter = newSubfilter();
    newFilter.matchAny = false;
    newFilter.subfilters = [inner, playlistFilter];
    search.filter = newFilter;
    console.log(JSON.stringify(search, undefined, 2));
  }

  return {
    ...search,
    viewId: viewName,
    searchId: view.searchFilter.searchId + 1,
    page: 0,
    playlist: view.selectedPlaylist
  };
}

export const { actions: searchActions } = searchSlice;
export const {
  createViews,
  setSearchText,
  selectPlaylist,
  selectGame,
  forceSearch,
  setOrderBy,
  setOrderReverse,
  setAdvancedFilter,
  swapPlaylistGame,
  requestRange,
  updateGame,
  addData } = searchSlice.actions;
export default searchSlice.reducer;
