import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BackIn } from '@shared/back/types';
import { DownloaderState, DownloaderStatus, DownloadTask, DownloadTaskStatus, DownloadWorkerState } from 'flashpoint-launcher';
import { toast } from 'react-toastify';

export type DownloadsState = DownloaderState;

const initialState: DownloadsState = {
  state: 'stopped',
  workers: [],
  tasks: {},
};

export type UpdateDownloaderTaskAction = DownloadTask;

export type UpdateDownloaderStateAction = DownloaderStatus;

export type UpdateDownloadWorkerAction = DownloadWorkerState;

const finishStates: DownloadTaskStatus[] = ['success', 'failure'];

function updateToast(state: DownloaderState) {
  const toastOpen = toast.isActive('downloader');
  const tasks = Object.values(state.tasks);
  const totalFinished = tasks.reduce((prev, cur) => prev + (finishStates.includes(cur.status) ? 1 : 0), 0);
  if (tasks.length === 0) {
    return;
  }
  if (state.state === 'stopped' && !toastOpen) {
    return;
  }
  if (state.state === 'running' && tasks.length === totalFinished && !toastOpen) {
    return;
  }
  if (totalFinished !== tasks.length) {
    console.log(totalFinished / tasks.length);
    if (toastOpen) {
      toast.update('downloader', {
        render: `Downloading: ${totalFinished} of ${tasks.length}`,
        type: 'default',
        progress: totalFinished / tasks.length,
      });
    } else {
      toast(`Downloading: ${totalFinished} of ${tasks.length}`, {
        toastId: 'downloader',
        progress: totalFinished / tasks.length,
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
    updateDownloaderTask(state: DownloadsState, { payload }: PayloadAction<UpdateDownloaderTaskAction>) {
      state.tasks[payload.game.id] = payload;
      updateToast(state);
    },
    updateDownloaderTasks(state: DownloadsState, { payload }: PayloadAction<DownloadTask[]>) {
      for (const task of payload) {
        state.tasks[task.game.id] = task;
      }
      updateToast(state);
    },
    updateDownloaderStatus(state: DownloadsState, { payload }: PayloadAction<UpdateDownloaderStateAction>) {
      if (state.state !== payload) {
        state.state = payload;
        updateToast(state);
      } else {
        state.state = payload;
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
  updateDownloaderTask,
  updateDownloaderTasks,
  updateDownloaderWorker,
  setDownloaderState,
  setStatus
} = downloadsActions;
export default downloadsSlice.reducer;
