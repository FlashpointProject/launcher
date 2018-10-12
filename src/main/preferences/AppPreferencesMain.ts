import { ipcMain, IpcMessageEvent } from 'electron';
import { AppPreferencesFile } from './AppPreferencesFile';
import { IAppPreferencesData } from '../../shared/preferences/IAppPreferencesData';
import { AppPreferencesApi } from '../../shared/preferences/AppPreferencesApi';
import { recursiveReplace } from '../../shared/Util';

/**
 * Manager of the Preferences Data.
 * "Back end" of the Preferences API, this lives in the "Main" process.
 * This is the bridge between "AppPreferencesApi" and the Preferences file.
 */
export class AppPreferencesMain {
  /** Current preferences data */
  private _data?: IAppPreferencesData;

  public get data(): IAppPreferencesData {
    if (!this._data) { throw new Error('You must not try to access the preferences data before it is loaded!'); }
    return this._data;
  }

  constructor() {
    // Add IPC event listeners
    ipcMain
      .on(AppPreferencesApi.ipcSend, this.onSendData.bind(this))
      .on(AppPreferencesApi.ipcRequestSync, this.onRequestDataSync.bind(this));
  }

  /** Load the data from the file */
  public async load() {
    this._data = await AppPreferencesFile.readOrCreate();
    console.log('Preferences:', this._data);
  }

  /** Called when data is sent to this from the renderer's preferences api */
  private onSendData(event: IpcMessageEvent, data?: Partial<IAppPreferencesData>): void {
    if (!this._data) { throw new Error('The data must first be loaded before new can be received.'); }
    if (!data) { throw new Error('You must send a data object, but no data was received.'); }
    // Update the data
    this._data = recursiveReplace(this._data, data);
    // Save the data
    AppPreferencesFile.saveFile(this._data);
    // Send response (so the renderer knows that the data was received)
    event.sender.send(AppPreferencesApi.ipcSendResponse);
  }

  /** Called when data is requested from the renderer's preferences api */
  private onRequestDataSync(event: IpcMessageEvent): void {
    event.returnValue = this._data;
  }
}
