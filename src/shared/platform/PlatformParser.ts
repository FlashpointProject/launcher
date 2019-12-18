import * as fastXmlParser from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { GameParser } from '../game/GameParser';
import { GamePlatform, IRawPlatformFile } from './interfaces';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export class PlatformParser {
  /**
   * Fetch the filenames of all platform XML files.
   * @param folderPath Path to the Platform folder
   */
  public static async fetchPlatforms(folderPath: string): Promise<GamePlatform[]> {
    const platforms: GamePlatform[] = [];
    const libraryFiles = await readdir(folderPath);
    for (let libraryFile of libraryFiles) {
      // Check each library for platforms
      const library = libraryFile;
      const libraryPath = path.join(folderPath, libraryFile);
      const libraryStats = await stat(libraryPath);
      if (libraryStats.isDirectory()) {
        // Library file was a directory, read files inside
        const platformFiles = await readdir(libraryPath);
        for (let platformFile of platformFiles) {
          // Find each platform file
          const platformPath = path.join(libraryPath, platformFile);
          const platformStats = await stat(platformPath);
          const platformFileExt = path.extname(platformFile);
          if (platformStats.isFile() && platformFileExt.toLowerCase().endsWith('.xml')) {
            // Valid platform file, store
            platforms.push({
              name: path.basename(platformFile, platformFileExt),
              filePath: platformPath,
              library: library,
              data: { LaunchBox: {} },
              collection: { games: [], additionalApplications: [] }
            });
          }
        }
      }
    }
    return platforms;
  }

  public static loadPlatformFile(platform: GamePlatform): Promise<void> {
    return new Promise((resolve, reject) => {
      readFile(platform.filePath)
      .then((data) => {
        const platformData: IRawPlatformFile|undefined = fastXmlParser.parse(data.toString(), {
          ignoreAttributes: true,
          ignoreNameSpace: true,
          parseNodeValue: true,
          parseAttributeValue: false,
          parseTrueNumberOnly: true,
          // @TODO Look into which settings are most appropriate
        });
        if (!platformData) {
          reject(new Error(`Failed to parse XML file: ${platform.filePath}`));
          return;
        }
        // Make sure the sub-object exists
        if (!platformData.LaunchBox) { platformData.LaunchBox = { }; }
        // Populate platform
        platform.data = platformData;
        platform.collection = GameParser.parse(platformData, platform.library);
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
    });
  }
}
