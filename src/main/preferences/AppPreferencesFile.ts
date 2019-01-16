import * as fs from 'fs';
import { deepCopy, readJsonFile, stringifyJsonDataFile } from '../../shared/Util';
import { IAppPreferencesData } from '../../shared/preferences/IAppPreferencesData';
import { defaultPreferencesData, overwritePreferenceData } from '../../shared/preferences/util';

/** Static class with methods for saving, loading and parsing the Preferences file */
export class AppPreferencesFile {
  /** Path to the preferences file */
  private static filePath: string = './preferences.json';
  /** Encoding used by preferences file */
  private static fileEncoding: string = 'utf8';

  /** Read the file, or create a new one using the defaults, and return the preferences */
  public static async readOrCreate(onError?: (error: string) => void): Promise<IAppPreferencesData> {
    let error: Error|undefined,
        data: IAppPreferencesData|undefined;
    // Try to get the data from the file
    try {
      data = await AppPreferencesFile.readFile(onError);
    } catch(e) {
      error = e;
    }
    // If that failed, set data to default and save it to a new file
    if (error || !data) {
      data = deepCopy(defaultPreferencesData) as IAppPreferencesData;
      await AppPreferencesFile.saveFile(data)
            .catch(() => console.log('Failed to save default preferences file!'));
    }
    // Return
    return data;
  }
  
  public static readFile(onError?: (error: string) => void): Promise<IAppPreferencesData> {
    return new Promise((resolve, reject) => {
      readJsonFile(AppPreferencesFile.filePath, AppPreferencesFile.fileEncoding)
      .then(json => resolve(AppPreferencesFile.parseData(json, defaultPreferencesData, onError)))
      .catch(reject);
    });
  }
  
  public static saveFile(data: IAppPreferencesData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert config to json string
      const json: string = AppPreferencesFile.stringifyData(data);
      // Save the config file
      fs.writeFile(AppPreferencesFile.filePath, json, function(error) {
        if (error) { return reject(error); }
        else       { return resolve();     }
      });
    });
  }
  
  public static parseData(data: any, defaultData: IAppPreferencesData, onError?: (error: string) => void): IAppPreferencesData {
    // This makes sure that only the necessary properties are copied
    // And that the missing ones are set to their default value
    return overwritePreferenceData(deepCopy(defaultData), data, onError);
  }
  
  public static stringifyData(data: IAppPreferencesData): string {
    return stringifyJsonDataFile(data);
  }
}
