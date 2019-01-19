import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { replaceInvalidFilesystemChars } from './util';

const readdir = promisify(fs.readdir);

interface ICache {
  [key: string]: string|undefined;
}

export class ImageFolderCache {
  /** Key-Value pair of identifiers (title or id) and filenames */
  private _cache: ICache = {};
  /** Names of all files in the folder, separated by a newline */
  private _filenames: string = '';
  /** Path to the folder to cache the filenames from */
  private _folderPath: string = '';

  public getFolderPath(): string {
    return this._folderPath;
  }
  
  /** Refresh the cache (reload all filenames in the folder and remove the cache of titles that are gone) */
  public refresh(): void {
    getFilenames(this._folderPath).then(filenames => {
      this._filenames = filenames;
      for (let identifier in this._cache) {
        const regex = ImageFolderCache.createFindFilenamesRegex(identifier);
        const matchedFilenames = filenames.match(regex);
        if (!matchedFilenames) { delete this._cache[identifier]; }
      }
    });
  }

  public loadFilenames(folderPath: string): void {
    // Clean up the path
    this._folderPath = path.posix.normalize(folderPath).replace(/\\/g, '/');
    // Get the names of all files in the folder
    getFilenames(this._folderPath).then(filenames => { this._filenames = filenames; });
  }
  
  /**
   * Get the file path of an image for a given identifier (title or id)
   * (returns undefined if not found)
   * @param identifier Title or ID of image
   * @returns Path to image for that game, or undefined if not found
   */
  public getFilePath(identifier: string): string|undefined {
    // Try getting the filename from the "cache"
    const filename = this._cache[identifier];
    if (filename) { return path.posix.join(this._folderPath, filename); }
    // Try getting the filename from the filename list
    const regex = ImageFolderCache.createFindFilenamesRegex(identifier);
    const filenames = this._filenames.match(regex);
    if (filenames) { // image found
      // @TODO If there are multiple filenames found, maybe we should figure
      //       out which is most suitable (lowest index, shortest name, etc.)
      const str: string = encodeURIComponent(filenames[0]); // (Makes # in filenames work)
      this._cache[identifier] = str;
      return path.posix.join(this._folderPath, str);
    }
    // No image found
    //console.error(`Image was not found for game: "${title}" ` +
    //              `(FolderPath: "${this._folderPath}", Regex: "${regex}")`);
  }
  
  public getFilePaths(gameIdentifier: string): string[] {
    const regex = ImageFolderCache.createFindFilenamesRegex(gameIdentifier, 'mg');
    const filenames = this._filenames.match(regex);
    if (filenames) { return filenames.map(str => str); }
    return [];
  }
  
  /**
   * Create a regex that will find the filename for an identifier (title or id)
   * @param identifier Title or ID of the game to find the image of
   * @param flags Regex flags (you probably want to include 'm')
   */
  public static createFindFilenamesRegex(identifier: string, flags: string = 'm') {
    let clean: string = replaceInvalidFilesystemChars(identifier);
    clean = escapeRegExp(clean);
    clean = clean.replace(/ /g, ' +'); // (Allow any number of spaces)
    return new RegExp(`^${clean} *(?:\\..+)?-[0-9]{2}\\..+$`, flags);
  }
  
  /** Create a regex that will get the "number" or "index" of an image filename */
  public static createGetNumberRegex() {
    return new RegExp('^.*(?:\\..+)?-([0-9]{2})\\..+$', 'm');
  }
}

/** Escape all special regex characters from a string */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function getFilenames(folderPath: string): Promise<string> {
  // Get the names of all files in the folder
  return readdir(folderPath)
  .catch((error) => { throw error; })
  .then((files) => files.join('\n'));
}
