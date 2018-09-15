import * as path from 'path';
import { ThumbnailFolderCache } from './ThumbnailFolderCache';

export class GameThumbnailCollection {
  private _flashpointPath: string;
  private _folders: { [key: string]: ThumbnailFolderCache|undefined; } = {};

  constructor(flashpointPath: string) {
    this._flashpointPath = flashpointPath;
  }
 
  /**
   * Add multiple platforms to the thumbnail collection
   * (This is required for the thumbnails for that platform to be found)
   * @param platforms Names of the platforms (NOT their filenames or paths)
   */
  public addPlatforms(platforms: string[]): void {
    for (let i = 0; i < platforms.length; i++) {
      this.addPlatform(platforms[i]);
    }
  }
  
  private addPlatform(platform: string): void {
    platform = platform.toLocaleLowerCase();
    if (this._folders[platform]) { throw new Error(`Platform with the same name has already been added (${platform})`); }
    const folder = new ThumbnailFolderCache();
    this._folders[platform] = folder;
    folder.loadFilenames(path.posix.join(this._flashpointPath, `./Arcade/Images/${platform}/Box - Front`));
  }
  
  /**
   * Get the path to the thumbnail for a given title and platform (returns undefined if not found)
   * @param gameTitle Title of game
   * @param platform Platform of game
   * @returns Path to thumbnail for that game, or undefined if not found
   */
  public getFilePath(gameTitle: string, platform: string): string|undefined {
    platform = platform.toLocaleLowerCase();
    const cache = this._folders[platform];
    if (!cache) { throw new Error(`Platform not found! (Platform: "${platform}", GameTitle: "${gameTitle}")`); }
    return cache.getFilePath(gameTitle);
  }
}
