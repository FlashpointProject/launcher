import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fpfssLogin } from '@renderer/fpfss';
import { axios } from '@renderer/Util';
import { BackIn, FpfssState, FpfssUser } from '@shared/back/types';
import { getDefaultAdvancedFilter, getDefaultGameSearch } from '@shared/search/util';
import { mapFpfssGameToLocal, mapLocalToFpfssGame } from '@shared/Util';
import { Game, GameMetadataSource, ResultsView } from 'flashpoint-launcher';
import { toast } from 'react-toastify';
import { addFpfssView, deleteView, RequestState } from '../search/slice';
import { AppDispatch, RootState } from '../store';

const initialState: FpfssState = {
  users: {},
  user: null,
  tagsSynced: false,
};

export type PerformFpfssActionPayload = {
  source: GameMetadataSource;
  cb: (source: GameMetadataSource, user: FpfssUser) => Promise<any>
}

export type FpfssUserPayload = {
  sourceId: string;
  user?: FpfssUser;
}

export const performFpfssAction = createAsyncThunk(
  'fpfss/performFpfssAction',
  async ({ source, cb }: PerformFpfssActionPayload, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const currentUser = state.fpfss.users[source.id];

    try {
      if (currentUser) {
        // Logged in, pass user
        return cb(source, currentUser);
      } else {
        // Need to login first
        const user = await fpfssLogin((dispatch as AppDispatch), source)
        .catch((error) => {
          throw `Login failed - ${error}`;
        });
        dispatch(setFpfssUser({
          sourceId: source.id,
          user
        }));
        return cb(source, user);
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

    if (viewName in state.search.views) {
      const toastId = toast('Submitting FPFSS edit...', {
        delay: 200,
        autoClose: false,
        closeButton: false,
      });
      try {
        const game = state.search.views[viewName].editingGame as Game;
        const source = state.preferences.gameMetadataSources.find(s => s.id === game.owner);
        if (!source) {
          alert('no owner? ' + game.owner);
          throw 'No source associated with fpfss edit';
        }
        await dispatch(performFpfssAction({
          source: source,
          cb: async (source, user) => {
            const url = `${source.fpfssUrl}/api/game/${game.id}`;
            const res = await axios.post(url, mapLocalToFpfssGame(game), {
              headers: {
                Authorization: `Bearer ${user.accessToken}`
              }
            });

            if (res.status >= 400) {
              throw res.statusText;
            }
          }
        })).unwrap();

        window.Shared.back.send(BackIn.UPDATE_GAME_FROM_SOURCE, game.id);
        dispatch(deleteView({ view: viewName }));

        toast.update(toastId, { type: 'success', autoClose: 3000, render: <div>FPFSS Game Edit Successful</div> });
      } catch (error) {
        toast.update(toastId, { type: 'error', closeButton: true, render: <div>FPFSS Game Edit Failure - {`${error}`}</div> });
        rejectWithValue(`FPFSS Game Save Failure - ${error}`);
      }
    } else {
      rejectWithValue('No edit open on this view?');
    }
  }
);

export type CreateFpfssEditGamePayload = {
  sourceId: string;
  gameId: string;
}

export const createFpfssEditGame = createAsyncThunk(
  'fpfss/createFpfssEditGame',
  async ({ gameId, sourceId }: CreateFpfssEditGamePayload, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const source = state.preferences.gameMetadataSources.find(s => s.id === sourceId);
    if (!source) {
      throw 'No fpfss associated with this game owner';
    }
    const viewId = '!fpfss-' + gameId;
    if (viewId in state.search.views) {
      return rejectWithValue('Game edit already open!');
    }
    const { gameMetadataSources } = state.preferences;

    if (gameMetadataSources.length === 0) {
      alert('No metadata sources in preferences.json, aborting remote edit');
      return;
    }
    if (!state.fpfss.tagsSynced) {
      const source = gameMetadataSources[0];
      await window.Shared.back.request(BackIn.SYNC_TAGGED, source);
    }

    const view = await dispatch(performFpfssAction({
      source,
      cb: async (source, user) => {
        const gameUrl = `${source.fpfssUrl}/api/game/${gameId}`;
        const res = await axios.get(gameUrl, {
          headers: {
            Authorization: `Bearer ${user.accessToken}`
          }
        });
        if (res.status >= 400) {
          throw res.statusText;
        }
        const game = mapFpfssGameToLocal(res.data, source.id);

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
      } })).unwrap();

    dispatch(addFpfssView(view));

    return view;
  }
);

export const logoutFpfss = createAsyncThunk(
  'fpfss/logoutFpfss',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    for (const sourceId in state.fpfss.users) {
      const source = state.preferences.gameMetadataSources.find(s => s.id === sourceId);
      const user = state.fpfss.users[sourceId];
      if (user && source) {
        const logoutUrl = `${source.fpfssUrl}/api/logout`;
        const res = await axios.get(logoutUrl, {
          headers: {
            Authorization: `Bearer ${user.accessToken}`
          }
        });
        if (res.status >= 400) {
          rejectWithValue(`Logout failed - ${res.statusText}`);
        }
      }
    }

    return { success: true };
  }
);

const fpfssSlice = createSlice({
  name: 'fpfss',
  initialState,
  reducers: {
    setFpfssUser(state: FpfssState, { payload }: PayloadAction<FpfssUserPayload>) {
      state.users[payload.sourceId] = payload.user;
      const userBase64 = Buffer.from(JSON.stringify(state.users, null, 0)).toString('base64');
      localStorage.setItem('fpfss_users', userBase64);
    }
  },
  extraReducers: (builder) => {
    builder.addCase(logoutFpfss.fulfilled, (state) => {
      console.log('mark logged out');
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
