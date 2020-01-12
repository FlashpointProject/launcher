import * as fs from 'fs';
import { IAppConfigData } from '@shared/config/interfaces';
import { deepCopy, readJsonFile, stringifyJsonDataFile } from '@shared/Util';
import { getDefaultConfigData, overwriteConfigData } from '@shared/config/util';

export namespace ConfigFile {
  /** Get the config file path (or throw and error if it is not set). */
  export function readFile(filePath: string, onError?: (error: string) => void): Promise<IAppConfigData> {
    return new Promise((resolve, reject) => {
      readJsonFile(filePath, 'utf8')
      .then(json => resolve(overwriteConfigData(deepCopy(getDefaultConfigData(process.platform)), json, onError)))
      .catch(reject);
    });
  }

  export async function readOrCreateFile(filePath: string, onError?: (error: string) => void): Promise<IAppConfigData> {
    let error: Error | undefined,
        data: IAppConfigData | undefined;
    // Try to get the data from the file
    try {
      data = await readFile(filePath, onError);
    } catch (e) {
      error = e;
    }
    // If that failed, set data to default and save it to a new file
    if (error || !data) {
      data = deepCopy(getDefaultConfigData(process.platform));
      await saveFile(filePath, data)
            .catch(() => console.log('Failed to save default config file!'));
    }
    // Return
    return data;
  }

  export function saveFile(filePath: string, data: IAppConfigData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert config to json string
      const json: string = stringifyJsonDataFile(data);
      // Save the config file
      fs.writeFile(filePath, json, function(error) {
        if (error) { return reject(error); }
        else       { return resolve();     }
      });
    });
  }
}
