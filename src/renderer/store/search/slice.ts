import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { deepCopy } from '@shared/Util';
import { AdvancedFilter, Game, GameOrderBy, GameOrderReverse, Playlist, StoredView, ViewGame } from 'flashpoint-launcher';
import {
  ElementPosition
} from '@fparchive/flashpoint-archive';
import { BackIn, PageKeyset, SearchQuery } from '@shared/back/types';
import { VIEW_PAGE_SIZE } from '@shared/constants';
import { getDefaultAdvancedFilter, getDefaultGameSearch } from '@shared/search/util';
import { num } from '@shared/utils/Coerce';
import { updatePreferencesData } from '@shared/preferences/util';

export const GENERAL_VIEW_ID = '!general!';

export enum RequestState {
  /** Request is waiting to be made. */
  WAITING,
  /** Request has been made. Waiting for the response to be received. */
  REQUESTED,
  /** Response has been received. */
  RECEIVED,
}

export type MovePlaylistGameData = {
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

export type SearchFilterAction = {
  filter: SearchQuery
};

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

export type SearchCreateViewsAction = {
  views: string[];
  storedViews?: StoredView[];
  areLibraries: boolean;
}

export type SearchDeleteViewAction = {
  view: string;
}

export type SearchRenameViewAction = {
  old: string;
  new: string;
}

const defaultGeneralState: ResultsView = {
  id: GENERAL_VIEW_ID,
  advancedFilter: getDefaultAdvancedFilter(),
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
    ...getDefaultGameSearch(),
    viewId: GENERAL_VIEW_ID,
    searchId: 0,
    page: 0,
  },
  text: '',
  textPositions: [],
};

const initialState: SearchState = {
  views: {
    [GENERAL_VIEW_ID]: {
      ...defaultGeneralState
    }
  }
};

export type RequestKeysetAction = {
  view: string;
  searchId: number;
}

export type ForceSearchAction = {
  view: string;
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

export const forceSearch = createAsyncThunk(
  'search/forceSearch',
  async (payload: ForceSearchAction, { getState, dispatch }) => {
    const state = getState() as { search: SearchState };
    const view = state.search.views[payload.view];

    const filter = await window.Shared.back.request(BackIn.PARSE_QUERY_DATA, {
      viewId: payload.view,
      searchId: view.data.searchId + 1,
      text: view.text,
      advancedFilter: view.advancedFilter,
      orderBy: view.orderBy,
      orderDirection: view.orderReverse,
      playlist: view.selectedPlaylist
    });

    dispatch(setFilter({ filter }));
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    addViews(state: SearchState, { payload }: PayloadAction<SearchCreateViewsAction>) {
      for (const view of payload.views) {
        if (state.views[view]) {
          // Exists, skip
        } else {
          state.views[view] = {
            id: view,
            advancedFilter: getDefaultAdvancedFilter(),
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
              ...getDefaultGameSearch(),
              viewId: view,
              searchId: 0,
              page: 0,
            },
            text: '',
            textPositions: [],
          };
        }
      }

      if (payload.storedViews) {
        for (const storedView of payload.storedViews) {
          const view = state.views[storedView.view];
          if (view) {
            view.text = storedView.text;
            view.advancedFilter = storedView.advancedFilter;
            view.orderBy = storedView.orderBy;
            view.orderReverse = storedView.orderReverse;
          }
        }
      }
    },
    deleteView(state: SearchState, { payload }: PayloadAction<SearchDeleteViewAction>) {
      if (state.views[payload.view]) {
        delete state.views[payload.view];
      }
      const customViews = window.Shared.preferences.data.customViews;
      if (customViews.filter(c => c !== payload.view).length === 0) {
        customViews.push('Browse');
        setTimeout(() => updatePreferencesData({
          customViews,
        }), 100);
      }
      if (Object.keys(state.views).length === 1) {
        // If we have no more browse views, add Browse
        const view = 'Browse';
        state.views[view] = {
          id: view,
          advancedFilter: getDefaultAdvancedFilter(),
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
            ...getDefaultGameSearch(),
            viewId: view,
            searchId: 0,
            page: 0,
          },
          text: '',
          textPositions: [],
        };
      }
    },
    renameView(state: SearchState, { payload }: PayloadAction<SearchRenameViewAction>) {
      if (state.views[payload.old]) {
        state.views[payload.new] = state.views[payload.old];
        state.views[payload.new].id = payload.new;
        delete state.views[payload.old];
      }
    },
    createViews(state: SearchState, { payload }: PayloadAction<SearchCreateViewsAction>) {
      console.log(`Creating views for: ${payload}`);
      const generalState = state.views[GENERAL_VIEW_ID];
      // Clear existing views except general
      state.views = {
        [GENERAL_VIEW_ID]: generalState
      };
      for (const view of payload.views) {
        if (!state.views[view]) {
          state.views[view] = {
            id: view,
            advancedFilter: getDefaultAdvancedFilter(payload.areLibraries ? view : undefined),
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
              ...getDefaultGameSearch(),
              viewId: view,
              searchId: 0,
              page: 0,
            },
            text: '',
            textPositions: [],
          };
        }
      }

      if (payload.storedViews) {
        for (const storedView of payload.storedViews) {
          const view = state.views[storedView.view];
          if (view) {
            view.text = storedView.text;
            view.advancedFilter = storedView.advancedFilter;
            view.orderBy = storedView.orderBy;
            view.orderReverse = storedView.orderReverse;
          }
        }
      }
    },
    setSearchText(state: SearchState, { payload }: PayloadAction<SearchSetTextAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.text = payload.text;
      }
    },
    selectPlaylist(state: SearchState, { payload }: PayloadAction<SearchSetPlaylistAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.selectedPlaylist = payload.playlist ? deepCopy(payload.playlist) : undefined;
      }
    },
    selectGame(state: SearchState, { payload }: PayloadAction<SearchSetGameAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.selectedGame = payload.game ? deepCopy(payload.game) : undefined;
      }
    },
    setFilter(state: SearchState, { payload }: PayloadAction<SearchFilterAction>) {
      const { filter } = payload;
      const view = state.views[filter.viewId];
      if (view) {
        if (view.searchFilter.searchId < payload.filter.searchId) {
          view.searchFilter = payload.filter;
          view.data.keyset = [];
          view.data.games = {};
          view.data.pages = {};
          view.data.total = undefined;
          view.data.metaState = RequestState.REQUESTED;
        }
      }
    },
    setOrderBy(state: SearchState, { payload }: PayloadAction<SearchOrderByAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.orderBy = payload.value;
      }
    },
    setOrderReverse(state: SearchState, { payload }: PayloadAction<SearchOrderReverseAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.orderReverse = payload.value;
      }
    },
    setAdvancedFilter(state: SearchState, { payload }: PayloadAction<SearchAdvancedFilterAction>) {
      const view = state.views[payload.view];
      if (view) {
        view.advancedFilter = payload.filter;
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
    movePlaylistGame(state: SearchState, { payload }: PayloadAction<MovePlaylistGameData>) {
      const view = state.views[payload.view];
      const { sourceGameId, destGameId } = payload;

      if (view && view.selectedPlaylist) {
        const sourceIdx = view.selectedPlaylist.games.findIndex(g => g.gameId === sourceGameId);
        const destIdx = view.selectedPlaylist.games.findIndex(g => g.gameId === destGameId);
        if (sourceIdx > -1 && destIdx > -1) {
          // Remove existing source game
          const sourceGame = view.selectedPlaylist.games.splice(sourceIdx, 1)[0];
          if (sourceIdx < destIdx) {
            const destIdx = view.selectedPlaylist.games.findIndex(g => g.gameId === destGameId);
            if (destIdx < view.selectedPlaylist.games.length) {
              view.selectedPlaylist.games.splice(destIdx + 1, 0, sourceGame);
            } else {
              view.selectedPlaylist.games.push(sourceGame);
            }
          } else {
            const destIdx = view.selectedPlaylist.games.findIndex(g => g.gameId === destGameId);
            view.selectedPlaylist.games.splice(destIdx, 0, sourceGame);
          }



          // Try and move them in the results view
          const games = Object.entries(view.data.games).map<GameRecordsArray>(([key, value]) => [Number(key), value]);
          const sourceGameEntry = games.find((g) => g[1].id === sourceGameId);
          const destGameEntry = games.find((g) => g[1].id === destGameId);
          if (sourceGameEntry && destGameEntry) {
            const sourceIndex = games.indexOf(sourceGameEntry);
            const destIndex = games.indexOf(destGameEntry);
            if (sourceIdx < destIndex) {
              games[sourceIndex][0] = games[destIndex][0];
              // Moving down (Shift games between up)
              for (let i = sourceIdx + 1; i < destIndex + 1; i++) {
                games[i][0]--;
              }
            } else {
              games[sourceIndex][0] = games[destIndex][0];
              // Moving up (Shift games between down)
              for (let i = destIndex; i < sourceIndex; i++) {
                games[i][0]++;
              }
            }
          }
          view.data.games = Object.fromEntries(games);

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

type GameRecordsArray = [number, Game];

export const { actions: searchActions } = searchSlice;
export const {
  addViews,
  deleteView,
  createViews,
  renameView,
  setSearchText,
  selectPlaylist,
  selectGame,
  setFilter,
  setOrderBy,
  setOrderReverse,
  setAdvancedFilter,
  movePlaylistGame,
  requestRange,
  updateGame,
  addData } = searchSlice.actions;
export default searchSlice.reducer;
