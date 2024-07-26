import { FpfssState, FpfssUser } from '@shared/back/types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Game } from 'flashpoint-launcher';

const initialState: FpfssState = {
  user: null,
  editingGame: null,
};

const fpfssSlice = createSlice({
  name: 'fpfss',
  initialState,
  reducers: {
    setUser(state: FpfssState, { payload }: PayloadAction<FpfssUser | null>) {
      state.user = payload;
    },
    setGame(state: FpfssState, { payload }: PayloadAction<Game | null>) {
      state.editingGame = payload;
    },
    applyGameDelta(state: FpfssState, { payload }: PayloadAction<Partial<Game>>) {
      if (state.editingGame) {
        state.editingGame = {
          ...state.editingGame,
          ...payload
        };
      }
    }
  },
});

export const { actions: fpfssActions } = fpfssSlice;
export const {
  setUser,
  setGame,
  applyGameDelta
} = fpfssSlice.actions;
export default fpfssSlice.reducer;
