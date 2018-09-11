import { ipcRenderer } from "electron";
import { EventEmitter } from "events";
import { IAppPreferencesData } from "./IAppPreferencesData";
import * as Util from "../Util";
import { ElectronEvent } from "../../renderer/interfaces";

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

  public get data(): IAppPreferencesData {
    if (!this._dataProxy) { throw new Error('Yo must not acess AppPreferencesApi.data before it has loaded'); }
    return this._dataProxy;
  }

  /** How often the data should be sent to the main (in miliseconds) */
  private static sendDataInterval: number = 5 * 1000;
  
  /**
   * Initialize (this should be called after construction, and before accessing the data object)
   */
  public async initialize() {
    return new Promise(async () => {
      if (this._isInit) { throw new Error('You can only initialize this once'); }
      this._isInit = true;
      // Fetch initial preferenses data from main
      const data = await this.fetch();
      // Keep data
      this._dataCache = Util.deepCopy<IAppPreferencesData>(data);
      // Create proxy for data object
      this._dataProxy = new Proxy(this._dataCache, {
        // Whenever the value of a data property is set
        set: (target, p, value, receiver) => {
          // Set the value of the property (as if this wasnt a proxy)
          const ret = Reflect.set(target, p, value, receiver);
          // Check if the property's value was changed (if it hasn't been changed since last send already)
          if (!this._dataChanged && (target as any)[p] !== value) {
            this._dataChanged = true; // Flag the data as changed
          }
          // Return as normal (as if this wasn't a proxy)
          return ret;
        },
      });
      // Start send loop
      setInterval(() => {
        this.send();
      }, AppPreferencesApi.sendDataInterval);
      // Emit event
      this.emit('init');
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

  /** Send the current preference data to the main process */
  private async send() {
    if (this._isSending) { return; }
    this._isSending = true;
    // Send data and wait for response
    return new Promise((resolve, reject) => {
      // @TODO Add a timeout check (reject if it hasnt responded for something like 15 sec)
      ipcRenderer.once(AppPreferencesApi.ipcSendResponse, () => {
        this._isSending = false; // Update flag
        resolve();
      });
      ipcRenderer.send(AppPreferencesApi.ipcSend, this._dataCache);
    });
  }

  /** Fetch the preference data from the main process */
  private async fetch(): Promise<IAppPreferencesData> {
    // Send data and wait for response
    return new Promise<IAppPreferencesData>((resolve, reject) => {
      // @TODO Add a timeout check (reject if it hasnt responded for something like 15 sec)
      ipcRenderer.once(AppPreferencesApi.ipcRequestResponse, (event: ElectronEvent, data?: IAppPreferencesData) => {
        if (data) { resolve(data); }
        else      { reject(new Error('No data received from preference data fetch request')); }
      });
      ipcRenderer.send(AppPreferencesApi.ipcRequest);
    });
  }

  /** Name of event for "sending Preferences Data from renderer to main" */
  public static readonly ipcSend: string = 'app-preferences-api-send';
  /** Name of event for responding to the event that "sends Preferences Data from renderer to main" */
  public static readonly ipcSendResponse: string = 'app-preferences-api-send-response';

  public static readonly ipcRequest: string = 'app-preferences-api-request';
  public static readonly ipcRequestResponse: string = 'app-preferences-api-request-response';

}
