import { ipcMain, IpcMainEvent } from 'electron';
import { EventEmitter } from 'events';
import { AppPreferencesIPC } from '../../shared/preferences/AppPreferencesApi';
import { IAppPreferencesData } from '../../shared/preferences/interfaces';
import { overwritePreferenceData } from '../../shared/preferences/util';
import { AppPreferencesFile } from './AppPreferencesFile';

/**
 * "Back end" part of the API for managing preferences data.
 * This manages the preferences file, exposes the API methods and data to the main process
 * and communicates with the API on the renderer process through IPC.
 */
export class AppPreferencesMain extends EventEmitter {
  private _data?: IAppPreferencesData;

  /** Current preferences data. */
  public get data(): IAppPreferencesData {
    if (!this._data) { throw new Error('You must not try to access the preferences data before it is loaded!'); }
    return this._data;
  }

  constructor() {
    super();
    // Add IPC event listeners
    ipcMain
    .on(AppPreferencesIPC.SEND, this.onSendData.bind(this))
    .on(AppPreferencesIPC.REQUEST_SYNC, this.onRequestDataSync.bind(this));
  }

  /**
   * Load the preferences file.
   * @param installed If the application is installed (and not portable).
   * @returns A promise that resolves when the preferences data has been loaded.
   */
  public async load(installed: boolean) {
    AppPreferencesFile.setFilePath(installed);
    this._data = await AppPreferencesFile.readOrCreate(this.log.bind(this));
  }

  /**
   * Called when the renderer API sends data to update the current preferences with.
   * This updates the current preferences data and saves it to the preferences file,
   * it then responds to let the renderer know that it's done.
   * @param event Event.
   * @param data Data to update the preferences with.
   */
  private onSendData(event: IpcMainEvent, data?: Partial<IAppPreferencesData>): void {
    if (!this._data) { throw new Error('The data must first be loaded before new can be received.'); }
    if (!data) { throw new Error('You must send a data object, but no data was received.'); }
    // Update the data
    this._data = overwritePreferenceData(this._data, data, this.log.bind(this));
    // Save the data
    AppPreferencesFile.saveFile(this._data);
    // Send response (so the renderer knows that the data was received)
    event.sender.send(AppPreferencesIPC.SEND_RESPONSE);
  }

  /**
   * Called when the preferences data is requested from the renderer API.
   * This sends the current preferences data to the renderer.
   */
  private onRequestDataSync(event: IpcMainEvent): void {
    event.returnValue = this._data;
  }

  private log(content: string): void {
    this.emit('log', { source: 'Preferences', content });
  }
}
