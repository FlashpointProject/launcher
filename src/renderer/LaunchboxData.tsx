import * as fs from 'fs';
import * as path from 'path';
import { IRawLaunchBoxPlatformRoot } from "../shared/launchbox/interfaces";
import { IGameCollection } from "../shared/game/interfaces";
import * as fastXmlParser from 'fast-xml-parser';
import { GameParser } from "../shared/game/GameParser";
import { GameCollection } from '../shared/game/GameCollection';

const platformsPath: string = './Arcade/Data/Platforms';

export class LaunchboxData {
  /**
   * Fetch the filenames of all platform XML files
   * @param flashpointPath Path to the root flashpoint folder
   */
  public static fetchPlatformFilenames(flashpointPath: string): Promise<string[]> {
    const folderPath = path.posix.join(flashpointPath, platformsPath);
    return new Promise((resolve, reject) => {
      // Get the filenames of all files in the thumbnail folder
      fs.readdir(folderPath, (error: NodeJS.ErrnoException, files: string[]): void => {
        if (error) { reject(error); }
        else { resolve(files); }
      });
    });
  }

  /**
   * Fetch multiple Launchbox Platform XML files and parse their contents into a single IGameCollection
   * @param flashpointPath Path to the root flashpoint folder
   * @param platforms Filenames of the platform files (including file extensions)
   */
  public static fetchPlatforms(flashpointPath: string, platforms: string[]): Promise<IGameCollection> {
    return new Promise((resolve, reject) => {
      const folderPath: string = path.posix.join(flashpointPath, platformsPath);
      const combinedCollection: GameCollection = new GameCollection();
      let done: number = 0;
      for (let i = 0; i < platforms.length; i++) {
        LaunchboxData.fetchPlatform(path.posix.join(folderPath, platforms[i]))
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
          const parsed = GameParser.parse(data);
          // Done
          resolve(parsed);
        })
        .catch(reject);
      })
      .catch(reject);
    });
  }
}
