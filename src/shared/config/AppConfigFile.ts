import * as fs from 'fs';
import { deepCopy, readJsonFile, stringifyJsonDataFile } from '../Util';
import { ObjectParser } from '../utils/ObjectParser';
import { IAppConfigData } from './interfaces';

interface IConfigDataDefaults {
  [key: string]: Readonly<IAppConfigData>;
}

export class AppConfig {
  /** Path to the config file */
  private static filePath: string = './config.json';
  /** Encoding used by config file */
  private static fileEncoding: string = 'utf8';

  /** Read and parse the config file asynchronously */
  public static readConfigFile(onError?: (error: string) => void): Promise<IAppConfigData> {
    return new Promise((resolve, reject) => {
      readJsonFile(AppConfig.filePath, AppConfig.fileEncoding)
      .then(json => resolve(AppConfig.parseData(json, AppConfig.getDefaults(process.platform), onError)))
      .catch(reject);
    });
  }

  /** Stringify and save the config file asynchronously */
  public static saveConfigFile(data: IAppConfigData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert config to json string
      const json: string = AppConfig.stringifyData(data);
      // Save the config file
      fs.writeFile(AppConfig.filePath, json, function(error) {
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
    const parsed: IAppConfigData = deepCopy(defaultData);
    const parser = new ObjectParser({
      input: data,
      onError: onError ? (error => onError(`Error while parsing Config: ${error.toString()}`)) : noop
    });
    parser.prop('flashpointPath',      v => parsed.flashpointPath      = str(v));
    parser.prop('imageFolderPath',     v => parsed.imageFolderPath     = str(v));
    parser.prop('logoFolderPath',      v => parsed.logoFolderPath      = str(v));
    parser.prop('playlistFolderPath',  v => parsed.playlistFolderPath  = str(v));
    parser.prop('jsonFolderPath',      v => parsed.jsonFolderPath      = str(v));
    parser.prop('useCustomTitlebar',   v => parsed.useCustomTitlebar   = !!v);
    parser.prop('startRouter',         v => parsed.startRouter         = !!v);
    parser.prop('startRedirector',     v => parsed.startRedirector     = !!v);
    parser.prop('useFiddler',          v => parsed.useFiddler          = !!v);
    parser.prop('disableExtremeGames', v => parsed.disableExtremeGames = !!v);
    parser.prop('showBrokenGames',     v => parsed.showBrokenGames     = !!v);
    // Do some alterations
    parsed.flashpointPath = parsed.flashpointPath.replace(/\\/g, '/'); // (Clean path)
    // Return
    return parsed;
  }

  /** Serialize an app config data object into a string */
  public static stringifyData(data: IAppConfigData): string {
    return stringifyJsonDataFile(data);
  }
  
  /** Get the default config data for a specified platform */
  public static getDefaults(platform: NodeJS.Platform): IAppConfigData {
    return AppConfig.configDataDefaults[platform] || AppConfig.configDataDefaultBase;
  }
  
  /** Create and return a copy of the default config data for a specified platform */
  public static createCopyOfDefaults(platform: NodeJS.Platform): IAppConfigData {
    return deepCopy(AppConfig.getDefaults(platform));
  }

  /**
   * Configs which all default config settings are based on
   * (Also used as default for any platform thats not listed in "configDataDefaults")
   */
  private static readonly configDataDefaultBase: Readonly<IAppConfigData> = Object.freeze({
    flashpointPath: '',
    imageFolderPath: 'Data/Images',
    logoFolderPath: 'Data/Logos',
    playlistFolderPath: 'Data/Playlists',
    jsonFolderPath: 'Data',
    useCustomTitlebar: false,
    startRouter: true,
    startRedirector: true,
    useFiddler: false,
    disableExtremeGames: false,
    showBrokenGames: false,
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

/** Coerce anything to a string */
function str(str: any): string {
  return (str || '') + '';
}

function noop() {}
