import { ipcRenderer } from 'electron';
import { EventEmitter } from 'events';
import { deepCopy } from '../Util';
import { IAppConfigApiFetchData, IAppConfigData } from './interfaces';

export class AppConfigApi extends EventEmitter {
  /** Current Configs Data */
  private _dataCache?: IAppConfigData;
  /** If this is initialized */
  private _isInit: boolean = false;
  /** Full path to the flashpoint folder */
  private _fullFlashpointPath?: string;

  public get data(): IAppConfigData {
    if (!this._dataCache) { throw new Error('Yo must not access AppConfigApi.data before it has loaded'); }
    return this._dataCache;
  }

  public get fullFlashpointPath(): string {
    if (this._fullFlashpointPath === undefined) { throw new Error('Yo must not access AppConfigApi.data before it has loaded'); }
    return this._fullFlashpointPath;
  }

  /** Initialize (this should be called after construction, and before accessing the data object) */
  public async initialize() {
    return new Promise(async () => {
      if (this._isInit) { throw new Error('You can only initialize this once'); }
      // Fetch initial preferences data from main
      const data = await this.fetch();
      // Keep data
      this._dataCache = deepCopy<IAppConfigData>(data.data);
      this._fullFlashpointPath = data.fullFlashpointPath;
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

  /** Fetch the config data from the main process */
  private async fetch(): Promise<IAppConfigApiFetchData> {
    // Send data and wait for response
    return new Promise<IAppConfigApiFetchData>((resolve, reject) => {
      const data = ipcRenderer.sendSync(AppConfigApi.ipcRequestSync);
      if (data) { resolve(data); }
      else      { reject(new Error('No data received from config data fetch request')); }
    });
  }
  
  /** Request Configs Data (renderer -> main) (IPC Event Name) */
  public static readonly ipcRequestSync: string = 'app-configs-api-request-sync';
}
