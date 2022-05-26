import { AppExtConfigData } from '@shared/config/interfaces';
import { overwriteExtConfigData } from '@shared/config/util';
import { readJsonFile, readJsonFileSync, stringifyJsonDataFile } from '@shared/Util';
import * as fs from 'fs';

export namespace ExtConfigFile {
  export function readFile(filePath: string, onError?: (error: string) => void): Promise<AppExtConfigData> {
    return new Promise((resolve, reject) => {
      readJsonFile(filePath, 'utf8')
      .then(json => resolve(parse(json, onError)))
      .catch(reject);
    });
  }

  export function readFileSync(filePath: string, onError?: (error: string) => void): AppExtConfigData {
    return parse(readJsonFileSync(filePath), onError);
  }

  export async function readOrCreateFile(filePath: string, onError?: (error: string) => void): Promise<AppExtConfigData> {
    let error: Error | undefined;
    let data: any;

    try {
      data = await readFile(filePath, onError);
    } catch (e: any) {
      error = e;
    }

    if (error || !data) {
      data = {};
      saveFile(filePath, data).catch(() => console.log('Failed to save default ext config file!'));
    }

    return data;
  }

  export function readOrCreateFileSync(filePath: string, onError?: (error: string) => void): AppExtConfigData {
    let error: Error | undefined;
    let data: any;

    try {
      data = readFileSync(filePath, onError);
    } catch (e: any) {
      error = e;
    }

    if (error || !data) {
      data = {};
      saveFile(filePath, data).catch(() => console.log('Failed to save default ext config file!'));
    }

    return data;
  }

  export function saveFile(filePath: string, data: AppExtConfigData): Promise<void> {
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

  function parse(json: any, onError?: (error: string) => void): AppExtConfigData {
    return overwriteExtConfigData({}, json, onError);
  }
}
