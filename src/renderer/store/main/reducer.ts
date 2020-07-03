import { rebuildQuery } from '@renderer/Util';
import { createLangContainer } from '@shared/lang';
import { MainActionType, RequestState } from './enums';
import { MainAction, MainState, View, ViewPageStates } from './types';

export function mainStateReducer(state: MainState = createInitialState(), action: MainAction): MainState {
  switch (action.type) {
    default:
      return state;

    case MainActionType.SET_STATE:
      return {
        ...state,
        ...action.payload,
      };

    case MainActionType.SET_VIEW_QUERY: {
      const view = state.views[action.library];

      if (!view) { return state; }

      return {
        ...state,
        views: {
          ...state.views,
          [action.library]: {
            ...view,
            query: rebuildQuery({
              text: action.searchText,
              extreme: action.showExtreme,
              library: action.library,
              playlistId: view.selectedPlaylistId,
              order: {
                orderBy: action.orderBy,
                orderReverse: action.orderReverse,
              },
            }),
            queryId: (view.queryId + 1) % 0x80000000,
            metaState: RequestState.WAITING,
          },
        },
      };
    }

    case MainActionType.SET_VIEW_BOUNDRIES: {
      const view = state.views[action.library];

      if (!view) { return state; }

      const sameBoundries = (view.lastStart === action.start && view.lastCount === action.count);

      if (!view.isDirty && sameBoundries) { return state; } // Optimization, this should never be able to return any pages not already flagged

      // Flag unseen pages that have entered the boundries

      let newPageState: ViewPageStates | undefined;

      const end = action.start + action.count;
      for (let i = action.start; i < end; i++) {
        if (!(i in view.pageState)) {
          if (!newPageState) { newPageState = { ...view.pageState }; }
          newPageState[i] = RequestState.WAITING;
        }
      }

      if (!newPageState && sameBoundries) { return state; } // Nothing has changed

      const newView: View = {
        ...view,
        lastStart: action.start,
        lastCount: action.count,
      };

      if (newPageState) {
        newView.pageState = newPageState;
      }

      return {
        ...state,
        views: {
          ...state.views,
          [action.library]: newView,
        },
      };
    }

    case MainActionType.SET_VIEW_STATE: {
      const view = state.views[action.library];

      if (!view) { return state; }

      return {
        ...state,
        views: {
          ...state.views,
          [action.library]: {
            ...view,
            ...action.state,
          },
        },
      };
    }

    case MainActionType.SET_VIEW_META: {
      const view = state.views[action.library];

      if (!view) { return state; }

      return {
        ...state,
        views: {
          ...state.views,
          [action.library]: {
            ...view,
            meta: {
              pageKeyset: action.keyset,
              total: action.total,
            },
            //
            metaState: RequestState.RECEIVED,
            // Dirty games
            isDirty: true,
            pageState: {},
            // Update total (for the first reponse only)
            total: (view.total === undefined)
              ? action.total
              : view.total,
          },
        },
      };
    }

    case MainActionType.REQUEST_VIEW_PAGES: {
      const view = state.views[action.library];

      if (!view) { return state; }

      let newPageState: ViewPageStates | undefined;

      for (const pageIndex of action.pages) {
        const pageState = view.pageState[pageIndex];
        if (pageState === RequestState.WAITING || pageState === undefined) {
          if (!newPageState) { newPageState = { ...view.pageState }; }
          newPageState[pageIndex] = RequestState.REQUESTED;
        }
      }

      if (!newPageState) { return state; }

      return {
        ...state,
        views: {
          ...state.views,
          [action.library]: {
            ...view,
            pageState: newPageState,
          },
        },
      };
    }

    case MainActionType.ADD_VIEW_PAGES: {
      const view = state.views[action.library];

      if (!view || !view.meta) { return state; }

      const newGames = (view.isDirty) ? {} : { ...view.games };

      for (const range of action.ranges) {
        const length = Math.min(range.games.length, view.meta.total);
        for (let i = 0; i < length; i++) {
          newGames[range.start + i] = range.games[i];
        }
      }

      return {
        ...state,
        views: {
          ...state.views,
          [action.library]: {
            ...view,
            games: newGames,
            isDirty: false,
            total: view.meta.total, // Update dirty total
          },
        },
      };
    }
  }
}

function createInitialState(): MainState {
  return {
    views: {},
    libraries: [],
    serverNames: [],
    mad4fpEnabled: false,
    playlists: [],
    playlistIconCache: {},
    suggestions: {},
    appPaths: {},
    platforms: {},
    loaded: {
      0: false,
      1: false,
      2: false,
    },
    themeList: [],
    gamesTotal: -1,
    randomGames: [],
    requestingRandomGames: false,
    localeCode: 'n',
    upgrades: [],
    gamesDoneLoading: false,
    upgradesDoneLoading: false,
    stopRender: false,
    creditsData: undefined,
    creditsDoneLoading: false,
    gameScale: 1,
    gameLayout: 1,
    lang: createLangContainer(),
    langList: [],
    wasNewGameClicked: false,
    updateInfo: undefined,
    metaEditExporterOpen: false,
    metaEditExporterGameId: '',
  };
}
