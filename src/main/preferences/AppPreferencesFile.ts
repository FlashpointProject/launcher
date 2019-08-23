import * as fs from 'fs';
import * as path from 'path';
import { IAppPreferencesData } from '../../shared/preferences/interfaces';
import { defaultPreferencesData, overwritePreferenceData } from '../../shared/preferences/util';
import { deepCopy, readJsonFile, stringifyJsonDataFile } from '../../shared/Util';
import { getInstalledConfigsPath } from '../Util';

/** Static class with methods for saving, loading and parsing the Preferences file */
export class AppPreferencesFile {
  /** Path to the preferences file (if it is set). */
  private static filePath: string | undefined;
  /** Encoding used by preferences file. */
  private static readonly fileEncoding: string = 'utf8';

  /** Get the preferences file path (or throw and error if it is not set). */
  private static getFilePath() {
    if (AppPreferencesFile.filePath === undefined) {
      throw new Error('You must set the preferences file path before attempting to acces the file.');
    }
    return AppPreferencesFile.filePath;
  }

  /**
   * Set the path of the preferences file.
   * This will be used by all the methods in this class.
   * @param installed If the application is installed (and not portable).
   */
  public static setFilePath(installed: boolean) {
    if (AppPreferencesFile.filePath !== undefined) {
      throw new Error('You must not set the preferences file path multiple times.');
    }
    // Set the file path
    const filename = 'preferences.json';
    AppPreferencesFile.filePath = (
      installed ? path.join(getInstalledConfigsPath(), filename)
                : path.resolve(filename)
    );
  }

  /**
   * Attempt to read and parse the preferences file, then return the result.
   * If the file does not exist, create a new one with the default values and return that instead.
   * @param onError Called for each error that occurs while parsing.
   */
  public static async readOrCreate(onError?: (error: string) => void): Promise<IAppPreferencesData> {
    let error: Error | undefined,
        data: IAppPreferencesData | undefined;
    // Try to get the data from the file
    try {
      data = await AppPreferencesFile.readFile(onError);
    } catch (e) {
      error = e;
    }
    // If that failed, set data to default and save it to a new file
    if (error || !data) {
      data = deepCopy(defaultPreferencesData);
      await AppPreferencesFile.saveFile(data)
            .catch(() => console.log('Failed to save default preferences file!'));
    }
    // Return
    return data;
  }

  public static readFile(onError?: (error: string) => void): Promise<IAppPreferencesData> {
    return new Promise((resolve, reject) => {
      readJsonFile(AppPreferencesFile.getFilePath(), AppPreferencesFile.fileEncoding)
      .then(json => resolve(AppPreferencesFile.parseData(json, defaultPreferencesData, onError)))
      .catch(reject);
    });
  }

  public static saveFile(data: IAppPreferencesData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert preferences to json string
      const json: string = AppPreferencesFile.stringifyData(data);
      // Save the preferences file
      fs.writeFile(AppPreferencesFile.getFilePath(), json, function(error) {
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
