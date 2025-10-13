import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ILogEntry } from 'flashpoint-launcher';

export type LogsState = {
  offset: number;
  longestSource: number;
  entries: ILogEntry[];
}

const initialState: LogsState = {
  offset: 0,
  longestSource: 20,
  entries: []
};

type AddLogEntryAction = {
  entry: ILogEntry,
  index: number
}

const logsSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {
    setEntries(state: LogsState, { payload }: PayloadAction<ILogEntry[]>) {
      state.entries = payload;
      state.longestSource = payload.reduce((prev, cur) => Math.max(cur.source.length, prev), 0);
    },
    addLogEntries(state: LogsState, { payload }: PayloadAction<ILogEntry[]>) {
      for (const log of payload) {
        if (log.source.length > state.longestSource) {
          state.longestSource = log.source.length;
        }
      }
      state.entries = state.entries.concat(payload);
    },
    addLogEntry(state: LogsState, { payload }: PayloadAction<AddLogEntryAction>) {
      if (payload.entry.source.length > state.longestSource) {
        state.longestSource = payload.entry.source.length;
      }
      state.entries[payload.index - state.offset] = payload.entry;
    },
    clearLogs(state: LogsState) {
      state.entries = [];
      state.longestSource = 20;
    }
  }
});

export const { actions: logsActions } = logsSlice;
export const {
  clearLogs
} = logsSlice.actions;
export default logsSlice.reducer;
