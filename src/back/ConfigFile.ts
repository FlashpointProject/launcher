import * as fs from 'fs';
import { IAppConfigData } from '@shared/config/interfaces';
import { deepCopy, readJsonFile, stringifyJsonDataFile, readJsonFileSync } from '@shared/Util';
import { getDefaultConfigData, overwriteConfigData } from '@shared/config/util';

export namespace ConfigFile {
  export function readFile(filePath: string, onError?: (error: string) => void): Promise<IAppConfigData> {
    return new Promise((resolve, reject) => {
      readJsonFile(filePath, 'utf8')
      .then(json => resolve(parse(json, onError)))
      .catch(reject);
    });
  }

  export function readFileSync(filePath: string, onError?: (error: string) => void): IAppConfigData {
    return parse(readJsonFileSync(filePath), onError);
  }

  export async function readOrCreateFile(filePath: string, onError?: (error: string) => void): Promise<IAppConfigData> {
    let error: Error | undefined,
        data: IAppConfigData | undefined;

    try {
      data = await readFile(filePath, onError);
    } catch (e) {
      error = e;
    }

    if (error || !data) {
      data = deepCopy(getDefaultConfigData(process.platform));
      saveFile(filePath, data).catch(() => console.log('Failed to save default config file!'));
    }

    return data;
  }

  export function readOrCreateFileSync(filePath: string, onError?: (error: string) => void): IAppConfigData {
    let error: Error | undefined,
        data: IAppConfigData | undefined;

    try {
      data = readFileSync(filePath, onError);
    } catch (e) {
      error = e;
    }

    if (error || !data) {
      data = deepCopy(getDefaultConfigData(process.platform));
      saveFile(filePath, data).catch(() => console.log('Failed to save default config file!'));
    }

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

  function parse(json: any, onError?: (error: string) => void): IAppConfigData {
    return overwriteConfigData(deepCopy(getDefaultConfigData(process.platform)), json, onError);
  }
}
