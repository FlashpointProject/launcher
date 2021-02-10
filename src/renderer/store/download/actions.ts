import { DownloadStatus } from '@shared/interfaces';
import { action } from 'typesafe-actions';
import { DownloadStatusActions } from './types';

export const setDownloadState = (download: DownloadStatus) => action(DownloadStatusActions.SET_DOWNLOAD_STATE, download);
export const setDownloadStore = (downloads: DownloadStatus[]) => action(DownloadStatusActions.SET_DOWNLOAD_STATES, downloads);
