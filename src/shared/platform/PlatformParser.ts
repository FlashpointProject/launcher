import * as fastXmlParser from 'fast-xml-parser';
import * as fs from 'fs-extra';
import * as path from 'path';
import { clearArray } from '../Util';
import { IRawPlatformFile } from './interfaces';

export class PlatformParser {
  /**
   * Fetch the filenames of all platform XML files.
   * @param folderPath Path to the Platform folder
   */
  public static async fetchPlatformFilenames(folderPath: string): Promise<string[]> {
    const fileNames = await fs.readdir(folderPath);
    if (fileNames.length > 0) {
      // Validate the filenames
      const validNames = await Promise.all(fileNames.map(async fileName => {
        const stats = await fs.lstat(path.posix.join(folderPath, fileName));
        // Check if it is an XML file
        return (stats.isFile() && fileName.endsWith('.xml'))
          ? fileName : undefined;
      }));
      // Clear and return validated filenames
      return clearArray(validNames);
    } else { return []; }
  }

  public static loadPlatform(source: string): Promise<IRawPlatformFile> {
    return new Promise((resolve, reject) => {
      fs.readFile(source)
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
          reject(new Error(`Failed to parse XML file: ${source}`));
          return;
        }
        // Make sure the sub-object exists
        if (!platformData.LaunchBox) { platformData.LaunchBox = { }; }
        // Done
        resolve(platformData);
      })
      .catch((error) => {
        reject(error);
      });
    });
  }
}
