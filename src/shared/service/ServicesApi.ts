import { ipcRenderer, IpcRendererEvent } from 'electron';
import { EventEmitter } from 'events';
import { deepCopy } from '../Util';
import { IService, IServiceAction, IServicesData, IServicesUpdate } from './interfaces';
import { getDefaultServiceData, overwriteServiceData } from './util';

export interface ServicesApi {
  /** Emitted when the API is done initializing. */
  on(event: 'init', listener: () => void): this;
  once(event: 'init', listener: () => void): this;
  /** Emitted whenever a service changes. */
  on(event: 'change', listener: () => void): this;
  once(event: 'change', listener: () => void) : this;
  /** Emitted whenever an action is requested. */
  on(event: 'action', listener: (action: IServiceAction) => void) : this;
  once(event: 'action', listener: (action: IServiceAction) => void) : this;
}

/**
 * "Front end" part of the API for managing config data.
 * This exposes the API methods and data to the renderer process, and communicates
 * with the API on the main process through IPC.
 */
export class ServicesApi extends EventEmitter {
  private _data?: IServicesData;
  /** If this has been initialized. */
  private _isInit: boolean = false;

  constructor() {
    super();
    ipcRenderer
    .on(BackgroundServicesIPC.UPDATE, this.onUpdate.bind(this));
  }

  /** Current config data. This can only be changed between sessions. */
  public get data(): IServicesData {
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
      if (!data) { this._data = []; }
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

  /**
   * Send an action to main in order to be executed
   * @param data Action to be resolved (start, stop, restart)
   */
  public sendAction(data: IServiceAction) {
    ipcRenderer.send(BackgroundServicesIPC.ACTION, data);
    this.emit('action', data);
  }

  /**
   * Updates / Creates stored service info. MUST include the name attribute, otherwise ignored.
   * @param data Service(s) info to add or update
   */
  public updateServicesData(data?: Partial<IService>[]) {
    if (data) {
      data.map((update) => {
        if (this._data) {
          // Ignored services without names (Required to reference actions)
          if (update.name) {
            let service = this._data.find(item => item.name === update.name);
            if (service) {
              overwriteServiceData(service, update);
            // Create service if non-existant
            } else {
              service = overwriteServiceData(getDefaultServiceData(), update);
              this._data.push(service);
            }
          }
        }
      });
      this.emit('change');
    }
  }

  /**
   * Returns the stored service data of a named service
   * @param name Name of the service to get
   */
  public getServiceData(name: string) : IService | undefined {
    if (this._data) {
      return this._data.find(item => item.name === name);
    }
  }

  /**
   * Removes a service from stored services and emits a change
   * @param name Name of service to remove
   */
  public removeServiceData(name: string) {
    if (this._data) {
      const index = this._data.findIndex(item => item.name === name);
      this._data.splice(index, 1);
      this.emit('change');
    }
  }

  /** Fetch the background services data from the main process. */
  private fetch(): Promise<IServicesData> {
    // Request data and wait for a response.
    return new Promise<IServicesData>((resolve, reject) => {
      const data = ipcRenderer.sendSync(BackgroundServicesIPC.REQUEST_SYNC);
      if (data) { resolve(data); }
      else {
        console.warn('No data received from background services data fetch request');
        resolve();
      }
    });
  }

  /** Process changes to background services */
  private onUpdate(event: IpcRendererEvent, data?: IServicesUpdate) {
    if (!data) { throw new Error('You must send a data object, but no data was received.'); }
    this.updateServicesData(data);
  }
}

/** IPC channels used to communicate with BackgroundServices main */
export enum BackgroundServicesIPC {
  /** Updates to the status of background services (main -> renderer). */
  UPDATE = 'background-services-api-update',
  /** Request the background services data to be sent to the renderer (renderer -> main). */
  REQUEST_SYNC  = 'background-services-api-request-sync',
  /** Tell the main process to resolve an action on a service (renderer -> main) */
  ACTION = 'background-services-api-action',
}

/**
 * Create an error for when a property is attempted to be accessed, but the data hasn't been fetched yet.
 * @param propName Name of the property that was attempted to be accessed.
 */
function createAccessError(propName: string): Error {
  return new Error(
    `You must not access ServicesApi.${propName} before the initial background services data has fetched. `+
    'Wait for the this to finish initializing and this error should go away.'
  );
}
