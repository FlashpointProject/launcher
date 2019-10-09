import { ipcRenderer } from 'electron';
import { EventEmitter } from 'events';
import * as path from 'path';
import { deepCopy } from '../Util';
import { IAppConfigApiFetchData, IAppConfigData } from './interfaces';

export interface AppConfigApi {
  /** Emitted when the API is done initializing. */
  on(event: 'init', listener: () => void): this;
  /** Emitted when the API is done initializing. */
  once(event: 'init', listener: () => void): this;
}

/**
 * "Front end" part of the API for managing config data.
 * This exposes the API methods and data to the renderer process, and communicates
 * with the API on the main process through IPC.
 */
export class AppConfigApi extends EventEmitter {
  private _data?: IAppConfigData;
  private _fullFlashpointPath?: string;
  private _fullJsonFolderPath?: string;
  /** If this has been initialized. */
  private _isInit: boolean = false;
  /** If this has sent config data to the main process, and is waiting for a response. */
  private _isSending: boolean = false;

  /** Current config data. This can only be changed between sessions. */
  public get data(): IAppConfigData {
    if (this._data === undefined) {
      throw createAccessError('data');
    }
    return this._data;
  }

  /** Full path of the Flashpoint folder. */
  public get fullFlashpointPath(): string {
    if (this._fullFlashpointPath === undefined) {
      throw createAccessError('fullFlashpointPath');
    }
    return this._fullFlashpointPath;
  }

  /** Full path of the JSON folder. */
  public get fullJsonFolderPath(): string {
    if (this._fullJsonFolderPath === undefined) {
      throw createAccessError('fullJsonFolderPath');
    }
    return this._fullJsonFolderPath;
  }

  /** Initialize the API. */
  public async initialize(): Promise<void> {
    if (this._isInit) { throw new Error('You can only initialize this once'); }
    // Fetch initial config data from the main process
    const data = await this.fetch();
    // Keep data
    this._data = deepCopy(data.data);
    this._fullFlashpointPath = data.fullFlashpointPath;
    this._fullJsonFolderPath = path.posix.join(
      data.fullFlashpointPath,
      data.data.jsonFolderPath
    );
    // Done
    this._isInit = true; // Update Flag
    this.emit('init'); // Emit event
  }

  /** Wait until the API is initialized (or resolve immediately if it's already initialized). */
  public async waitUtilInitialized(): Promise<void> {
    // Check if already initialized
    if (this._isInit) { return; }
    // Wait for the init event
    await new Promise((resolve) => {
      this.once('init', () => { resolve(); });
    });
  }

  /**
   * Save config data to the config file.
   * Note: This does not the current config data.
   * @param data Config data to save to the file.
   * @returns A promise.
   *          If it resolves with "true", the data was saved successfully.
   *          If it resolves with "false", the data failed to save.
   */
  public save(data: IAppConfigData): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      // Only send if it isn't already sending data
      if (!this._isSending) {
        this._isSending = true;
        // Send data and wait for response
        // @TODO Add a timeout check (reject if it hasn't responded for something like 15 sec)
        ipcRenderer.once(AppConfigIPC.SEND_RESPONSE, () => {
          this._isSending = false; // Update flag
          resolve(true);
        });
        ipcRenderer.send(AppConfigIPC.SEND, data);
      } else { resolve(false); }
    });
  }

  /** Fetch the config data from the main process. */
  private async fetch(): Promise<IAppConfigApiFetchData> {
    // Send data and wait for a response
    return new Promise<IAppConfigApiFetchData>((resolve, reject) => {
      const data = ipcRenderer.sendSync(AppConfigIPC.REQUEST_SYNC);
      if (data) { resolve(data); }
      else      { reject(new Error('No data received from config data fetch request')); }
    });
  }
}

/** IPC channels used by the config API. */
export enum AppConfigIPC {
  /** Send config data to be saved (renderer -> main). */
  SEND          = 'app-configs-api-send',
  /** Response sent after the data has been received and handled (main -> renderer). */
  SEND_RESPONSE = 'app-configs-api-send-response',
  /** Request the config data to be sent to the renderer (renderer -> main). */
  REQUEST_SYNC  = 'app-configs-api-request-sync',
}

/**
 * Create an error for when a property is attempted to be accessed, but the data hasn't been fetched yet.
 * @param propName Name of the property that was attempted to be accessed.
 */
function createAccessError(propName: string): Error {
  return new Error(
    `You must not access AppConfigApi.${propName} before the config data has fetched. `+
    'Wait for the this to finish initializing and this error should go away.'
  );
}
