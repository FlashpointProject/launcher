import { AppConfigData } from '@shared/config/interfaces';
import { getDefaultConfigData, overwriteConfigData } from '@shared/config/util';
import { deepCopy, readJsonFile, readJsonFileSync, stringifyJsonDataFile } from '@shared/Util';
import * as fs from 'fs';

export namespace ConfigFile {
  export function readFile(filePath: string, onError?: (error: string) => void): Promise<AppConfigData> {
    return new Promise((resolve, reject) => {
      readJsonFile(filePath, 'utf8')
      .then(json => resolve(parse(json, onError)))
      .catch(reject);
    });
  }

  export function readFileSync(filePath: string, onError?: (error: string) => void): AppConfigData {
    return parse(readJsonFileSync(filePath), onError);
  }

  export async function readOrCreateFile(filePath: string, onError?: (error: string) => void): Promise<AppConfigData> {
    let error: Error | undefined;
    let data: AppConfigData | undefined;

    try {
      data = await readFile(filePath, onError);
    } catch (e: any) {
      error = e;
    }

    if (error || !data) {
      data = deepCopy(getDefaultConfigData(process.platform));
      saveFile(filePath, data).catch(() => console.log('Failed to save default config file!'));
    }

    return data;
  }

  export function readOrCreateFileSync(filePath: string, onError?: (error: string) => void): AppConfigData {
    let error: Error | undefined;
    let data: AppConfigData | undefined;

    try {
      data = readFileSync(filePath, onError);
    } catch (e: any) {
      error = e;
    }

    if (error || !data) {
      data = deepCopy(getDefaultConfigData(process.platform));
      saveFile(filePath, data).catch(() => console.log('Failed to save default config file!'));
    }

    return data;
  }

  export function saveFile(filePath: string, data: AppConfigData): Promise<void> {
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

  function parse(json: any, onError?: (error: string) => void): AppConfigData {
    return overwriteConfigData(deepCopy(getDefaultConfigData(process.platform)), json, onError);
  }
}
