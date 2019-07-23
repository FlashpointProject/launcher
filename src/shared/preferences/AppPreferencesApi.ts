import { ipcRenderer } from 'electron';
import { EventEmitter } from 'events';
import { deepCopy } from '../Util';
import { IAppPreferencesData } from './IAppPreferencesData';
import { overwritePreferenceData } from './util';

/**
 * Bridge between the Renderer and "AppPreferencesMain" (which then accesses the Preferences file).
 * "Front end" of the Preferences API, this lives in the "Renderer" process.
 * This is initially handed the preferences loaded from the file (or the defaults),
 * it then checks if the renderer changes the preferences and sends them to the main at an interval.
 */
export class AppPreferencesApi extends EventEmitter {
  /** Current Preferences Data */
  private _dataCache?: IAppPreferencesData;
  /** Proxy for preferences data */
  private _dataProxy?: IAppPreferencesData;
  /** If this is initialized */
  private _isInit: boolean = false;
  /** If the data has changed since the last time the data was sent */
  private _dataChanged: boolean = false;
  /** If data has been sent, and no response has yet been received */
  private _isSending: boolean = false;

  /** How often the data should be sent to the main (in milliseconds) */
  private static sendDataInterval: number = 0.5 * 1000;

  /**
   * Initialize (this should be called after construction, and before accessing the data object)
   */
  public async initialize() {
    return new Promise(async () => {
      if (this._isInit) { throw new Error('You can only initialize this once'); }
      // Fetch initial preferences data from main
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

  /** Wait until this is initialized (doesn't wait if already initialized) */
  public async waitUtilInitialized() {
    // Check if already initialized
    if (this._isInit) { return; }
    // Wait for the init event
    await new Promise((resolve) => {
      this.once('init', () => { resolve(); });
    });
  }

  /**
   * Send the current preference data to the main process
   * @returns If the send was successful
   */
  public async send(): Promise<boolean> {
    if (this._isSending) { return false; }
    this._isSending = true;
    // Send data and wait for response
    return new Promise<boolean>((resolve, reject) => {
      // @TODO Add a timeout check (reject if it hasn't responded for something like 15 sec)
      ipcRenderer.once(AppPreferencesApi.ipcSendResponse, () => {
        this._isSending = false; // Update flag
        resolve(true);
      });
      ipcRenderer.send(AppPreferencesApi.ipcSend, this._dataCache);
    });
  }

  /** Fetch the preference data from the main process */
  private async fetch(): Promise<IAppPreferencesData> {
    // Send data and wait for response
    return new Promise<IAppPreferencesData>((resolve, reject) => {
      const data = ipcRenderer.sendSync(AppPreferencesApi.ipcRequestSync);
      if (data) { resolve(data); }
      else      { reject(new Error('No data received from preference data fetch request')); }
    });
  }

  /** Get the currently cached data (wrapped in a proxy) */
  public getData(): IAppPreferencesData {
    if (!this._dataProxy) { throw new Error('You must not call AppPreferencesApi.getData before it has loaded'); }
    return this._dataProxy;
  }

  /** Set the data */
  public setData(data: Partial<IAppPreferencesData>): void {
    if (!this._dataProxy) { throw new Error('You must not call AppPreferencesApi.setData before it has loaded'); }
    overwritePreferenceData(this._dataProxy, data);
  }

  /** Send Preferences Data (renderer -> main) (IPC Event Name) */
  public static readonly ipcSend: string = 'app-preferences-api-send';
  /** Response to sent Preferences Data (main -> renderer) (IPC Event Name) */
  public static readonly ipcSendResponse: string = 'app-preferences-api-send-response';

  /** Request Preferences Data (renderer -> main) (IPC Event Name) */
  public static readonly ipcRequestSync: string = 'app-preferences-api-request-sync';

}
