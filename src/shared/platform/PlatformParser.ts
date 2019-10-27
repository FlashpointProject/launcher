import * as fastXmlParser from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { clearArray } from '../Util';
import { IRawPlatformFile } from './interfaces';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export class PlatformParser {
  /**
   * Fetch the filenames of all platform XML files.
   * @param folderPath Path to the Platform folder
   */
  public static async fetchPlatformFilenames(folderPath: string): Promise<string[]> {
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

  public static loadPlatform(source: string): Promise<IRawPlatformFile> {
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
          const data: IRawPlatformFile|undefined = fastXmlParser.parse(text, {
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
          if (!data.LaunchBox) { data.LaunchBox = { }; }
          // Done
          resolve(data);
        })
        .catch(reject);
      })
      .catch(reject);
    });
  }
}
