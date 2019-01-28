import { ImageFolderCache } from './ImageFolderCache';
import { getScreenshotFolderPath, getThumbnailFolderPath } from './util';

export class GameImageCollection {
  private _flashpointPath: string;
  private _thumbnails: { [key: string]: ImageFolderCache|undefined; } = {};
  private _screenshots: { [key: string]: ImageFolderCache|undefined; } = {};

  constructor(flashpointPath: string) {
    this._flashpointPath = flashpointPath;
  }

  public getScreenshotCache(folderName: string): ImageFolderCache|undefined {
    return this._screenshots[folderName.toLowerCase()];
  }

  public getThumbnailCache(folderName: string): ImageFolderCache|undefined {
    return this._thumbnails[folderName.toLowerCase()];
  }

  /** Get a copy of the screenshot cache "hash map" */
  public getAllScreenshotCaches(): { [key: string]: ImageFolderCache; } {
    const cachesCopy: { [key: string]: ImageFolderCache; } = {};
    for (let key in this._screenshots) {
      const cache = this._screenshots[key];
      if (cache) { cachesCopy[key] = cache; }
    }
    return cachesCopy;
  }

  /** Get a copy of the thumbnail cache "hash map" */
  public getAllThumbnailCaches(): { [key: string]: ImageFolderCache; } {
    const cachesCopy: { [key: string]: ImageFolderCache; } = {};
    for (let key in this._thumbnails) {
      const cache = this._thumbnails[key];
      if (cache) { cachesCopy[key] = cache; }
    }
    return cachesCopy;
  }
  
  /**
   * Add multiple image folders to the image collection
   * @param folderName Names of the folders
   */
  public addImageFolders(folderName: string[]): void {
    for (let i = 0; i < folderName.length; i++) {
      this.addImageFolder(folderName[i]);
    }
  }
  
  private addImageFolder(folderName: string): void {
    const lowerFolderName: string = folderName.toLowerCase();
    if (this._thumbnails[lowerFolderName]) { throw new Error(`Image Folder with the same name has already been added (${folderName})`); }
    // Add thumbnail folder
    const thumbnailFolder = new ImageFolderCache();
    this._thumbnails[lowerFolderName] = thumbnailFolder;
    thumbnailFolder.loadFilenames(getThumbnailFolderPath(folderName, this._flashpointPath));
    // Add screenshot folder
    const screenshotFolder = new ImageFolderCache();
    this._screenshots[lowerFolderName] = screenshotFolder;
    screenshotFolder.loadFilenames(getScreenshotFolderPath(folderName, this._flashpointPath));
  }
  
  /**
   * Get the path to the thumbnail for a given identifier and folder name (returns undefined if not found)
   * @param identifier Title or ID of game
   * @param folderName Name of the image folder
   * @returns Path to thumbnail for that game, or undefined if not found
   */
  public getThumbnailPath(folderName: string, ...identifiers: string[]): string|undefined {
    return this.getFirstFilename(this._thumbnails[folderName.toLowerCase()], identifiers);
  }
  
  /**
   * Get the path to the screenshot for a given identifier and folder name (returns undefined if not found)
   * @param identifier Title or ID of game
   * @param folderName Name of the image folder
   * @returns Path to screenshot for that game, or undefined if not found
   */
  public getScreenshotPath(folderName: string, ...identifiers: string[]): string|undefined {
    return this.getFirstFilename(this._screenshots[folderName.toLowerCase()], identifiers);
  }

  private getFirstFilename(cache: ImageFolderCache|undefined, identifiers: string[]): string|undefined {
    if (cache) {
      for (let identifier of identifiers) {
        const filepath = cache.getFilePath(identifier);
        if (filepath !== undefined) { return filepath; }
      }
    }
    return undefined;
  }
}
