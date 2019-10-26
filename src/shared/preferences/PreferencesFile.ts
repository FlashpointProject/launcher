import * as fs from 'fs';
import { IAppPreferencesData } from './interfaces';
import { defaultPreferencesData, overwritePreferenceData } from './util';
import { deepCopy, readJsonFile, stringifyJsonDataFile } from '../Util';

/** Static class with methods for saving, loading and parsing the Preferences file */
export namespace PreferencesFile {
  /** Encoding used by preferences file. */
  const fileEncoding: string = 'utf8';

  /**
   * Attempt to read and parse the preferences file, then return the result.
   * If the file does not exist, create a new one with the default values and return that instead.
   * @param onError Called for each error that occurs while parsing.
   */
  export async function readOrCreateFile(filePath: string, onError?: (error: string) => void): Promise<IAppPreferencesData> {
    let error: Error | undefined,
        data: IAppPreferencesData | undefined;
    // Try to get the data from the file
    try {
      data = await readFile(filePath, onError);
    } catch (e) {
      error = e;
    }
    // If that failed, set data to default and save it to a new file
    if (error || !data) {
      data = deepCopy(defaultPreferencesData);
      await saveFile(filePath, data)
            .catch(() => console.log('Failed to save default preferences file!'));
    }
    // Return
    return data;
  }

  export function readFile(filePath: string, onError?: (error: string) => void): Promise<IAppPreferencesData> {
    return new Promise((resolve, reject) => {
      readJsonFile(filePath, fileEncoding)
      .then(json => resolve(overwritePreferenceData(deepCopy(defaultPreferencesData), json, onError)))
      .catch(reject);
    });
  }

  export function saveFile(filePath: string, data: IAppPreferencesData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert preferences to json string
      const json: string = stringifyJsonDataFile(data);
      // Save the preferences file
      fs.writeFile(filePath, json, function(error) {
        if (error) { return reject(error); }
        else       { return resolve();     }
      });
    });
  }
}
