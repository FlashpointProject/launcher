import { ipcRenderer, IpcRendererEvent } from 'electron';
import { EventEmitter } from 'events';
import { deepCopy, recursiveReplace } from '../Util';
import { IService, IServiceAction, ProcessState } from './interfaces';

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
 * "Front end" part of the API for managing background services.
 * This exposes the API methods and data to the renderer process, and communicates
 * with the API on the main process through IPC.
 */
export class ServicesApi extends EventEmitter {
  /**
   * State of all current services.
   * This is synced with the state in the main process.
   */
  private _services?: IService[];
  /** If this has been initialized. */
  private _isInit: boolean = false;

  constructor() {
    super();
    ipcRenderer.on(BackgroundServicesIPC.UPDATE, this.onUpdate.bind(this));
  }

  /** Current config data. This can only be changed between sessions. */
  public get data(): IService[] {
    if (!this._services) { throw createAccessError('data'); }
    return this._services;
  }

  /** Initialize the API. */
  public async initialize(): Promise<void> {
    if (this._isInit) { throw new Error('You can only initialize this once'); }
    // Fetch initial background services data from the main process. May not exist.
    const data = await this.fetch();
    if (!data) { this._services = []; }
    else       { this._services = deepCopy(data);}
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
   * Send an action to all registered services.
   * Services use uuid to verify it is theirs to carry out.
   * @param data Action to be resolved (start, stop, restart)
   */
  public sendAction(data: IServiceAction): void {
    ipcRenderer.send(BackgroundServicesIPC.ACTION, data);
    this.emit('action', data);
  }

  /**
   * Update or register any number of service(s).
   * @param state State to update or register service(s) with (by matching the state and service by their identifiers).
   *              If a state object is missing an identifier, an error will be thrown.
   */
  public updateServices(state: Partial<IService>[]): void {
    if (!this._services) { throw new Error('Failed to update services. "_data" is missing. Are you sure this is initialized?'); }
    for (let update of state) {
      // Ignore updates without an associated service
      if (update.identifier) {
        // Check if the service is already registered
        const service = this.findService(update.identifier);
        if (service) { // (Update existing service)
          recursiveReplace(service, update);
        } else { // (Register new service)
          this._services.push(recursiveReplace(createBaseService(), update));
        }
      } else { throw new Error('Service update did not reference a service.'); }
    }
    this.emit('change');
  }

  /**
   * Unregister a service.
   * @param identifier Identifier of the service to unregister.
   */
  public removeService(identifier: string): void {
    if (this._services) {
      const index = this._services.findIndex(item => item.identifier === identifier);
      if (index >= 0) {
        this._services.splice(index, 1);
        this.emit('change');
      }
    }
  }
  
  /**
   * Find a service by its identifier.
   * @param identifier Identifier of the service.
   */
  private findService(identifier: string): IService | undefined {
    if (this._services) {
      return this._services.find(item => item.identifier === identifier);
    }
  }

  /** Fetch the background services data from the main process. */
  private fetch(): Promise<IService[]> {
    // Request data and wait for a response.
    return new Promise<IService[]>((resolve, reject) => {
      const data = ipcRenderer.sendSync(BackgroundServicesIPC.REQUEST_SYNC);
      if (data) {
        resolve(data);
      } else {
        reject(new Error('No data received from background services data fetch request'));
      }
    });
  }

  /** Process changes to background services */
  private onUpdate(event: IpcRendererEvent, data?: Partial<IService>[]): void {
    if (!data) { throw new Error('You must send a data object, but no data was received.'); }
    this.updateServices(data);
  }
}

/** IPC channels used by the service API. */
export enum BackgroundServicesIPC {
  /** Updates to the status of background services (main -> renderer). */
  UPDATE       = 'background-services-api-update',
  /** Request the background services data to be sent to the renderer api (renderer -> main). */
  REQUEST_SYNC = 'background-services-api-request-sync',
  /** Tell the main process to resolve an action (renderer -> main). */
  ACTION       = 'background-services-api-action',
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

/** Create a service object with some placeholder values. */
function createBaseService(): IService {
  return {
    identifier: 'invalid',
    name: 'invalid',
    state: ProcessState.STOPPED,
    pid: -1,
    startTime: 0
  };
}
