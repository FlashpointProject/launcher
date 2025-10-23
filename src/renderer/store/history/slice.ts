import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getViewName } from '@renderer/Util';
import { Paths } from '@shared/Paths';
import { Location } from 'react-router-dom';
import { RootState } from '../store';

export type HistoryState = {
  history: Location[];
  maxHistorySize: number;
}

const initialState: HistoryState = {
  history: [],
  maxHistorySize: 25
};

export const getLastValidPage = createAsyncThunk(
  'history/getLastValidPage',
  async (value: never, { getState }) => {
    const state = getState() as RootState;

    // Find last valid page to navigate away to
    let validLoc: Location | undefined = undefined;
    const viewKeys = Object.keys(state.search.views);
    for (let i = state.history.history.length - 2; i >= 0; i--) {
      const loc = state.history.history[i];
      if (loc.pathname.startsWith(Paths.FPFSS)) {
        // Make sure it's still a valid view
        const view = getViewName(loc.pathname);
        if (viewKeys.includes(view)) {
          validLoc = loc;
          break;
        }
      } else {
        validLoc = loc;
        break;
      }
    }

    return validLoc;
  }
);

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    pushHistory(state: HistoryState, { payload }: PayloadAction<Location>) {
      // Avoid duplicate consecutive entries
      const lastLocation = state.history[state.history.length - 1];
      if (lastLocation &&
          lastLocation.pathname === payload.pathname &&
          lastLocation.search === payload.search) {
        return;
      }

      // Add new location to history
      state.history.push(payload);

      // Maintain max history size by removing oldest entries
      if (state.history.length > state.maxHistorySize) {
        state.history.shift();
      }
    },
    clearHistory(state: HistoryState) {
      state.history = [];
    },
    removeLastEntry(state: HistoryState) {
      if (state.history.length > 0) {
        state.history.pop();
      }
    }
  }
});

export const { pushHistory, clearHistory, removeLastEntry } = historySlice.actions;
export default historySlice.reducer;
