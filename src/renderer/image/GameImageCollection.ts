import * as fs from 'fs-extra';
import { promisify } from 'util';
import { IGameInfo } from '../../shared/game/interfaces';
import { removeFileExtension } from '../../shared/Util';
import { ImageFolderCache } from './ImageFolderCache';
import { getScreenshotFolderPath, getThumbnailFolderPath, getImageFolderName } from './util';

const ensureDir = promisify(fs.ensureDir);

type PartialDict<T> = { [key: string]: T | undefined; };
type GetCache = (folderName: string) => ImageFolderCache | undefined;

export class GameImageCollection {
  private _flashpointPath: string;
  private _thumbnails: PartialDict<ImageFolderCache> = {};
  private _screenshots: PartialDict<ImageFolderCache> = {};

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
   * Get a screenshot cache (synchronously).
   * If it doesn't exist, create a new image folder and then get the cache (asynchronously).
   * @param imageFolderName Name of the image folder the cache is in.
   */
  public getOrCreateScreenshotCache(imageFolderName: string): ImageFolderCache | Promise<ImageFolderCache> {
    return this.getOrCreateCache(this.getScreenshotCache.bind(this), imageFolderName);
  }

  /**
   * Get a thumbnail cache (synchronously).
   * If it doesn't exist, create a new image folder and then get the cache (asynchronously).
   * @param imageFolderName Name of the image folder the cache is in.
   */
  public getOrCreateThumbnailCache(imageFolderName: string): ImageFolderCache | Promise<ImageFolderCache> {
    return this.getOrCreateCache(this.getThumbnailCache.bind(this), imageFolderName);
  }

  /**
   * Try to get cache. If that fails, create a new image folder and return the cache from in there.
   * Internal implementation of the "getOrCreate...Cache" functions.
   * @param getCache Function that tried to get the cache.
   * @param imageFolderName Name of the image folder the cache is in.
   */
  private getOrCreateCache(getCache: GetCache, imageFolderName: string): ImageFolderCache | Promise<ImageFolderCache> {
    // Try getting the cache
    const cache = getCache(imageFolderName);
    if (cache) {
      return cache;
    } else {
      // Create a new image folder and add it (caches are inside image folders)
      return new Promise((resolve, reject) => {
        this.createImageFolder(imageFolderName)
        .then(() => {
          this.addImageFolder(imageFolderName, true);
          const cache = getCache(imageFolderName);
          if (cache) { resolve(cache); }
          else       { reject(new Error(`Failed to get cache after creating it (image folder: "${imageFolderName}").`)); }
        })
        .catch((error) => { reject(new Error(`Failed to create new image folder "${imageFolderName}".\n${error}`)); });
      });
    }
  }

  /**
   * Create image folder in the file system if it's missing
   * (This does not add or update the folders in the image cache)
   * @param folderName Name of folder
   */
  public async createImageFolder(folderName: string): Promise<void> {
    await ensureDir(getThumbnailFolderPath(folderName, this._flashpointPath), undefined);
    await ensureDir(getScreenshotFolderPath(folderName, this._flashpointPath), undefined);
  }

  /**
   * Add multiple image folders to the image collection
   * @param folderNames Names of the folders
   */
  public addImageFolders(folderNames: string[]): void {
    for (let i = 0; i < folderNames.length; i++) {
      this.addImageFolder(folderNames[i]);
    }
  }

  /**
   * Add an image folder to the image collection.
   * @param folderName Name of the folder.
   * @silentIfExists If it should silently abort the function if the folder already exists
   *                 (otherwise an error is thrown).
   */
  public addImageFolder(folderName: string, silentIfExists: boolean = false): void {
    const lowerFolderName: string = folderName.toLowerCase();
    if (!silentIfExists && (this._thumbnails[lowerFolderName] || this._screenshots[lowerFolderName])) {
      throw new Error(`Image Folder with the same name has already been added (${folderName}).`);
    }
    // Add thumbnail folder
    const thumbnailFolder = new ImageFolderCache();
    this._thumbnails[lowerFolderName] = thumbnailFolder;
    thumbnailFolder.loadFilenames(getThumbnailFolderPath(folderName, this._flashpointPath))
    .catch(console.warn);
    // Add screenshot folder
    const screenshotFolder = new ImageFolderCache();
    this._screenshots[lowerFolderName] = screenshotFolder;
    screenshotFolder.loadFilenames(getScreenshotFolderPath(folderName, this._flashpointPath))
    .catch(console.warn);
  }

  /**
   * Get the path to the thumbnail for a given game (returns undefined if not found).
   * @param game Game to get the thumbnail of.
   * @returns Path to the thumbnail for that game, or undefined if not found.
   */
  public getThumbnailPath(game: IGameInfo): string|undefined {
    return this.getImage(this._thumbnails, game);
  }

  /**
   * Get the path to the screenshot for a given game (returns undefined if not found).
   * @param game Game to get the screenshot of.
   * @returns Path to the screenshot for that game, or undefined if not found.
   */
  public getScreenshotPath(game: IGameInfo): string|undefined {
    return this.getImage(this._screenshots, game);
  }

  /** Internal shared implementation of the "get*PathOfGame" functions. */
  getImage(dict: PartialDict<ImageFolderCache>, game: IGameInfo): string|undefined {
    const cache = dict[getImageFolderName(game).toLowerCase()];
    if (cache) {
      let filepath = cache.getFilePath(game.id);
      if (filepath) { return filepath; }
      filepath = cache.getFilePath(game.title);
      return filepath;
    }
    return undefined;
  }
}
