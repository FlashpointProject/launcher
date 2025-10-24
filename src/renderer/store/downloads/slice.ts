import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BackIn } from '@shared/back/types';
import { DownloaderState, DownloaderStatus, DownloadTask, DownloadWorkerState } from 'flashpoint-launcher';

export type DownloadsState = DownloaderState;

const initialState: DownloadsState = {
  state: 'stopped',
  workers: [],
  tasks: {}
};

export type UpdateDownloaderTaskAction = DownloadTask;

export type UpdateDownloaderStateAction = DownloaderStatus;

export type UpdateDownloadWorkerAction = DownloadWorkerState;

const downloadsSlice = createSlice({
  name: 'downloads',
  initialState,
  reducers: {
    updateDownloaderTask(state: DownloadsState, { payload }: PayloadAction<UpdateDownloaderTaskAction>) {
      state.tasks[payload.game.id] = payload;
    },
    updateDownloaderTasks(state: DownloadsState, { payload }: PayloadAction<DownloadTask[]>) {
      for (const task of payload) {
        state.tasks[task.game.id] = task;
      }
    },
    updateDownloaderStatus(state: DownloadsState, { payload }: PayloadAction<UpdateDownloaderStateAction>) {
      state.state = payload;
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
  updateDownloaderTask,
  updateDownloaderTasks,
  updateDownloaderWorker,
  setDownloaderState,
  setStatus
} = downloadsActions;
export default downloadsSlice.reducer;
