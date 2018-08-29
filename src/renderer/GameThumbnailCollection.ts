import * as fs from 'fs';
import * as path from 'path';

interface IThumbnails {
  [key: string]: string|undefined;
}

export class GameThumbnailCollection {
  /** Key-Value pair with a game titles and thumbnail filenames */
  private _thumbnails: IThumbnails = {};
  /** All filenames in the thumbnail folder, separated by a newline */
  private _filenames: string = '';
  /** Path to the folder where the thumbnails are loaded from */
  private _folderPath: string = '';

  /**
   * Load the filenames of all (potential) thumbnails within a folder and store them
   * @param thumbnailDirPath Path to the folder
   */
  public loadFilenames(thumbnailDirPath: string): void {
    // (Make sure that all slashes are forward-slashes)
    this._folderPath = path.posix.normalize(thumbnailDirPath).replace(/\\/g, '/');
    // Get the filenames of all files in the thumbnail folder
    fs.readdir(this._folderPath, (error, files) => {
      if (error) { throw error; }
      this._filenames = files.join('\n');
    });
  }

  /**
   * Get the path to the thumbnail for a given game title
   * @param gameTitle Title of game
   */
  public getFilePath(gameTitle: string): string|undefined {
    // Try getting the filename from the "cache"
    const filename = this._thumbnails[gameTitle];
    if (filename) { return path.posix.join(this._folderPath, filename); }
    // Try getting the filename from the thumbnail folder
    const regex = GameThumbnailCollection.createRegex(gameTitle);
    const filenames = this._filenames.match(regex);
    if (filenames) { // Thumbnail found
      // @TODO If there are multiple filenames found, maybe we should figure
      //       out which is most suitable (lowest index, shortest name, etc.)
      this._thumbnails[gameTitle] = filenames[0];
      return path.posix.join(this._folderPath, filenames[0]);
    }
    // No thumbnail found
    console.error(`Thumbnail was not found for game: ${gameTitle}`);
  }

  /**
   * Generate filename of an image of a LaunchBox Game using the "common pattern"
   * (By "common pattern" I mean the pattern which a vast majority of thumbnails follows)
   * (Ex. ("Abobo's Big Adventure", 1) => "Abobo_s Big Adventure-01")
   * (Ex. ("$wag") => "$wag")
   * @param title Title of the LaunchBox Game
   * @param index Index of the image
   */
  private static generateFilename(title: string, index?: number): string {
    const cleanTitle = GameThumbnailCollection.cleanTitle(title);
    if (index === undefined) {
      return cleanTitle;
    } else {
      index = index|0; // Floor index
      return cleanTitle+'-'+((index<10)?'0':'')+index; // Add index (and pad it if only one digit)
    }
  }

  /** Replace all invalid filesystem characters with underscores */
  private static cleanTitle(title: string): string {
    return title.replace(/[/\\?*:|"<>']/g, '_');
  }

  /** Create a regex that will find the thumbnail filename for a game */
  private static createRegex(title: string) {
    let cleanTitle = GameThumbnailCollection.cleanTitle(title);
    cleanTitle = escapeRegExp(cleanTitle);
    cleanTitle = cleanTitle.replace(/ /g, ' +'); // (Allow any number of spaces)
    return new RegExp(`^${cleanTitle} *(?:\\..+)?-[0-9]{2}\\..+$`, 'm');
  }
}

/** Escape all special regex characters from a string */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
