import { ImageFolderCache } from './ImageFolderCache';
import { getScreenshotFolderPath, getThumbnailFolderPath } from './util';

export class GameImageCollection {
  private _flashpointPath: string;
  private _thumbnails: { [key: string]: ImageFolderCache|undefined; } = {};
  private _screenshots: { [key: string]: ImageFolderCache|undefined; } = {};

  constructor(flashpointPath: string) {
    this._flashpointPath = flashpointPath;
  }

  public getPlatformScreenshotCache(platform: string): ImageFolderCache|undefined {
    return this._screenshots[platform.toLowerCase()];
  }

  public getPlatformThumbnailCache(platform: string): ImageFolderCache|undefined {
    return this._thumbnails[platform.toLowerCase()];
  }
 
  /**
   * Add multiple platforms to the image collection
   * (This is required for the images of games for that platform to be found)
   * @param platforms Names of the platforms (NOT their filenames or paths)
   */
  public addPlatforms(platforms: string[]): void {
    for (let i = 0; i < platforms.length; i++) {
      this.addPlatform(platforms[i]);
    }
  }
  
  private addPlatform(platform: string): void {
    const lowerPlatform: string = platform.toLowerCase();
    if (this._thumbnails[lowerPlatform]) { throw new Error(`Platform with the same name has already been added (${platform})`); }
    // Add thumbnail folder
    const thumbnailFolder = new ImageFolderCache();
    this._thumbnails[lowerPlatform] = thumbnailFolder;
    thumbnailFolder.loadFilenames(getThumbnailFolderPath(platform, this._flashpointPath));
    // Add screenshot folder
    const screenshotFolder = new ImageFolderCache();
    this._screenshots[lowerPlatform] = screenshotFolder;
    screenshotFolder.loadFilenames(getScreenshotFolderPath(platform, this._flashpointPath));
  }
  
  /**
   * Get the path to the thumbnail for a given identifier and platform (returns undefined if not found)
   * @param identifier Title or ID of game
   * @param platform Platform of game
   * @returns Path to thumbnail for that game, or undefined if not found
   */
  public getThumbnailPath(platform: string, ...identifiers: string[]): string|undefined {
    return this.getFirstFilename(this._thumbnails[platform.toLowerCase()], identifiers);
  }
  
  /**
   * Get the path to the screenshot for a given identifier and platform (returns undefined if not found)
   * @param identifier Title or ID of game
   * @param platform Platform of game
   * @returns Path to screenshot for that game, or undefined if not found
   */
  public getScreenshotPath(platform: string, ...identifiers: string[]): string|undefined {
    return this.getFirstFilename(this._screenshots[platform.toLowerCase()], identifiers);
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
