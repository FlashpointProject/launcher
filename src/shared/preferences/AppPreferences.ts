import { IAppPreferencesData } from "./IAppPreferencesData";
import { AppPreferencesFile } from "./AppPreferencesFile";

/** Manager of the Preferences data */
export class AppPreferences {
  /** Current prefereces data */
  private _data?: IAppPreferencesData;
  /** Timestamp of when the previous save occurred */
  private _prevSave: number = 0;

  /** Load the data from the file */
  public async load() {
    const data = await AppPreferencesFile.readOrCreate();
    this.setData(data);
    console.log('Preferences:', data);
  }

  /** Save the data to the file */
  public async save(): Promise<boolean> {
    if (this._data) {
      this._prevSave = Date.now();
      await AppPreferencesFile.saveFile(this._data);
      return true;
    }
    return false;
  }

  /** Save the data to the file, if enough time has passed since the previous save */
  private async autoSave(): Promise<boolean> {
    if (this._data) {
      // Check if enough time has passed since previous save
      const now: number = Date.now();
      if (now - this._prevSave < AppPreferences.autoSaveInterval) {
        return await this.save();
      }
    }
    return false;
  }

  setData(data: IAppPreferencesData): void {
    this._data = new Proxy(data, {
      set: (target, p, value, receiver) => {
        const ret = Reflect.set(target, p, value, receiver);
        if ((target as any)[p] !== value) {
          this.autoSave();
        }
        return ret;
      },
    });
  }

  /** Shortest timespan between saves (when auto saving) */
  private static autoSaveInterval: number = 5 * 1000;
}
