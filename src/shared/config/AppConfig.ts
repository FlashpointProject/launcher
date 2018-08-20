import { IAppConfigData } from "./IAppConfigData";
import * as Util from "../Util";

interface IConfigDataDefaults {
  [key: string]: Readonly<IAppConfigData>;
}

export class AppConfig {
  /** Parse and object as an app config data object
   * (Extract the valid settings, and use the default values for everything else, then return a new object with these settings combined)
   */
  public static parseData(data: any, defaultData: IAppConfigData): IAppConfigData {
    // This makes sure that only the necessary properties are copied
    // And that the missing ones are set to their default value
    const parsed: IAppConfigData = Util.recursiveReplace(Util.deepCopy(defaultData), data);
    // Do some alterations
    parsed.flashpointPath = parsed.flashpointPath.replace(/\\/g, '/'); // (Replace all backslashes with forward slashes)
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
