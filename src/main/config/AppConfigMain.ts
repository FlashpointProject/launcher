import { ipcMain, IpcMainEvent } from 'electron';
import { EventEmitter } from 'events';
import * as path from 'path';
import { AppConfigFile } from './AppConfigFile';
import { AppConfigIPC } from '../../shared/config/AppConfigApi';
import { IAppConfigData, IAppConfigApiFetchData } from '../../shared/config/interfaces';

/**
 * "Back end" part of the API for managing config data.
 * This manages the config file, exposes the API methods and data to the main process
 * and communicates with the API on the renderer process through IPC.
 */
export class AppConfigMain extends EventEmitter {
  private _data?: IAppConfigData;

  /** Current config data. */
  public get data(): IAppConfigData {
    if (!this._data) { throw new Error('You must not try to access the config data before it is loaded!'); }
    return this._data;
  }

  constructor() {
    super();
    // Add IPC event listeners
    ipcMain
    .on(AppConfigIPC.SEND, this.onSendData.bind(this))
    .on(AppConfigIPC.REQUEST_SYNC, this.onRequestDataSync.bind(this));
  }

  /**
   * Load the config file.
   * @param installed If the application is installed (and not portable).
   * @returns A promise that resolves when the config data has been loaded.
   */
  public async load(installed: boolean): Promise<void> {
    AppConfigFile.setFilePath(installed);
    this._data = await AppConfigFile.readOrCreate(this.log.bind(this));
  }

  /**
   * Called when the renderer API sends data to save to the config file.
   * This saves the data to the file, then responds to let the renderer know
   * that it's done.
   * @param event Event.
   * @param data Data to save to the file.
   */
  private onSendData(event: IpcMainEvent, data?: IAppConfigData): void {
    if (!data) { throw new Error('You must send a data object, but no data was received.'); }
    // Create callback
    const sendResponse = () => {
      event.sender.send(AppConfigIPC.SEND_RESPONSE);
    };
    // Save data to file
    AppConfigFile.saveFile(data)
    .then(sendResponse)
    .catch(sendResponse);
  }

  /**
   * Called when the config data is requested from the renderer API.
   * This sends the config data to the renderer.
   */
  private onRequestDataSync(event: IpcMainEvent): void {
    const data: IAppConfigApiFetchData = {
      data: this.data,
      fullFlashpointPath: path.resolve(this.data.flashpointPath)
    };
    event.returnValue = data;
  }

  private log(content: string): void {
    this.emit('log', { source: 'Config', content });
  }
}


