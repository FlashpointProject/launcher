import * as fastXmlParser from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Legacy_GameParser } from './GameParser';
import { Legacy_GamePlatform, Legacy_IRawPlatformFile } from './interfaces';
import { Legacy_errorCopy } from './misc';
import { Legacy_LoadPlatformError } from './types';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export type Legacy_AllPlatforms = {
  platforms: Legacy_GamePlatform[],
  errors: Legacy_LoadPlatformError[]
}

export namespace Legacy_GameManager {
  export async function loadPlatforms(platformsPath: string): Promise<Legacy_AllPlatforms> {
    // Find the paths of all platform files
    const platforms: Legacy_GamePlatform[] = [];
    try {
      const libraryNames = await readdir(platformsPath);
      for (let libraryName of libraryNames) {
        // Check each library for platforms
        try {
          const libraryPath = path.join(platformsPath, libraryName);
          if ((await stat(libraryPath)).isDirectory()) {
            // Library file was a directory, read files inside
            const platformFiles = await readdir(libraryPath);
            for (let platformFile of platformFiles) {
              // Find each platform file
              const platformPath = path.join(libraryPath, platformFile);
              const platformFileExt = path.extname(platformFile);
              if (platformFileExt.toLowerCase().endsWith('.xml') && (await stat(platformPath)).isFile()) {
                platforms.push({
                  name: path.basename(platformFile, platformFileExt),
                  filePath: platformPath,
                  library: libraryName,
                  data: {
                    LaunchBox: {
                      Game: [],
                      AdditionalApplication: [],
                    },
                  },
                  collection: {
                    games: [],
                    additionalApplications: [],
                  },
                });
              }
            }
          }
        } catch (e) { console.error(e); }
      }
    } catch (e) { console.error(e); }

    // Read and parse all platform files
    const errors: Legacy_LoadPlatformError[] = [];
    const parsedPlatforms = [];
    await Promise.all(platforms.map(async (platform) => {
      try {
        const content = await readFile(platform.filePath);
        const data: any | undefined = fastXmlParser.parse(content.toString(), {
          ignoreAttributes: true,
          ignoreNameSpace: true,
          parseNodeValue: true,
          parseAttributeValue: false,
          parseTrueNumberOnly: true,
          // @TODO Look into which settings are most appropriate
        });
        if (!LaunchBox.formatPlatformFileData(data)) { throw new Error(`Failed to parse XML file: ${platform.filePath}`); }

        // Populate platform
        platform.data = data;
        platform.collection = Legacy_GameParser.parse(data, platform.library);

        // Success!
        parsedPlatforms.push(platform);
      } catch (e) {
        errors.push({
          ...Legacy_errorCopy(e),
          filePath: platform.filePath,
        });
      }
    }));

    return { platforms: platforms, errors: errors };
  }
}

export namespace LaunchBox {
  /**
   * Format the result of "fast-xml-parser" into a structured object.
   * This ensures that all types that will be used exists and is of the proper type.
   * @param data Object to format.
   */
  export function formatPlatformFileData(data: any): data is Legacy_IRawPlatformFile {
    if (!isObject(data)) { return false; }

    // If there are multiple "LaunchBox" elements, remove all but the first (There should never be more than one!)
    if (Array.isArray(data.LaunchBox)) {
      data.LaunchBox = data.LaunchBox[0];
    }

    if (!isObject(data.LaunchBox)) {
      data.LaunchBox = {};
    }

    data.LaunchBox.Game                  = convertEntitiesToArray(data.LaunchBox.Game);
    data.LaunchBox.AdditionalApplication = convertEntitiesToArray(data.LaunchBox.AdditionalApplication);

    return true;

    function isObject(obj: any): boolean {
      return (typeof obj === 'object') && (data.LaunchBox !== null);
    }

    function convertEntitiesToArray(entries: any | any[] | undefined): any[] {
      if (Array.isArray(entries)) { // Multiple entries
        return entries;
      } else if (entries) { // One entry
        return [ entries ];
      } else { // No entries
        return [];
      }
    }
  }
}