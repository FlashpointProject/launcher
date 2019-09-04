import { ipcRenderer, IpcRendererEvent } from 'electron';
import { EventEmitter } from 'events';
import { deepCopy } from '../Util';
import { overwriteServiceData, getDefaultServiceData } from './util';
import { IBackgroundServicesAction, IBackgroundServicesData, IBackgroundServicesUpdate } from './interfaces';

export interface BackgroundServicesApi {
  /** Emitted when the API is done initializing. */
  on(event: 'init', listener: () => void): this;
  once(event: 'init', listener: () => void): this;
  /** Emitted whenever a service changes, to allow for renderer updates */
  on(event: 'change', listener: () => void): this;
  once(event: 'change') : this;
}

/**
 * "Front end" part of the API for managing config data.
 * This exposes the API methods and data to the renderer process, and communicates
 * with the API on the main process through IPC.
 */
export class BackgroundServicesApi extends EventEmitter {
  private _data?: IBackgroundServicesData;
  /** If this has been initialized. */
  private _isInit: boolean = false;

  constructor() {
    super();
    ipcRenderer
    .on(BackgroundServicesIPC.UPDATE, this.onUpdate.bind(this));
  }

  /** Current config data. This can only be changed between sessions. */
  public get data(): IBackgroundServicesData {
    if (this._data === undefined) {
      throw createAccessError('data');
    }
    return this._data;
  }

  /** Initialize the API. */
  public initialize(): Promise<void> {
    return new Promise(async () => {
      if (this._isInit) { throw new Error('You can only initialize this once'); }
      // Fetch initial background services data from the main process. May not exist.
      const data = await this.fetch();
      if (!data) { this._data = { services: [] }; }
      else       { this._data = deepCopy(data);}
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

  /** Send an action to main to be resolved */
  public sendAction(data: IBackgroundServicesAction) {
    ipcRenderer.send(BackgroundServicesIPC.ACTION, data);
  }

  /** Fetch the background services data from the main process. */
  private async fetch(): Promise<IBackgroundServicesData> {
    // Request data and wait for a response.
    return new Promise<IBackgroundServicesData>((resolve, reject) => {
      const data = ipcRenderer.sendSync(BackgroundServicesIPC.REQUEST_SYNC);
      if (data) { resolve(data); }
      else {
        console.warn('No data received from background services data fetch request');
        resolve();
      }
    });
  }

  /** Process changes to the background services */
  private async onUpdate(event: IpcRendererEvent, data?: IBackgroundServicesUpdate) {
    if (!data) { throw new Error('You must send a data object, but no data was received.'); }
    // Update / Add each given service to the data
    data.updates.map((item) => {
      if (this._data) {
        const service = this._data.services.find(item => item.name === item.name);
        if (service) {
          overwriteServiceData(service, item);
        } else {
          const newService = overwriteServiceData(getDefaultServiceData(), item);
          this._data.services.push(newService);
        }
      }
    });
    this.emit('change');
  }
}

/** IPC channels used by the config API. */
export enum BackgroundServicesIPC {
  /** Updates to the status of background services (main -> renderer). */
  UPDATE = 'background-services-api-update',
  /** Request the background services data to be sent to the renderer (renderer -> main). */
  REQUEST_SYNC  = 'background-services-api-request-sync',
  /** Tell the main process to resolve an action on a service */
  ACTION = 'background-services-api-action',
}

/**
 * Create an error for when a property is attempted to be accessed, but the data hasn't been fetched yet.
 * @param propName Name of the property that was attempted to be accessed.
 */
function createAccessError(propName: string): Error {
  return new Error(
    `You must not access BackgroundServicesApi.${propName} before the config data has fetched. `+
    'Wait for the this to finish initializing and this error should go away.'
  );
}
