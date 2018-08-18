import { IAppConfigData } from "./IAppConfigData";
import * as Util from "../Util";

export class AppConfig {
  constructor() {

  }
  
  /** Parse and object as an app config data object
   * (Extract the valid settings, and use the default values for everything else, then return a new object with these settings combined)
   */
  public static parseData(data: any): IAppConfigData {
    // This makes sure that only the necessary properties are copied
    // And that the missing ones are set to their default value
    const defaultData: IAppConfigData = Util.deepCopy(AppConfig.defaultConfigData);
    const parsed: IAppConfigData = Util.recursiveReplace(defaultData, data);
    // Do some alterations
    parsed.flashpointPath = parsed.flashpointPath.replace(/\\/g, '/'); // (Replace all backslashes with forward slashes)
    // Return
    return parsed;
  }

  /** Serialize an app config data object into a string */
  public static stringifyData(data: IAppConfigData): string {
    return JSON.stringify(data, null, 2);
  }
  
  /** Create and return a copy of the default config data */
  public static createCopyOfDefaults(): IAppConfigData {
    return Util.deepCopy(AppConfig.defaultConfigData);
  }

  /** Default app config data */
  public static readonly defaultConfigData: Readonly<IAppConfigData> = Object.freeze({
    flashpointPath: '',
  });
}
