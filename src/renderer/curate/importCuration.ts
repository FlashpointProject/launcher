import * as fs from 'fs-extra';
import * as path from 'path';
import { promisify } from 'util';
import { IAdditionalApplicationInfo, IGameInfo } from '../../shared/game/interfaces';
import { formatDate, removeFileExtension } from '../../shared/Util';
import { EditAddAppCuration, EditCuration } from '../context/CurationContext';
import GameManager from '../game/GameManager';
import { formatUnknownPlatformName } from '../game/util';
import { GameLauncher } from '../GameLauncher';
import { GameImageCollection } from '../image/GameImageCollection';
import { ImageFolderCache } from '../image/ImageFolderCache';
import { getImageFolderName } from '../image/util';
import { getFileExtension } from '../Util';
import { copyGameImageFile, createGameImageFileFromData } from '../util/game';
import { CurationIndex, CurationIndexImage, importExistingCuration, indexContentFolder } from './indexCuration';
import { exec } from 'child_process';

const ensureDir = promisify(fs.ensureDir);

/**
 * Import a curation.
 * @param curation Curation to import.
 * @param games Games manager to add the newly created game to.
 * @param gameImages Image collection to add the game images to.
 * @param log If the status should be logged to the console (for debugging purposes).
 * @returns A promise that resolves when the import is complete.
 */
export async function importCuration(
  curation: EditCuration, games: GameManager, gameImages: GameImageCollection, log: boolean = false
): Promise<void> {
  // Make sure the content folder is an up to date index
  indexContentFolder(curation);
  // @TODO Add support for selecting what library to save the game to
  const libraryPrefix = '';
  // Create and add game and additional applications
  const game = createGameFromCurationMeta(curation);
  const addApps = createAddAppsFromCurationMeta(curation.key, curation.addApps);
  // Get the nome of the folder to put the images in
  const imageFolderName = (
    getImageFolderName(game, libraryPrefix, true) ||
    removeFileExtension(formatUnknownPlatformName(libraryPrefix))
  );
  // Copy/extract content and image files
  await Promise.all([
    games.addOrUpdateGame({ game, addApps, saveToFile: true })
    .then(() => { if (log) { logMsg('Meta Added', curation); } }),
    // Copy Thumbnail
    (async () => {
      const thumbnailCache = await gameImages.getOrCreateThumbnailCache(imageFolderName);
      await importGameImage(curation.thumbnail, thumbnailCache, game)
      .then(() => { thumbnailCache.refresh(); });
    })()
    .then(() => { if (log) { logMsg('Thumbnail Copied', curation); } }),
    // Copy Screenshot
    (async () => {
      const screenshotCache = await gameImages.getOrCreateScreenshotCache(imageFolderName);
      await importGameImage(curation.screenshot, screenshotCache, game)
      .then(() => { screenshotCache.refresh(); });
    })()
    .then(() => { if (log) { logMsg('Screenshot Copied', curation); } }),
    // Copy content files
    (async () => {
      const curationPath = path.join(window.External.config.fullFlashpointPath, 'Curations', curation.key);
      const contentPath = path.join(curationPath, 'content');
      // Create promises that copies one content file/folder each
      await Promise.all(
        curation.content.map(content => {
          // Check if the content is a folder (all folders end with "/")
          if (content.fileName.endsWith('/')) { // (Folder)
            return (async () => {
              // Create the folder if it is missing
              try { await ensureDir(path.join(GameLauncher.getHtdocsPath(), content.fileName), undefined); }
              catch (e) { /* Ignore error */ }
            })();
          } else { // (File)
            return (async () => {
              // Copy file from the curation source folder
              const source = path.join(contentPath, content.fileName);
              const output = path.join(GameLauncher.getHtdocsPath(), content.fileName);
              // Ensure that the folders leading up to the file exists
              try { await ensureDir(path.dirname(output), undefined); }
              catch (e) { /* Ignore error */ }
              // Move the file
              await fs.move(source, output, { overwrite: true });
            })();
          }
        })
      );
    })()
    .then(() => { if (log) { logMsg('Content Copied', curation); } }),
  ]);
}

function logMsg(text: string, curation: EditCuration): void {
  console.log(`- ${text}\n  (id: ${curation.key})`);
}

/**
 * Create a game info from a curation.
 * @param curation Curation to get data from.
 */
function createGameFromCurationMeta(curation: EditCuration): IGameInfo {
  const meta = curation.meta;
  return {
    id:                  curation.key, // (Re-use the id of the curation)
    title:               meta.title               || '',
    series:              meta.series              || '',
    developer:           meta.developer           || '',
    publisher:           meta.publisher           || '',
    platform:            meta.platform            || '',
    playMode:            meta.playMode            || '',
    status:              meta.status              || '',
    notes:               meta.notes               || '',
    genre:               meta.genre               || '',
    source:              meta.source              || '',
    applicationPath:     meta.applicationPath     || '',
    launchCommand:       meta.launchCommand       || '',
    releaseDate:         meta.releaseDate         || '',
    version:             meta.version             || '',
    originalDescription: meta.originalDescription || '',
    language:            meta.language            || '',
    dateAdded:           formatDate(new Date()),
    broken:              false,
    extreme:             !!stringToBool(meta.extreme || ''),
    filename: '', // This will be set when saved
    orderTitle: '', // This will be set when saved
    placeholder: false,
  };
}

/**
 * Create an array of additional application infos from a curation.
 * @param curation Curation to get data from.
 */
function createAddAppsFromCurationMeta(key: string, addApps: EditAddAppCuration[]): IAdditionalApplicationInfo[] {
  return addApps.map<IAdditionalApplicationInfo>(addApp => {
    const meta = addApp.meta;
    return {
      id: addApp.key,
      gameId: key,
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

/**
 * Create and launch a game from curation metadata.
 * @param curation Curation to launch
 */
export function launchCuration(curation: EditCuration) {
  linkContentFolder(curation.key);
  const game = createGameFromCurationMeta(curation);
  const addApps = createAddAppsFromCurationMeta(curation.key, curation.addApps);
  GameLauncher.launchGame(game, addApps);
}

/**
 * Create and launch an additional application from curation metadata.
 * @param curation Curation to launch
 */
export function launchAddAppCuration(curationKey: string, appCuration: EditAddAppCuration) {
  linkContentFolder(curationKey);
  const addApp = createAddAppsFromCurationMeta(curationKey, [appCuration]);
  GameLauncher.launchAdditionalApplication(addApp[0]);
}

/** Symlinks (or copies if symlink is unavailble) a curations `content` folder to `htdocs\content`
 * @params curationKey: Key of the (game) curation to link
 */
function linkContentFolder(curationKey: string) {
  const curationPath = path.join(window.External.config.fullFlashpointPath, 'Curations', curationKey);
  const serverPath = path.join(GameLauncher.getHtdocsPath(), 'content');
  // Clear out old folder if exists
  if (fs.existsSync(serverPath)) {
    fs.removeSync(serverPath);
  }
  const contentPath = path.join(curationPath, 'content');
  if (fs.existsSync(contentPath)) {
    // Use symlinks on windows if running as Admin
    if (process.platform === 'win32') {
      exec('NET SESSION', (err,so,se) => {
        if (se.length === 0) {
          console.log('SYM');
          fs.symlinkSync(contentPath, serverPath);
        } else {
          fs.copySync(contentPath, serverPath);
        }
      });
    } else {
      fs.copySync(contentPath, serverPath);
    }
  }
}

export async function getNewCurations(existingCurations: EditCuration[]): Promise<CurationIndex[]> {
  return new Promise<CurationIndex[]>((resolve) => {
    const curationsFolder = path.join(window.External.config.fullFlashpointPath, 'Curations');
    const files = fs.readdirSync(curationsFolder);
    const curations: Promise<CurationIndex>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fullPath = path.join(curationsFolder, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        // Make sure it doesn't already exist
        if (existingCurations.findIndex((item) => item.key === file) === -1) {
          curations.push(importExistingCuration(file));
        }
      }
    }
    Promise.all(curations)
    .then((curations) => {
      resolve(curations);
    });
  });
}