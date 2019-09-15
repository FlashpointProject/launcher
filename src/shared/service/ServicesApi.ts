import { ipcRenderer, IpcRendererEvent } from 'electron';
import { EventEmitter } from 'events';
import { deepCopy } from '../Util';
import { IService, IServiceAction, IServicesData, IServicesUpdate } from './interfaces';
import { getDefaultServiceData, overwriteServiceData } from './util';

export interface ServicesApi {
  /** Emitted when the API is done initializing. (Background Services fetched) */
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
 * Holds a list of registered services with state info.
 * The `action` emitter fires whenever a action is requested to be taken (services must listen to this).
 * The `change` emitter fires whenever a registered service changes state.
 * Background Services are handled via IPC.
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
   * Send an action to all registered services.
   * Services use uuid to verify it is theirs to carry out.
   * @param data Action to be resolved (start, stop, restart)
   */
  public sendAction(data: IServiceAction) {
    ipcRenderer.send(BackgroundServicesIPC.ACTION, data);
    this.emit('action', data);
  }

  /**
   * Updates / Registers service(s) in the api. MUST include the name attribute, otherwise ignored.
   * @param data Service(s) to update / register
   */
  public updateServices(data?: Partial<IService>[]) {
    if (data) {
      data.map((update) => {
        if (this._data) {
          // Ignore updates without an associated service
          if (update.identifier) {
            // Update service if already registered
            let service = this.getServiceData(update.identifier);
            if (service) {
              overwriteServiceData(service, update);
            // Create service if not registered yet
            } else {
              service = overwriteServiceData(getDefaultServiceData(), update);
              this._data.push(service);
            }
          } else { throw new Error('Service update did not reference a service.'); }
        }
      });
      this.emit('change');
    }
  }

  /**
   * Unregisters a service from the api
   * @param name Unique identifier of the service to remove
   */
  public removeService(identifier: string) {
    if (this._data) {
      const index = this._data.findIndex(item => item.identifier === identifier);
      if (index >= 0) {
        this._data.splice(index, 1);
        this.emit('change');
      }
    }
  }

  /**
   * Returns the service associated with a given identifier
   * @param identifier Unique identifier of the service to get
   */
  private getServiceData(identifier: string) : IService | undefined {
    if (this._data) {
      return this._data.find(item => item.identifier === identifier);
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
    this.updateServices(data);
  }
}

/** IPC channels used to communicate with BackgroundServices main */
export enum BackgroundServicesIPC {
  /** Updates to the status of background services (main -> renderer). */
  UPDATE = 'background-services-api-update',
  /** Request the background services data to be sent to the renderer api (renderer -> main). */
  REQUEST_SYNC  = 'background-services-api-request-sync',
  /** Tell the main process to resolve an action (renderer -> main) */
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
