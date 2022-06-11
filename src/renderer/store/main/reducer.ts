import { FplMessageBoxProps } from '@shared/FplMessageBoxProps';
import { rebuildQuery } from '@renderer/Util';
import { BackIn } from '@shared/back/types';
import { createLangContainer } from '@shared/lang';
import { MainActionType, RequestState } from './enums';
import { MainAction, MainState, View, ViewPageStates } from './types';

export const RANDOM_GAME_ROW_COUNT = 6;

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

      const playlistId = (action.playlistId !== null)
        ? action.playlistId
        : view.query.filter.playlistId;

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
              searchLimit: action.searchLimit,
              playlistId: playlistId,
              order: {
                orderBy: action.orderBy,
                orderReverse: action.orderReverse,
              },
              tagFilters: playlistId ? [] : action.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !action.showExtreme))
            }),
            queryId: (view.queryId + 1) % 0x80000000, // 32 bit signed integer
            metaState: RequestState.WAITING,
            tagFilters: action.tagFilters
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

    case MainActionType.REQUEST_VIEW_META: {
      const view = state.views[action.library];

      if (!view || action.queryId !== view.queryId) { return state; }

      return {
        ...state,
        views: {
          ...state.views,
          [action.library]: {
            ...view,
            metaState: RequestState.REQUESTED,
          },
        },
      };
    }

    case MainActionType.SET_VIEW_META: {
      const view = state.views[action.library];

      if (!view || action.queryId !== view.queryId) { return state; }

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
            // Update total (for the first response only)
            total: (view.total === undefined)
              ? action.total
              : view.total,
          },
        },
      };
    }

    case MainActionType.REQUEST_VIEW_PAGES: {
      const view = state.views[action.library];

      if (!view || action.queryId !== view.queryId) { return state; }

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

      if (!view || !view.meta || action.queryId !== view.queryId) { return state; }

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

    case MainActionType.SET_VIEW_SELECTED_GAME: {
      const view = state.views[action.library];

      if (!view) { return state; }

      return {
        ...state,
        views: {
          ...state.views,
          [action.library]: {
            ...view,
            selectedGameId: action.gameId,
          },
        },
      };
    }

    case MainActionType.SET_CREDITS: {
      return {
        ...state,
        creditsDoneLoading: true,
        creditsData: action.creditsData,
      };
    }

    case MainActionType.STOP_RENDER: {
      return {
        ...state,
        stopRender: true,
      };
    }

    case MainActionType.OPEN_META_EXPORTER: {
      return {
        ...state,
        metaEditExporterOpen: true,
        metaEditExporterGameId: action.gameId,
      };
    }

    case MainActionType.CLOSE_META_EXPORTER: {
      return {
        ...state,
        metaEditExporterOpen: false,
      };
    }

    case MainActionType.ADD_LOADED: {
      const nextLoaded = { ...state.loaded };

      for (const key of action.loaded) {
        nextLoaded[key] = true;
      }

      return {
        ...state,
        loaded: nextLoaded,
      };
    }

    case MainActionType.SET_GAMES_TOTAL: {
      return {
        ...state,
        gamesTotal: action.total,
      };
    }

    case MainActionType.SET_SUGGESTIONS: {
      return {
        ...state,
        suggestions: action.suggestions,
        appPaths: action.appPaths,
      };
    }

    case MainActionType.SET_LOCALE: {
      return {
        ...state,
        localeCode: action.localeCode,
      };
    }

    case MainActionType.SET_LANGUAGE: {
      return {
        ...state,
        lang: action.lang,
      };
    }

    case MainActionType.SET_LANGUAGE_LIST: {
      return {
        ...state,
        langList: action.langList,
      };
    }

    case MainActionType.SET_THEME_LIST: {
      return {
        ...state,
        themeList: action.themeList,
      };
    }

    case MainActionType.SET_PLAYLISTS: {
      return {
        ...state,
        playlists: action.playlists,
      };
    }

    case MainActionType.SET_UPGRADES: {
      return {
        ...state,
        upgrades: action.upgrades,
        upgradesDoneLoading: true,
      };
    }

    case MainActionType.SET_UPDATE_INFO: {
      return {
        ...state,
        updateInfo: action.updateInfo,
      };
    }

    case MainActionType.CLICK_NEW_GAME: {
      return {
        ...state,
        wasNewGameClicked: true,
      };
    }

    case MainActionType.CLICK_NEW_GAME_END: {
      return {
        ...state,
        wasNewGameClicked: false,
      };
    }

    case MainActionType.SHIFT_RANDOM_GAMES: {
      if (state.randomGames.length >= (RANDOM_GAME_ROW_COUNT * 2)) {
        return {
          ...state,
          randomGames: state.randomGames.slice(RANDOM_GAME_ROW_COUNT),
        };
      } else {
        return {
          ...state,
          shiftRandomGames: true,
        };
      }
    }

    case MainActionType.REQUEST_RANDOM_GAMES: {
      return {
        ...state,
        requestingRandomGames: true,
      };
    }

    case MainActionType.RESPONSE_RANDOM_GAMES: {
      return {
        ...state,
        randomGames: [
          ...(
            state.shiftRandomGames
              ? state.randomGames.slice(RANDOM_GAME_ROW_COUNT)
              : state.randomGames
          ),
          ...action.games,
        ],
        requestingRandomGames: false,
        shiftRandomGames: false,
        gamesDoneLoading: true,
      };
    }

    case MainActionType.CLEAR_RANDOM_GAMES: {
      return {
        ...state,
        randomGames: [],
      };
    }

    case MainActionType.INCREMENT_LOGO_VERSION: {
      return {
        ...state,
        logoVersion: state.logoVersion + 1
      };
    }

    case MainActionType.CREATE_MESSAGE_BOX: {
      const newBoxes = [...state.messageBoxes];
      newBoxes.push(action.props);
      return {
        ...state,
        messageBoxes: newBoxes
      };
    }

    case MainActionType.CREATE_MESSAGE_BOX_EXTERNAL: {
      const newBoxes = [...state.messageBoxes];
      const newProps: FplMessageBoxProps = {
        ...action.props,
        onConfirm: (button, prompts) => {
          const jsonStates = JSON.stringify(Array.from(prompts.entries()));
          window.Shared.back.send(BackIn.MESSAGE_BOX_RESPONSE, action.props.notificationId, button, jsonStates);
        }
      };
      newBoxes.push(newProps);
      return {
        ...state,
        messageBoxes: newBoxes
      };
    }

    case MainActionType.COMPLETED_MESSAGE_BOX: {
      return {
        ...state,
        messageBoxes: state.messageBoxes.length > 1 ? state.messageBoxes.slice(1) : []
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
    logoSets: [],
    logoVersion: 0,
    gamesTotal: -1,
    randomGames: [],
    requestingRandomGames: false,
    shiftRandomGames: false,
    localeCode: 'en-us',
    devConsole: '',
    upgrades: [],
    gamesDoneLoading: false,
    upgradesDoneLoading: false,
    stopRender: false,
    creditsData: undefined,
    creditsDoneLoading: false,
    lang: createLangContainer(),
    langList: [],
    wasNewGameClicked: false,
    updateInfo: undefined,
    metaEditExporterOpen: false,
    metaEditExporterGameId: '',
    extensions: [],
    extConfig: {},
    extConfigs: [],
    devScripts: [],
    contextButtons: [],
    services: [],
    downloadOpen: false,
    downloadPercent: 0,
    downloadSize: 0,
    downloadVerifying: false,
    messageBoxes: []
  };
}
