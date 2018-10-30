import * as fs from 'fs';
import * as Util from '../../shared/Util';
import { IAppPreferencesData } from '../../shared/preferences/IAppPreferencesData';
import { BrowsePageLayout } from '../../shared/BrowsePageLayout';

/** Static class with methods for saving, loading and parsing the Preferences file */
export class AppPreferencesFile {
  /** Path to the preferences file */
  private static filePath: string = './preferences.json';
  /** Encoding used by preferences file */
  private static fileEncoding: string = 'utf8';

  /** Default Preferences Data used for values that are not found in the file */
  private static readonly defaultData: Readonly<IAppPreferencesData> = Object.freeze({
    browsePageGameScale: 0.087,
    browsePageShowExtreme: false,
    browsePageLayout: BrowsePageLayout.grid,
    browsePageShowLeftSidebar: true,
    browsePageShowRightSidebar: true,
    mainWindow: Object.freeze({
      x: undefined,
      y: undefined,
      width: undefined,
      height: undefined,
    }),
  });

  /** Read the file, or create a new one using the defaults, and return the preferences */
  public static async readOrCreate(): Promise<IAppPreferencesData> {
    let error: Error|undefined,
        data: IAppPreferencesData|undefined;
    // Try to get the data from the file
    try {
      data = await AppPreferencesFile.readFile();
    } catch(e) {
      error = e;
    }
    // If that failed, set data to default and save it to a new file
    if (error || !data) {
      data = Util.deepCopy(AppPreferencesFile.defaultData) as IAppPreferencesData;
      await AppPreferencesFile.saveFile(data);
    }
    // Return
    return data;
  }
  
  public static readFile(): Promise<IAppPreferencesData> {
    return new Promise<IAppPreferencesData>((resolve, reject) => {
      fs.readFile(AppPreferencesFile.filePath, AppPreferencesFile.fileEncoding, (error, data) => {
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
        const parsed: IAppPreferencesData = AppPreferencesFile.parseData(jsonOrError, AppPreferencesFile.defaultData);
        // Success!
        return resolve(parsed);
      });
    });
  }
  
  public static saveFile(data: IAppPreferencesData): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert config to json string
      const json: string = AppPreferencesFile.stringifyData(data);
      // Save the config file
      fs.writeFile(AppPreferencesFile.filePath, json, function(error) {
        if (error) { return reject(error); }
        else       { return resolve();     }
      });
    });
  }
  
  public static parseData(data: any, defaultData: IAppPreferencesData): IAppPreferencesData {
    // This makes sure that only the necessary properties are copied
    // And that the missing ones are set to their default value
    return Util.recursiveReplace(Util.deepCopy(defaultData), data);
  }
  
  public static stringifyData(data: IAppPreferencesData): string {
    return JSON.stringify(data, null, 2);
  }
}
