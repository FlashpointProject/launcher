import * as fs from 'fs';
import * as path from 'path';
import { EditCuration, CurationSource } from '../context/CurationContext';
import GameManager from '../game/GameManager';
import { GameImageCollection } from '../image/GameImageCollection';
import { CurationIndexImage, isInCurationFolder } from './indexCuration';
import { ImageFolderCache } from '../image/ImageFolderCache';
import { IGameInfo, IAdditionalApplicationInfo } from '../../shared/game/interfaces';
import { createGameImageFileFromData, copyGameImageFile } from '../util/game';
import { getFileExtension } from '../Util';
import { formatDate, removeFileExtension } from '../../shared/Util';
import { GameLauncher } from '../GameLauncher';
import { unzip } from '../util/unzip';
import { getImageFolderName } from '../image/util';
import { formatUnknownPlatformName } from '../game/util';

/**
 * Import a curation.
 * @param curation Curation to import.
 * @param games Games manager to add the newly created game to.
 * @param gameImages Image collection to add the game images to.
 * @returns A promise that resolves when the import is complete.
 */
export async function importCuration(
  curation: EditCuration, games: GameManager, gameImages: GameImageCollection
): Promise<void> {
  // @TODO Add support for selecting what library to save the game to
  const libraryPrefix = '';
  // Create and add game and additional applications
  const game = createGameFromCurationMeta(curation);
  const addApps = createAddAppsFromCurationMeta(curation);
  // Get the nome of the folder to put the images in
  const imageFolderName = (
    getImageFolderName(game, libraryPrefix, true) ||
    removeFileExtension(formatUnknownPlatformName(libraryPrefix))
  );
  // Copy/extract content and image files
  await Promise.all([
    games.addOrUpdateGame({ game, addApps, saveToFile: true }),
    // Copy Thumbnail
    (async () => {
      const thumbnailCache = await gameImages.getOrCreateThumbnailCache(imageFolderName);
      await importGameImage(curation.thumbnail, thumbnailCache, game)
      .then(() => { thumbnailCache.refresh(); });
    })(),
    // Copy Screenshot
    (async () => {
      const screenshotCache = await gameImages.getOrCreateScreenshotCache(imageFolderName);
      await importGameImage(curation.screenshot, screenshotCache, game)
      .then(() => { screenshotCache.refresh(); });
    })(),
    // Copy content files
    (async () => {
      switch (curation.sourceType) {
        case CurationSource.NONE:
          // Do nothing (maybe it should show a warning or message or something?)
          break;
        case CurationSource.ARCHIVE:
          // Copy all content files in the archive
          await new Promise((resolve, reject) => {
            unzip({
              source: curation.source,
              output: GameLauncher.getHtdocsPath(),
              // Remove the path leading up to and including the content folder
              generateOutputPath: (entry, opts) => removeFoldersStart(entry.fileName, 2),
              // Only allow files/folders inside the curation folder
              filter: (entry, opts) => isInCurationFolder(entry.fileName),
            })
            .once('done', () => { resolve(); });
          });
          break;
        case CurationSource.FOLDER:
          // Create promises that copies one content file each
          const promises: Promise<void>[] = [];
          const contentPath = path.join(curation.source, 'content');
          for (let content of curation.content) {
            // Check if the content is a file (all folders end with "/")
            if (!content.fileName.endsWith('/')) {
              // Create promise
              promises.push(new Promise((resolve, reject) => {
                // Copy file from the curation source folder
                fs.copyFile(
                  path.join(contentPath, content.fileName),
                  path.join(GameLauncher.getHtdocsPath(), content.fileName),
                  error => {
                    if (error) { reject(error); }
                    else       { resolve();     }
                  }
                );
              }));
            }
          }
          // Run all promises
          await Promise.all(promises);
          break;
      }
    })(),
  ]);
}

/**
 * Create a game info from a curation.
 * @param curation Curation to get data from.
 */
function createGameFromCurationMeta(curation: EditCuration): IGameInfo {
  const meta = curation.meta;
  return {
    id:              curation.key, // (Re-use the id of the curation)
    title:           meta.title           || '',
    series:          meta.series          || '',
    developer:       meta.developer       || '',
    publisher:       meta.publisher       || '',
    dateAdded:       formatDate(new Date()),
    platform:        meta.platform        || '',
    broken:          false,
    extreme:         !!stringToBool(meta.extreme || ''),
    playMode:        'Single Player',
    status:          meta.status          || '',
    notes:           meta.notes           || '',
    genre:           meta.genre           || '',
    source:          meta.source          || '',
    applicationPath: meta.applicationPath || '',
    launchCommand:   meta.launchCommand   || '',
    filename: '', // This will be set when saved
    orderTitle: '', // This will be set when saved
    placeholder: false,
  };
}

/**
 * Create an array of additional application infos from a curation.
 * @param curation Curation to get data from.
 */
function createAddAppsFromCurationMeta(curation: EditCuration): IAdditionalApplicationInfo[] {
  return curation.addApps.map<IAdditionalApplicationInfo>(addApp => {
    const meta = addApp.meta;
    return {
      id: addApp.key,
      gameId: curation.key,
      applicationPath: meta.applicationPath || '',
      commandLine: meta.launchCommand || '',
      name: meta.heading || '',
      autoRunBefore: false,
      waitForExit: false,
    };
  });
}

/**
 * Import a game image (thumbnail or screenshot).
 * @param image Image to import.
 * @param game Game the image "belongs" to.
 * @param cache Cache to import the image to.
 */
async function importGameImage(image: CurationIndexImage, cache: ImageFolderCache, game: IGameInfo): Promise<void> {
  if (image.exists) {
    // Check if the image is its own file
    if (image.filePath !== undefined) {
      await copyGameImageFile(image.filePath, game, cache);
    }
    // Check if the image is extracted
    else if (image.fileName !== undefined && image.rawData !== undefined) {
      await createGameImageFileFromData(image.rawData, getFileExtension(image.fileName), game, cache);
    }
  }
}

/**
 * Remove a number of folders from the start of a path.
 * Example: ("a/b/c/d.txt", 2) => "c/d.txt"
 * @param filePath Path to remove folders from.
 * @param count Number of folders to remove.
 * @param separator Separator between file and folder names.
 */
function removeFoldersStart(filePath: string, count: number, separator: string = '/'): string {
  const splits = filePath.split(separator);
  splits.splice(0, count);
  return splits.join(separator);
}

/**
 * Convert a string to a boolean (case insensitive).
 * @param str String to convert ("Yes" is true, "No" is false).
 * @param defaultVal Value returned if the string is neither true nor false.
 */
export function stringToBool(str: string, defaultVal: boolean = false): boolean {
  const lowerStr = str.toLowerCase();
  if (lowerStr === 'yes') { return true;  }
  if (lowerStr === 'no' ) { return false; }
  return defaultVal;
}
