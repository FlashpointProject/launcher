import { getTempFilename } from '@back/util/misc';
import * as fs from 'fs';
import * as path from 'path';
import { deepCopy, readJsonFile, readJsonFileSync, stringifyJsonDataFile } from '../Util';
import { AppPreferencesData } from './interfaces';
import { defaultPreferencesData, overwritePreferenceData } from './util';

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
  export async function readOrCreateFile(filePath: string, flashpointPath: string, onError?: (error: string) => void): Promise<AppPreferencesData> {
    // Try to get the data from the file
    const data = await readFile(filePath, onError)
    .catch((e) => {
      if (e.code !== 'ENOENT') {
        if (onError) { onError(e); }
        throw e;
      }
      return undefined;
    });
    // If doesn't exist, set data to default and save it to a new file
    if (!data) {
      const overridePath = path.join(flashpointPath, '.preferences.defaults.json');
      console.log('Checking for prefs override at ' + overridePath);
      try {
        await fs.promises.copyFile(overridePath, filePath);
        console.log('Copied default preferences (override)');
        // File copied, try loading again
        return readOrCreateFile(filePath, flashpointPath, onError);
      } catch (err) {
        console.log(err);
        // Failed to copy overrides, use defaults
        const defaultPrefs = deepCopy(defaultPreferencesData);
        await saveFile(filePath, defaultPrefs)
        .catch(() => console.error('Failed to save default preferences file!'));
        console.log('Copied default preferences');
        return defaultPrefs;
      }
    }
    // Return
    return data;
  }

  export async function readFile(filePath: string, onError?: (error: string) => void): Promise<AppPreferencesData> {
    const json = await readJsonFile(filePath, fileEncoding);
    return overwritePreferenceData(deepCopy(defaultPreferencesData), json, onError);
  }

  export async function saveFile(filePath: string, data: AppPreferencesData): Promise<void> {
    const json = stringifyJsonDataFile(data);
    if (json.length === 0) {
      log.error('PreferencesFile', 'Serialized preferences string is empty, skipping write.');
      return;
    }
    const temp = await getTempFilename();
    await fs.promises.writeFile(temp, json);
    // Check: was it written correctly?
    let stat = await fs.promises.stat(temp);
    let count = 0;
    while (stat.size !== json.length) {
      if (count > 3) {
        log.error('PreferencesFile', 'Repeated failure to write preferences.');
        return fs.promises.unlink(temp);
      }
      await fs.promises.writeFile(temp, json);
      stat = await fs.promises.stat(temp);
      count++;
    }
    await fs.promises.rename(temp, filePath);
  }
}
