import { ipcMain, IpcMessageEvent } from 'electron';
import { EventEmitter } from 'events';
import { AppPreferencesApi } from '../../shared/preferences/AppPreferencesApi';
import { IAppPreferencesData } from '../../shared/preferences/IAppPreferencesData';
import { overwritePreferenceData } from '../../shared/preferences/util';
import { AppPreferencesFile } from './AppPreferencesFile';

/**
 * Manager of the Preferences Data.
 * "Back end" of the Preferences API, this lives in the "Main" process.
 * This is the bridge between "AppPreferencesApi" and the Preferences file.
 */
export class AppPreferencesMain extends EventEmitter {
  /** Current preferences data */
  private _data?: IAppPreferencesData;

  public get data(): IAppPreferencesData {
    if (!this._data) { throw new Error('You must not try to access the preferences data before it is loaded!'); }
    return this._data;
  }

  constructor() {
    super();
    // Add IPC event listeners
    ipcMain
      .on(AppPreferencesApi.ipcSend, this.onSendData.bind(this))
      .on(AppPreferencesApi.ipcRequestSync, this.onRequestDataSync.bind(this));
  }

  /** Load the data from the file */
  public async load() {
    this._data = await AppPreferencesFile.readOrCreate(this.log.bind(this));
    console.log('Preferences:', this._data);
  }

  /** Called when data is sent to this from the renderers preferences api */
  private onSendData(event: IpcMessageEvent, data?: Partial<IAppPreferencesData>): void {
    if (!this._data) { throw new Error('The data must first be loaded before new can be received.'); }
    if (!data) { throw new Error('You must send a data object, but no data was received.'); }
    // Update the data
    this._data = overwritePreferenceData(this._data, data, this.log.bind(this));
    // Save the data
    AppPreferencesFile.saveFile(this._data);
    // Send response (so the renderer knows that the data was received)
    event.sender.send(AppPreferencesApi.ipcSendResponse);
  }

  /** Called when data is requested from the renderers preferences api */
  private onRequestDataSync(event: IpcMessageEvent): void {
    event.returnValue = this._data;
  }

  private log(content: string): void {
    this.emit('log', { source: 'Preferences', content });
  }
}
