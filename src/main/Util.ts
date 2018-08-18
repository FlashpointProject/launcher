import * as fs from 'fs';
import { IAppConfigData } from '../shared/config/IAppConfigData';
import { AppConfig } from '../shared/config/AppConfig';

/**
 * If Electron is in development mode (or in release mode)
 * (This is copied straight out of the npm package 'electron-is-dev')
 */
export const isDev: boolean = (function() {
  const getFromEnv = parseInt(process.env.ELECTRON_IS_DEV || '', 10) === 1;
  const isEnvSet = 'ELECTRON_IS_DEV' in process.env;
  return isEnvSet ? getFromEnv : (process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath));
})();


/**
 * Call a function once the electron app is ready, or immediately if it is already ready
 */
export function callIfOrOnceReady(func: () => void): void {
  if (Electron.app.isReady()) {
    func();
  } else {
    Electron.app.once('ready', func);
  }
}

export function getLauncBoxImageNames(imageFolderPath: string, callback: (imageNames: string[]) => void) {
  fs.readdir(imageFolderPath, (err, files) => {
    if (err) { throw new Error('wat'); }
    callback(files);
  });
}

/** Parse a JSON string and return either the parsed */
export function tryParseJSON(jsonString: string): any|Error {
  let ret;
  try {
    ret = JSON.parse(jsonString);
  } catch(errer) {
    ret = errer;
  }
  return ret;
}

const configFilePath: string = './config.json';
const configFileEncoding: string = 'utf8';
export function readConfigFile(callback: (error?: Error, data?: IAppConfigData) => void): void {
  readFile(configFilePath, (error, data) => {
    // Check if reading file failed
    if (error) {
      callback(error);
      return;
    }
    // Try to parse json (and callback error if it fails)
    const jsonOrError = tryParseJSON(data as string);
    if (jsonOrError instanceof Error) {
      callback(jsonOrError);
      return;
    }
    // Parse the JSON object as a config object
    const parsed = AppConfig.parseData(jsonOrError);
    // Success!
    callback(undefined, parsed);
  });
  /** fs.readFileSync wrapped as if it were the async version (makes it easier to switch between them) */
  function readFile(path: string, callback: (error?: Error, buffer?: string) => void): void {
    let error: Error|undefined = undefined;
    let buffer: string|undefined;
    try {
      buffer = fs.readFileSync(path, configFileEncoding);
    } catch(err) {
      error = err;
    }
    callback(error, buffer);
  }
}
export function saveConfigFile(data: IAppConfigData, doItSync: boolean = false, callback?: (error?: Error, data?: IAppConfigData) => void): void {
  // Convert settings to json string
  const json = AppConfig.stringifyData(data);
  // Save the settings file
  writeFile(configFilePath, json, doItSync, function(error) {
    callback && callback(error);
  });
  /** Does either fs.writeFile and fs.writeFileSync with callbacks for either */
  function writeFile(path: string, data: any, doItSync: boolean, callback: (error?: Error) => void = noop): void {
    let error: Error|undefined = undefined;
    if (doItSync) {
      try {
        fs.writeFileSync(path, data, configFileEncoding);
      } catch(err) {
        error = err;
      }
      callback(error);
    } else {
      fs.writeFile(path, data, configFileEncoding, callback);
    }
  }
}

function noop() { /* Do Nothing */ };
