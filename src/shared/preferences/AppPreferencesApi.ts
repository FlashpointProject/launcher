import { ipcRenderer } from 'electron';
import { EventEmitter } from 'events';
import { deepCopy } from '../Util';
import { IAppPreferencesData } from './interfaces';
import { overwritePreferenceData } from './util';

export interface AppPreferencesApi {
  /** Emitted when the API is done initializing. */
  on(event: 'init', listener: () => void): this;
  /** Emitted when the API is done initializing. */
  once(event: 'init', listener: () => void): this;
}

/**
 * "Front end" part of the API for managing preferences data.
 * This exposes the API methods and data to the renderer process, and communicates
 * with the API on the main process through IPC.
 */
export class AppPreferencesApi extends EventEmitter {
  /** Current preferences data. */
  private _dataCache?: IAppPreferencesData;
  /** Proxy for the preferences data (used to detect when it's changed). */
  private _dataProxy?: IAppPreferencesData;
  /** If this has been initialized. */
  private _isInit: boolean = false;
  /** If the preferences data has changed since the last time the data was sent. */
  private _dataChanged: boolean = false;
  /** If this has sent preferences data to the main process, and is waiting for a response. */
  private _isSending: boolean = false;

  /** How often the data should be sent to the main (in milliseconds). */
  private static sendDataInterval: number = 0.5 * 1000;
  
  /** Initialize the API. */
  public async initialize() {
    return new Promise(async () => {
      if (this._isInit) { throw new Error('You can only initialize this once'); }
      // Fetch initial preferences data from the main process
      const data = await this.fetch();
      // Keep data
      this._dataCache = deepCopy<IAppPreferencesData>(data);
      // Create proxy for data object
      this._dataProxy = new Proxy(this._dataCache, {
        // Whenever the value of a data property is set
        set: (target, p, value, receiver) => {
          // Check if the property's value was changed
          if ((target as any)[p] !== value) {
            this._dataChanged = true;
          }
          // Set property's value as normal
          return Reflect.set(target, p, value, receiver);
        },
      });
      // Start send loop
      setInterval(() => {
        if (this._dataChanged) {
          this._dataChanged = false;
          this.send();
        }
      }, AppPreferencesApi.sendDataInterval);
      // Send data when window is closing
      window.addEventListener('unload', () => {
        this.send();
      });
      // Done
      this._isInit = true; // Update Flag
      this.emit('init'); // Emit event
    });
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
   * Send the current preferences to the main process.
   * @returns A promise.
   *          If it resolves with "true", the data was sent successfully.
   *          If it resolves with "false", the data failed to be received.
   */
  public send(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      // Only send if it isn't already sending data
      if (!this._isSending) {
        // Send data and wait for response
        // @TODO Add a timeout check (reject if it hasn't responded for something like 15 sec)
        ipcRenderer.once(AppPreferencesIPC.SEND_RESPONSE, () => {
          this._isSending = false; // Update flag
          resolve(true);
        });
        ipcRenderer.send(AppPreferencesIPC.SEND, this._dataCache);        
      } else { resolve(false); }
    });
  }

  /** Fetch the preferences data from the main process. */
  private async fetch(): Promise<IAppPreferencesData> {
    // Send data and wait for response
    return new Promise<IAppPreferencesData>((resolve, reject) => {
      const data = ipcRenderer.sendSync(AppPreferencesIPC.REQUEST_SYNC);
      if (data) { resolve(data); }
      else      { reject(new Error('No data received from preference data fetch request')); }
    });
  }
  
  /** Get the currently cached data (wrapped in a proxy). */
  public getData(): IAppPreferencesData {
    if (!this._dataProxy) { throw createAccessError('getData'); }
    return this._dataProxy;
  }

  /** Set the current preferences data. */
  public setData(data: Partial<IAppPreferencesData>): void {
    if (!this._dataProxy) { throw createAccessError('setData'); }
    overwritePreferenceData(this._dataProxy, data);
  }
}

/** IPC channels used by the preferences API. */
export enum AppPreferencesIPC {
  /** Send preferences data to be saved (renderer -> main). */
  SEND          = 'app-preferences-api-send',
  /** Response sent after the data has been received and handled (main -> renderer). */
  SEND_RESPONSE = 'app-preferences-api-send-response',
  /** Request the preferences data to be sent to the renderer (renderer -> main). */
  REQUEST_SYNC  = 'app-preferences-api-request-sync',
}

/**
 * Create an error for when a property is attempted to be accessed, but the data hasn't been fetched yet.
 * @param propName Name of the property that was attempted to be accessed.
 */
function createAccessError(propName: string): Error {
  return new Error(
    `You must not access AppPreferencesApi.${propName} before the preferences data has fetched. `+
    'Wait for the this to finish initializing and this error should go away.'
  );
}
