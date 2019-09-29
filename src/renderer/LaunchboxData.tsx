import * as fastXmlParser from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { GameCollection } from '../shared/game/GameCollection';
import { GameParser } from '../shared/game/GameParser';
import { IGameCollection } from '../shared/game/interfaces';
import { IRawLaunchBoxPlatformRoot } from '../shared/launchbox/interfaces';
import { clearArray, getFilename } from '../shared/Util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export class LaunchboxData {
  public static platformsPath = 'Data/Platforms';

  /**
   * Fetch the filenames of all platform XML files.
   * @param flashpointPath Path to the root Flashpoint folder.
   */
  public static async fetchPlatformFilenames(flashpointPath: string): Promise<string[]> {
    const folderPath = path.posix.join(flashpointPath, LaunchboxData.platformsPath);
    const fileNames = await readdir(folderPath);
    if (fileNames.length > 0) {
      // Validate the filenames
      const validNames = await Promise.all(fileNames.map(fileName => {
        return stat(path.posix.join(folderPath, fileName))
        .then<string | undefined>((stats) => {
          // Check if it is an XML file
          return (stats.isFile() && fileName.endsWith('.xml'))
            ? fileName
            : undefined;
        });
      }));
      // Clear and return validated filenames
      return clearArray(validNames);
    } else { return []; }
  }

  /**
   * Fetch multiple Launchbox Platform XML files and parse their contents into a single IGameCollection
   * @param flashpointPath Path to the root flashpoint folder.
   * @param platforms Filenames of the platform files (including file extensions).
   */
  public static fetchPlatforms(flashpointPath: string, platforms: string[]): Promise<IGameCollection> {
    return new Promise((resolve, reject) => {
      const folderPath: string = path.resolve(flashpointPath, LaunchboxData.platformsPath);
      const combinedCollection: GameCollection = new GameCollection();
      let done: number = 0;
      for (let i = 0; i < platforms.length; i++) {
        LaunchboxData.fetchPlatform(path.join(folderPath, platforms[i]))
        .then((collection) => {
          combinedCollection.push(collection);
          done++;
          if (done === platforms.length) {
            resolve(combinedCollection);
          }
        })
        .catch(reject);
      }
    });
  }

  /**
   * Fetch a Launchbox Platform XML file and parse its contents to a IGameCollection
   * @param url URL or Path of the XML file
   * @returns Promise with the IGameCollection
   */
  public static fetchPlatform(url: string): Promise<IGameCollection> {
    return new Promise((resolve, reject) => {
      fetch(url, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
        }
      })
      .then((response?: Response) => {
        if (!response) {
          reject(new Error('No response'));
          return;
        }
        response.text()
        .then((text: string) => {
          // Parse XML text to objects
          const data: IRawLaunchBoxPlatformRoot|undefined = fastXmlParser.parse(text, {
            ignoreAttributes: true,
            ignoreNameSpace: true,
            parseNodeValue: true,
            parseAttributeValue: false,
            parseTrueNumberOnly: true,
            // @TODO Look into which settings are most appropriate
          });
          if (!data) {
            reject(new Error('Failed to parse XML'));
            return;
          }
          // Format objects to desired format (IGameCollection)
          const parsed = GameParser.parse(data, getFilename(url));
          // Done
          resolve(parsed);
        })
        .catch(reject);
      })
      .catch(reject);
    });
  }

  public static loadPlatform(source: string): Promise<IRawLaunchBoxPlatformRoot> {
    return new Promise((resolve, reject) => {
      fetch(source, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
        }
      })
      .then((response?: Response) => {
        if (!response) {
          reject(new Error('No response'));
          return;
        }
        response.text()
        .then((text: string) => {
          // Parse XML text to objects
          const data: IRawLaunchBoxPlatformRoot|undefined = fastXmlParser.parse(text, {
            ignoreAttributes: true,
            ignoreNameSpace: true,
            parseNodeValue: true,
            parseAttributeValue: false,
            parseTrueNumberOnly: true,
            // @TODO Look into which settings are most appropriate
          });
          if (!data) {
            reject(new Error(`Failed to parse XML file: ${source}`));
            return;
          }
          // Make sure the sub-object exists
          if (!data.LaunchBox) { data.LaunchBox = {}; }
          // Done
          resolve(data);
        })
        .catch(reject);
      })
      .catch(reject);
    });
  }
}
