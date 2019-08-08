import * as fs from 'fs';
import * as path from 'path';
import { IAppConfigData } from '../../shared/config/interfaces';
import { deepCopy, readJsonFile, stringifyJsonDataFile } from '../../shared/Util';
import { getInstalledConfigsPath } from '../Util';
import { getDefaultConfigData, overwriteConfigData } from './util';

export class AppConfigFile {
  /** Path to the config file (if it is set). */
  private static filePath: string | undefined;
  /** Encoding used by config file. */
  private static fileEncoding: string = 'utf8';

  /** Get the config file path (or throw and error if it is not set). */
  private static getFilePath() {
    if (AppConfigFile.filePath === undefined) {
      throw new Error('You must set the config file path before attempting to acces the file.');
    }
    return AppConfigFile.filePath;
  }

  /**
   * Set the path of the config file.
   * This will be used by all the methods in this class.
   * @param installed If the application is installed (and not portable).
   */
  public static setFilePath(installed: boolean) {
    if (AppConfigFile.filePath !== undefined) {
      throw new Error('You must not set the config file path multiple times.');
    }
    // Set the file path
    const filename = 'config.json';
    AppConfigFile.filePath = (
      installed ? path.join(getInstalledConfigsPath(), filename)
                : path.resolve(filename)
    );
  }

  /**
   * Attempt to read and parse the config file, then return the result.
   * If the file does not exist, create a new one with the default values and return that instead.
   * @param onError Called for each error that occurrs while parsing.
   */
  public static async readOrCreate(onError?: (error: string) => void): Promise<IAppConfigData> {
    let error: Error | undefined,
        data: IAppConfigData | undefined;
    // Try to get the data from the file
    try { data = await AppConfigFile.readFile(onError); }
    catch (e) { error = e; }
    // If that failed, set data to default and save it to a new file
    if (error || !data) {
      data = deepCopy(getDefaultConfigData(process.platform));
      await AppConfigFile.saveFile(data)
            .catch(() => console.log('Failed to save default config file!'));
    }
    // Return
    return data;
  }

  /**
   * Read and parse the data of the config file asynchronously.
   * @param onError Called for each error that occurrs while parsing.
   */
  public static readFile(onError?: (error: string) => void): Promise<IAppConfigData> {
    return new Promise((resolve, reject) => {
      readJsonFile(AppConfigFile.getFilePath(), AppConfigFile.fileEncoding)
      .then(json => resolve(AppConfigFile.parseData(json, getDefaultConfigData(process.platform), onError)))
      .catch(reject);
    });
  }

  /**
   * Stringify and save the data to the config file asynchronously.
   * @param data Data to save to the file.
   */
  public static saveFile(data: IAppConfigData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert config to json string
      const json: string = AppConfigFile.stringifyData(data);
      // Save the config file
      fs.writeFile(AppConfigFile.getFilePath(), json, function(error) {
        if (error) { return reject(error); }
        else       { return resolve();     }
      });
    });
  }

  /**
   * Parse and object as an app config data object
   * (Extract the valid settings, and use the default values for everything else, then return a new object with these settings combined)
   */
  public static parseData(data: any, defaultData: IAppConfigData, onError?: (error: string) => void): IAppConfigData {
    return overwriteConfigData(deepCopy(defaultData), data, onError);
  }

  /** Serialize an app config data object into a string */
  public static stringifyData(data: IAppConfigData): string {
    return stringifyJsonDataFile(data);
  }
}
