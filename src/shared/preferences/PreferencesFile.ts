import * as fs from 'fs';
import { AppPreferencesData } from './interfaces';
import { defaultPreferencesData, overwritePreferenceData } from './util';
import { deepCopy, readJsonFile, readJsonFileSync, stringifyJsonDataFile } from '../Util';

/** Static class with methods for saving, loading and parsing the Preferences file */
export namespace PreferencesFile {
  /** Encoding used by preferences file. */
  const fileEncoding = 'utf8';

  /**
   * Synchronous way to read Preferences, used in BrowserMode - Note: Will not save default values
   * @param onError Called for each error that occurs while parsing.
   */
  export function readOrCreateFileSync(filePath: string, onError?: (error: string) => void): AppPreferencesData {
    // Try to get the data from the file
    const data: AppPreferencesData | undefined = readJsonFileSync(filePath, fileEncoding);
    if (!data) {
      throw 'Error reading Preferences file!';
    }
    // Return
    return data;
  }

  /**
   * Attempt to read and parse the preferences file, then return the result.
   * If the file does not exist, create a new one with the default values and return that instead.
   * @param onError Called for each error that occurs while parsing.
   */
  export async function readOrCreateFile(filePath: string, onError?: (error: string) => void): Promise<AppPreferencesData> {
    let data: AppPreferencesData | undefined;
    // Try to get the data from the file
    data = await readFile(filePath, onError)
    .catch((e) => {
      if (e.code !== 'ENOENT') {
        throw e;
      }
      return undefined;
    });
    // If that failed, set data to default and save it to a new file
    if (!data) {
      data = deepCopy(defaultPreferencesData);
      await saveFile(filePath, data)
      .catch(() => console.error('Failed to save default preferences file!'));
    }
    // Return
    return data;
  }

  export function readFile(filePath: string, onError?: (error: string) => void): Promise<AppPreferencesData> {
    return new Promise((resolve, reject) => {
      readJsonFile(filePath, fileEncoding)
      .then(json => resolve(overwritePreferenceData(deepCopy(defaultPreferencesData), json, onError)))
      .catch(reject);
    });
  }

  export function saveFile(filePath: string, data: AppPreferencesData): Promise<void> {
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
