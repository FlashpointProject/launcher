import * as fs from "fs";
import * as path from "path";
import { IAppConfigData } from "./IAppConfigData";
import * as Util from "../Util";

interface IConfigDataDefaults {
  [key: string]: Readonly<IAppConfigData>;
}

export class AppConfig {
  /** Path to the config file */
  private static configFilePath: string = './config.json';
  /** Encoding used by config file */
  private static configFileEncoding: string = 'utf8';

  /** Read and parse the config file asynchronously */
  public static readConfigFile(): Promise<IAppConfigData> {
    return new Promise<IAppConfigData>((resolve, reject) => {
      fs.readFile(AppConfig.configFilePath, AppConfig.configFileEncoding, (error, data) => {
        // Check if reading file failed
        if (error) {
          return reject(error);
        }
        // Try to parse json (and callback error if it fails)
        const jsonOrError: string|Error = Util.tryParseJSON(data as string);
        if (jsonOrError instanceof Error) {
          return reject(jsonOrError);
        }
        // Parse the JSON object as a config object
        const parsed: IAppConfigData = AppConfig.parseData(jsonOrError, AppConfig.getDefaults(process.platform));
        // Success!
        return resolve(parsed);
      });
    });
  }

  /** Stringify and save the config file asynchronously */
  public static saveConfigFile(data: IAppConfigData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert config to json string
      const json: string = AppConfig.stringifyData(data);
      // Save the config file
      fs.writeFile(AppConfig.configFilePath, json, function(error) {
        if (error) { return reject(error); }
        else       { return resolve();     }
      });
    });
  }

  /** Parse and object as an app config data object
   * (Extract the valid settings, and use the default values for everything else, then return a new object with these settings combined)
   */
  public static parseData(data: any, defaultData: IAppConfigData): IAppConfigData {
    // This makes sure that only the necessary properties are copied
    // And that the missing ones are set to their default value
    const parsed: IAppConfigData = Util.recursiveReplace(Util.deepCopy(defaultData), data);
    // Do some alterations
    parsed.flashpointPath = parsed.flashpointPath.replace(/\\/g, '/'); // (Clean path)
    // Return
    return parsed;
  }

  /** Serialize an app config data object into a string */
  public static stringifyData(data: IAppConfigData): string {
    return JSON.stringify(data, null, 2);
  }
  
  /** Get the default config data for a specified platform */
  public static getDefaults(platform: NodeJS.Platform): IAppConfigData {
    return AppConfig.configDataDefaults[platform] || AppConfig.configDataDefaultBase;
  }
  
  /** Create and return a copy of the default config data for a specified platform */
  public static createCopyOfDefaults(platform: NodeJS.Platform): IAppConfigData {
    return Util.deepCopy(AppConfig.getDefaults(platform));
  }

  /**
   * Configs which all default config settings are based on
   * (Also used as default for any platform thats not listed in "configDataDefaults")
   */
  private static readonly configDataDefaultBase: Readonly<IAppConfigData> = Object.freeze({
    flashpointPath: '',
    useCustomTitlebar: false,
    startRouter: true,
    startRedirector: true,
    useFiddler: false,
  })

  /** 
   * Default configurations for each platform
   * (Any platform that is not listed here will use "configDataDefaultBase" as their default)
   */
  private static readonly configDataDefaults: IConfigDataDefaults = {
    // Windows
    win32: Object.freeze(AppConfig.parseData({
      useCustomTitlebar: true,
    }, AppConfig.configDataDefaultBase)),
    // Linux
    linux: Object.freeze(AppConfig.parseData({
      useCustomTitlebar: false,
    }, AppConfig.configDataDefaultBase)),
    // ...
  }
}
