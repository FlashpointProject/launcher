import * as fs from 'fs';

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

  public get folderPath(): string {
    return this._folderPath;
  }

  /**
   * Load the filenames of all (potential) thumbnails within a folder and store them
   * @param thumbnailDirPath Path to the folder
   */
  public loadFilenames(thumbnailDirPath: string): void {
    this._folderPath = thumbnailDirPath;
    fs.readdir(thumbnailDirPath, (error, files) => {
      if (error) { throw error; }
      this._filenames = files.join('\n');
    });
  }

  /**
   * Get the thumbnail filename for a given game title
   * @param gameTitle Title of game
   * @return Filename of thumbnail
   */
  public getFilename(gameTitle: string): string {
    // Try getting the filename from the "cache"
    const filename = this._thumbnails[gameTitle];
    if (filename) { return filename; }
    // Try getting the filename from the thumbnail folder
    const regex = GameThumbnailCollection.createRegex(gameTitle);
    const filenames = this._filenames.match(regex);
    if (filenames) {
      // @TODO If there are multiple filenames found, maybe we should figure
      //       out which is most suitable (lowest index, shortest name, etc.)
      return this._thumbnails[gameTitle] = filenames[0]; // Thumbnail found
    }
    return this._thumbnails[gameTitle] = ''; // No thumbnail found
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
    title = GameThumbnailCollection.cleanTitle(title);
    title = escapeRegExp(title);
    title = title.replace(/ /g, ' +'); // (Allow any number of spaces)
    return new RegExp(`^${title} *(?:\\..+)?-[0-9]{2}\\..+$`, 'm');
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
