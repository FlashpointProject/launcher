import { BackIn, FpfssState, FpfssUser } from '@shared/back/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Game, ResultsView } from 'flashpoint-launcher';
import { AppDispatch, RootState } from '../store';
import { axios } from '@renderer/Util';
import { mapFpfssGameToLocal, mapLocalToFpfssGame } from '@shared/Util';
import { addFpfssView, deleteView, RequestState, updateGame } from '../search/slice';
import { getDefaultAdvancedFilter, getDefaultGameSearch } from '@shared/search/util';
import { fpfssLogin } from '@renderer/fpfss';

const initialState: FpfssState = {
  user: null,
  tagsSynced: false,
};

export const performFpfssAction = createAsyncThunk(
  'fpfss/performFpfssAction',
  async (cb: (user: FpfssUser) => Promise<any>, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const currentUser = state.fpfss.user;

    try {
      if (currentUser) {
        // Logged in, pass user
        return cb(currentUser);
      } else {
        // Need to login first
        const user = await fpfssLogin((dispatch as AppDispatch), state.preferences.fpfssBaseUrl)
        .catch((error) => {
          throw `Login failed - ${error}`;
        });
        dispatch(setFpfssUser(user));
        return cb(user);
      }
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const saveFpfssEdit = createAsyncThunk(
  'fpfss/saveFpfssEdit',
  async (viewName: string, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const fpfssBaseUrl = state.preferences.fpfssBaseUrl;

    if (viewName in state.search.views) {
      try {
        const game = state.search.views[viewName].editingGame as Game;
        const url = `${fpfssBaseUrl}/api/game/${game.id}`;

        await dispatch(performFpfssAction(async (user) => {
          const res = await axios.post(url, mapLocalToFpfssGame(game), {
            headers: {
              Authorization: `Bearer ${user.accessToken}`
            }
          });

          if (res.status >= 400) {
            throw res.statusText;
          }
        })).unwrap();

        dispatch(updateGame(game));
        dispatch(deleteView({ view: viewName }));
      } catch (error) {
        rejectWithValue(`FPFSS Game Save Failure - ${error}`);
      }
    } else {
      rejectWithValue('No edit open on this view?');
    }
  }
);

export const createFpfssEditGame = createAsyncThunk(
  'fpfss/createFpfssEditGame',
  async (gameId: string, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const viewId = '!fpfss-' + gameId;
    if (viewId in state.search.views) {
      return rejectWithValue('Game edit already open!');
    }
    const { fpfssBaseUrl, gameMetadataSources } = state.preferences;
    const gameUrl = `${fpfssBaseUrl}/api/game/${gameId}`;

    if (gameMetadataSources.length === 0) {
      alert('No metadata sources in preferences.json, aborting remote edit');
      return;
    }
    if (!state.fpfss.tagsSynced) {
      const source = gameMetadataSources[0];
      await window.Shared.back.request(BackIn.SYNC_TAGGED, source);
    }

    const view = await dispatch(performFpfssAction(async (user: FpfssUser) => {
      const res = await axios.get(gameUrl, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`
        }
      });
      if (res.status >= 400) {
        throw res.statusText;
      }
      const game = mapFpfssGameToLocal(res.data);

      // Create a new view for the game
      const newView: ResultsView<Game> = {
        id: viewId,
        advancedFilter: getDefaultAdvancedFilter(),
        data: {
          searchId: 0,
          keyset: [],
          content: [],
          pages: {},
          metaState: RequestState.WAITING,
        },
        loaded: false,
        expanded: true,
        orderBy: 'title',
        orderReverse: 'ASC',
        extOrder: {
          extId: '',
          key: '',
          default: ''
        },
        searchFilter: {
          ...getDefaultGameSearch(),
          viewId: viewId,
          searchId: 0,
          page: 0,
        },
        text: '',
        textPositions: [],
        isEditing: true,
        isCustom: true,
        selectedGame: game,
        editingGame: game,
      };

      return newView;
    })).unwrap();

    dispatch(addFpfssView(view));

    return view;
  }
);

export const logoutFpfss = createAsyncThunk(
  'fpfss/logoutFpfss',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const user = state.fpfss.user;
    if (user === null) {
      // Already logged out
      return;
    }
    const fpfssBaseUrl = state.preferences.fpfssBaseUrl;
    const logoutUrl = `${fpfssBaseUrl}/api/logout`;

    const res = await axios.get(logoutUrl, {
      headers: {
        Authorization: `Bearer ${user.accessToken}`
      }
    });
    if (res.status >= 400) {
      rejectWithValue(`Logout failed - ${res.statusText}`);
    }

    return { success: true };
  }
);

const fpfssSlice = createSlice({
  name: 'fpfss',
  initialState,
  reducers: {
    setFpfssUser(state: FpfssState, { payload }: PayloadAction<FpfssUser | null>) {
      state.user = payload;
      const userBase64 = Buffer.from(JSON.stringify(payload, null, 0)).toString('base64');
      localStorage.setItem('fpfss_user', userBase64);
    }
  },
  extraReducers: (builder) => {
    builder.addCase(logoutFpfss.fulfilled, (state) => {
      state.user = null;
    });
    builder.addCase(createFpfssEditGame.fulfilled, (state) => {
      state.tagsSynced = true;
    });
  }
});

export const { actions: fpfssActions } = fpfssSlice;
export const {
  setFpfssUser,
} = fpfssSlice.actions;
export default fpfssSlice.reducer;
