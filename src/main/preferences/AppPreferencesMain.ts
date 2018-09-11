import { ipcMain, BrowserWindow } from "electron";
import { AppPreferencesFile } from "./AppPreferencesFile";
import { IAppPreferencesData } from "../../shared/preferences/IAppPreferencesData";
import { AppPreferencesApi } from "../../shared/preferences/AppPreferencesApi";
import { recursiveReplace, deepCopy } from "../../shared/Util";
import { ElectronEvent } from "../../renderer/interfaces";

/**
 * Manager of the Preferences Data.
 * "Back end" of the Preferences API, this lives in the "Main" process.
 * This is the bridge between "AppPreferencesApi" and the Preferences file.
 */
export class AppPreferencesMain {
  /** Current prefereces data */
  private _data?: IAppPreferencesData;
  /** Timestamp of when the previous save occurred */
  private _prevSave: number = 0;

  constructor() {
    ipcMain
      .on(AppPreferencesApi.ipcSend,    this.onSendData.bind(this))
      .on(AppPreferencesApi.ipcRequest, this.onRequestData.bind(this));
  }

  /** Load the data from the file */
  public async load() {
    this._data = await AppPreferencesFile.readOrCreate();
    console.log('Preferences:', this._data);
  }

  /** Called when data is sent to this from the renderer's preferences api */
  private onSendData(event: ElectronEvent, data?: Partial<IAppPreferencesData>): void {
    // Update the data
    if (!data) { throw new Error('You must send a data object, but no data was received.'); }
    this._data = recursiveReplace(this._data, data);
    // Send response (so the renderer knows that the data was received)
    event.sender.send(AppPreferencesApi.ipcSendResponse);
  }

  /** Called when data is requested from the renderer's preferences api */
  private onRequestData(event: ElectronEvent): void {
    // @TODO (The timeout is a work around, but it doesnt work without one. It also seems unreliable if the delay is too short.
    //        I think that this might be because the renderer is blocked while rendering the games list?
    //        Maybe this should be sync to make sure it cant be blocked out?)
    setTimeout(() => {
      // Send response
      event.sender.send(AppPreferencesApi.ipcRequestResponse, this._data);
    }, 1000);
  }
}
