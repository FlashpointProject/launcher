import * as fastXmlParser from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import { GameCollection } from '../shared/game/GameCollection';
import { GameParser } from '../shared/game/GameParser';
import { IGameCollection } from '../shared/game/interfaces';
import { IRawLaunchBoxPlatformRoot } from '../shared/launchbox/interfaces';
import { getFilename } from '../shared/Util';

export class LaunchboxData {
  public static platformsPath = './Data/Platforms';

  /**
   * Fetch the filenames of all platform XML files
   * @param flashpointPath Path to the root flashpoint folder
   */
  public static fetchPlatformFilenames(flashpointPath: string): Promise<string[]> {
    const folderPath = path.posix.join(flashpointPath, LaunchboxData.platformsPath);
    return new Promise((resolve, reject) => {
      // Get the names of all files and folders in the platforms folder
      fs.readdir(folderPath, (error: NodeJS.ErrnoException | null, files: string[]): void => {
        if (error) { reject(error); }
        else {
          if (files.length === 0) {
            resolve([]); // No files found
          } else {
            // Filter out all folders
            const fileNames: string[] = [];
            let filesLeft: number = files.length;
            files.forEach((fileName) => {
              fs.stat(path.posix.join(folderPath, fileName), (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
                if (err) { reject(err); }
                else {
                  // Add to array if it is a file
                  if (stats.isFile()) {
                    fileNames.push(fileName);
                  }
                  // Decrement counter and check if this was the last file
                  filesLeft -= 1;
                  if (filesLeft === 0) {
                    resolve(fileNames);
                  }
                }
              });
            });
          }
        }
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
            reject(new Error('Failed to parse XML'));
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
