import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { replaceInvalidImageFilenameChars, formatImageFilename } from './util';

const readdir = promisify(fs.readdir);

type ICache = {
  [key: string]: string | undefined;
};

/** Map of lower-case filenames to the actual filenames (or undefined if the file doesn't exist). */
type FilenameMap = {
  [key: string]: string | undefined;
};

export class ImageFolderCache {
  /** Key-Value pair of identifiers (title or id) and filenames. */
  private _cache: ICache = {};
  /** Map of filenames. */
  private _filenamesMap: FilenameMap = {};
  /** Names of all files in the folder, separated by a newline. */
  private _filenames: string = '';
  /** Path to the folder to cache the filenames from. */
  private _folderPath: string = '';

  public getFolderPath(): string {
    return this._folderPath;
  }

  /** Refresh the cache (reload all filenames in the folder and remove the cache of titles that are gone). */
  public refresh(): Promise<void> {
    return getFilenames(this._folderPath).then(filenames => {
      this._filenamesMap = mapFilenames(filenames);
      this._filenames = filenames.join('\n');
      for (let identifier in this._cache) {
        const regex = ImageFolderCache.createFindFilenamesRegex(identifier);
        const matchedFilenames = this._filenames.match(regex);
        if (!matchedFilenames || this._cache[identifier] !== matchedFilenames[0]) {
          delete this._cache[identifier];
        }
      }
    });
  }

  public loadFilenames(folderPath: string): Promise<void> {
    // Clean up the path
    this._folderPath = path.posix.normalize(folderPath).replace(/\\/g, '/');
    // Get the names of all files in the folder
    return getFilenames(this._folderPath).then(filenames => {
      this._filenamesMap = mapFilenames(filenames);
      this._filenames = filenames.join('\n');
    });
  }

  /**
   * Get the file path of an image for a given identifier (title or id).
   * (returns undefined if not found).
   * @param identifier Title or ID of image.
   * @param decode If the returned filename should NOT be URI encoded.
   * @returns Path to image for that game, or undefined if not found.
   */
  public getFilePath(identifier: string, decode: boolean = false): string | undefined {
    // Try getting the filename from the "cache"
    const filename = this._cache[identifier];
    if (filename) {
      return this.toFullPath(filename, decode);
    } else {
      // Try getting the filename by searching for a very small subset of the valid names
      // (Much faster than a "complete search" and it should catch almost all images)
      const guessedFilename = findInFilenameMap(identifier, this._filenamesMap);
      if (guessedFilename) {
        const str = encodeURIComponent(guessedFilename); // (Makes # in filenames work)
        this._cache[identifier] = str;
        return this.toFullPath(str, decode);
      } else {
        // Try getting the filename by searching through all filenames with a regex (complete search)
        const regex = ImageFolderCache.createFindFilenamesRegex(identifier);
        const filenames = this._filenames.match(regex);
        if (filenames) { // image found
          // @TODO If there are multiple filenames found, maybe we should figure
          //       out which is most suitable (lowest index, shortest name, etc.)
          const str = encodeURIComponent(filenames[0]); // (Makes # in filenames work)
          this._cache[identifier] = str;
          return this.toFullPath(str, decode);
        } // else {
        // No image found
        // console.error(`Image was not found for game: "${title}" ` +
        //               `(FolderPath: "${this._folderPath}", Regex: "${regex}")`);
        // }
      }
    }
  }

  public getFilePaths(gameIdentifier: string): string[] {
    const regex = ImageFolderCache.createFindFilenamesRegex(gameIdentifier, 'mg');
    const filenames = this._filenames.match(regex);
    if (filenames) { return filenames.map(str => str); }
    return [];
  }

  /**
   * Get the full path of a file inside the image folder.
   * @param filename Name of the file.
   * @param decode If the filename should be decoded.
   */
  private toFullPath(filename: string, decode: boolean = false): string {
    if (decode) { filename = decodeURIComponent(filename); }
    return `${this._folderPath}/${filename}`;
  }

  /**
   * Create a regex that will find the filename for an identifier (title or id)
   * @param identifier Title or ID of the game to find the image of
   * @param flags Regex flags (you probably want to include 'm')
   */
  public static createFindFilenamesRegex(identifier: string, flags: string = 'm') {
    let clean: string = replaceInvalidImageFilenameChars(identifier);
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

function getFilenames(folderPath: string): Promise<string[]> {
  // Get the names of all files in the folder
  return readdir(folderPath)
  .catch((error) => { throw error; })
  .then((files) => files);
}

/** Create a filename map from an array of filenames. */
function mapFilenames(filenames: string[]): FilenameMap {
  const map: FilenameMap = {};
  for (let i = filenames.length - 1; i >= 0; i--) {
    map[filenames[i].toLowerCase()] = filenames[i];
  }
  return map;
}

/** Common file extensions used by the images (ordered from least to most common). */
const fileExtensions = ['gif', 'jpeg', 'jpg', 'png'];

/**
 * Attempt to find the filename of an identifier in a filename map by checking for filenames
 * with the same identifier combined with the most common indices and file extensions.
 * @param identifier Identifier to attempt to find the filename of.
 * @param map Map to look for the filename in.
 */
function findInFilenameMap(identifier: string, map: FilenameMap): string | undefined {
  for (let i = 1; i <= 2; i++) {
    const filename = formatImageFilename(identifier.toLowerCase(), i);
    for (let j = fileExtensions.length - 1; j >= 0; j--) {
      const fullFilename = `${filename}.${fileExtensions[j]}`;
      if (map[fullFilename]) { return map[fullFilename]; }
    }
  }
}
