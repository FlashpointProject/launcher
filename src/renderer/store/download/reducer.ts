import { DownloadStatus } from '@shared/interfaces';
import { Reducer } from 'redux';
import { DownloadStatusActions } from './types';

const initialState: DownloadStatus[] = [];

const reducer: Reducer<DownloadStatus[]> = (state = initialState, action) => {
  switch (action.type) {
    case DownloadStatusActions.SET_DOWNLOAD_STATES: {
      return action.payload;
    }
    case DownloadStatusActions.SET_DOWNLOAD_STATE: {
      const download = action.payload;
      const newState = [...state];
      const idx = newState.findIndex(d => d.reference === download.reference);
      if (idx > -1) {
        newState[idx] = download;
      } else {
        newState.push(download);
      }
      return newState;
    }
    default: {
      return state;
    }
  }
};

export { reducer as downloadStateReducer };

