import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BackIn } from '@shared/back/types';
import { DownloaderState, DownloaderStatus, DownloaderStatusUpdate, DownloadTask, DownloadWorkerState } from 'flashpoint-launcher';
import { toast } from 'react-toastify';

export type DownloadsState = DownloaderState;

const initialState: DownloadsState = {
  state: 'stopped',
  workers: [],
  total: 0,
  done: 0,
  failures: 0,
};

export type UpdateDownloaderTaskAction = DownloadTask;

export type UpdateDownloaderStateAction = DownloaderStatusUpdate;

export type UpdateDownloadWorkerAction = DownloadWorkerState;

function updateToast(state: DownloaderState) {
  const toastOpen = toast.isActive('downloader');
  if (state.total === 0) {
    return;
  }
  if (state.state === 'stopped' && !toastOpen) {
    return;
  }
  if (state.state === 'running' && state.total === state.total && !toastOpen) {
    return;
  }
  if (state.done !== state.total) {
    console.log(state.done / state.total);
    if (toastOpen) {
      toast.update('downloader', {
        render: `Downloading: ${state.done} of ${state.total}`,
        type: 'default',
        progress: state.done / state.total,
      });
    } else {
      toast(`Downloading: ${state.done} of ${state.total}`, {
        toastId: 'downloader',
        progress: state.done / state.total,
        autoClose: false,
        closeButton: false,
      });
    }
  } else {
    if (toastOpen) {
      toast.update('downloader', {
        render: <div>Download Complete!</div>,
        type: 'success',
        progress: 0.5,
        autoClose: false,
        closeButton: true,
      });
    } else {
      toast(<div>Download Complete!</div>, {
        toastId: 'downloader',
        type: 'success',
        progress: 1,
        autoClose: false,
        closeButton: true,
      });
    }
  }
}

const downloadsSlice = createSlice({
  name: 'downloads',
  initialState,
  reducers: {
    updateDownloaderStatus(state: DownloadsState, { payload }: PayloadAction<UpdateDownloaderStateAction>) {
      state.total = payload.total;
      state.done = payload.done;
      state.failures = payload.failures;

      if (state.state !== payload.status) {
        state.state = payload.status;
        updateToast(state);
      } else {
        state.state = payload.status;
      }
    },
    updateDownloaderWorker(state: DownloadsState, { payload }: PayloadAction<UpdateDownloadWorkerAction>) {
      const workerIdx = state.workers.findIndex(w => w.id === payload.id);
      if (workerIdx > -1) {
        state.workers[workerIdx] = payload;
      } else {
        state.workers.push(payload);
      }
    },
    setDownloaderState(state: DownloadsState, { payload }: PayloadAction<DownloadsState>) {
      updateToast(payload);
      return payload;
    },
    setStatus(state: DownloadsState, { payload }: PayloadAction<DownloaderStatus>) {
      window.Shared.back.send(BackIn.DOWNLOADER_SET_STATUS, payload);
    }
  }
});

export const { actions: downloadsActions } = downloadsSlice;
export const {
  updateDownloaderStatus,
  updateDownloaderWorker,
  setDownloaderState,
  setStatus
} = downloadsActions;
export default downloadsSlice.reducer;
