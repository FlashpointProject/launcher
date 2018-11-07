import * as path from 'path';
import { ImageFolderCache } from './ImageFolderCache';

export class GameImageCollection {
  private _flashpointPath: string;
  private _thumbnails: { [key: string]: ImageFolderCache|undefined; } = {};
  private _screenshots: { [key: string]: ImageFolderCache|undefined; } = {};

  constructor(flashpointPath: string) {
    this._flashpointPath = flashpointPath;
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
    thumbnailFolder.loadFilenames(path.posix.join(this._flashpointPath, `./Images/${platform}/Box - Front`));
    // Add screenshot folder
    const screenshotFolder = new ImageFolderCache();
    this._screenshots[lowerPlatform] = screenshotFolder;
    screenshotFolder.loadFilenames(path.posix.join(this._flashpointPath, `./Images/${platform}/Screenshot - Gameplay`));
  }
  
  /**
   * Get the path to the thumbnail for a given title and platform (returns undefined if not found)
   * @param gameTitle Title of game
   * @param platform Platform of game
   * @returns Path to thumbnail for that game, or undefined if not found
   */
  public getThumbnailPath(gameTitle: string, platform: string): string|undefined {
    platform = platform.toLowerCase();
    const cache = this._thumbnails[platform];
    if (!cache) {
      //console.error(`Platform not found! (Platform: "${platform}", GameTitle: "${gameTitle}")`);
      return undefined;
    }
    return cache.getFilePath(gameTitle);
  }
  
  /**
   * Get the path to the screenshot for a given title and platform (returns undefined if not found)
   * @param gameTitle Title of game
   * @param platform Platform of game
   * @returns Path to screenshot for that game, or undefined if not found
   */
  public getScreenshotPath(gameTitle: string, platform: string): string|undefined {
    platform = platform.toLowerCase();
    const cache = this._screenshots[platform];
    if (!cache) {
      //console.error(`Platform not found! (Platform: "${platform}", GameTitle: "${gameTitle}")`);
      return undefined;
    }
    return cache.getFilePath(gameTitle);
  }
}
