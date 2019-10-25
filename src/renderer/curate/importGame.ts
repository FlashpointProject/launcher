import { exec } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { IAdditionalApplicationInfo, IGameInfo } from '../../shared/game/interfaces';
import { IGameLibraryFileItem } from '../../shared/library/interfaces';
import { formatDate, removeFileExtension } from '../../shared/Util';
import { EditAddAppCuration, EditCuration } from '../context/CurationContext';
import GameManager from '../game/GameManager';
import { formatUnknownPlatformName } from '../game/util';
import { GameLauncher } from '../GameLauncher';
import { GameImageCollection } from '../image/GameImageCollection';
import { ImageFolderCache } from '../image/ImageFolderCache';
import { getImageFolderName } from '../image/util';
import { getFileExtension, sizeToString } from '../Util';
import { copyGameImageFile, createGameImageFileFromData } from '../util/game';
import { uuid } from '../uuid';
import { CurationIndexImage, indexContentFolder } from './importCuration';
import { getContentFolderByKey } from './util';
import { remote } from 'electron';


/**
 * Import a curation.
 * @param curation Curation to import.
 * @param games Games manager to add the newly created game to.
 * @param gameImages Image collection to add the game images to.
 * @param log If the status should be logged to the console (for debugging purposes).
 * @returns A promise that resolves when the import is complete.
 */
export async function importCuration(
  curation: EditCuration, games: GameManager, gameImages: GameImageCollection,
  libraries: IGameLibraryFileItem[], log: boolean = false
): Promise<void> {
  // Refresh content before importing
  curation.content = await indexContentFolder(getContentFolderByKey(curation.key));
  // Find the library and get its prefix
  const library = libraries.find(lib => lib.route === curation.meta.library);
  const libraryPrefix = library && library.prefix || '';
  // Create and add game and additional applications
  const gameId = uuid();
  const game = createGameFromCurationMeta(gameId, curation);
  const addApps = createAddAppsFromCurationMeta(gameId, curation.addApps);
  // Get the nome of the folder to put the images in
  const imageFolderName = (
    getImageFolderName(game, libraryPrefix, true) ||
    removeFileExtension(formatUnknownPlatformName(libraryPrefix))
  );
  // Copy/extract content and image files
  await Promise.all([
    games.addOrUpdateGame({ game, addApps, library, saveToFile: true })
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
        curation.content.map(async (content) => {
            // Check for cancel at end
            let cancel = false;
            // Copy file from the curation source folder
            const source = path.join(contentPath, content.filePath);
            const output = path.join(GameLauncher.getHtdocsPath(), content.filePath);
            // Ensure that the folders leading up to the file exists
            await fs.ensureDir(path.dirname(output));
            // Ask to overwrite if file already exists
            await fs.access(output, fs.constants.F_OK)
              .then(async () => {
                const newStats = await fs.lstat(source);
                const currentStats = await fs.lstat(output);
                // Only ask when sizes are different
                if (newStats.size != currentStats.size) {
                  const response = remote.dialog.showMessageBoxSync({
                    type: 'warning',
                    title: 'Import Warning',
                    message: 'Overwrite File?\n' +
                            `${content.filePath}\n` +
                            `Current File: ${sizeToString(currentStats.size)} (${currentStats.size} Bytes)\n`+
                            `New File: ${sizeToString(newStats.size)} (${newStats.size} Bytes)`,
                    buttons: ['Yes', 'No', 'Cancel']
                  });
                  if (response === 0) {
                    await fs.move(source, output, { overwrite: true });
                  }
                  if (response === 2) { cancel = true; }
                }
              })
              // Dest file doesn't exist, just move
              .catch(async () => {
                await fs.move(source, output);
              });
            if (cancel) { throw Error('Import cancelled by user.'); }
        })
      );
    })()
    .then(() => { if (log) { logMsg('Content Copied', curation); } })
  ]);
}

function logMsg(text: string, curation: EditCuration): void {
  console.log(`- ${text}\n  (id: ${curation.key})`);
}

/**
 * Create a game info from a curation.
 * @param curation Curation to get data from.
 * @param gameId ID to use for Game
 */
function createGameFromCurationMeta(gameId: string, curation: EditCuration): IGameInfo {
  const meta = curation.meta;
  return {
    id:                  gameId, // (Re-use the id of the curation)
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
      id: uuid(),
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
  const game = createGameFromCurationMeta(curation.key, curation);
  const addApps = createAddAppsFromCurationMeta(curation.key, curation.addApps);
  GameLauncher.launchGame(game, addApps);
}

/**
 * Create and launch an additional application from curation metadata.
 * @param curationKey Key of the parent curation index
 * @param appCuration Add App Curation to launch
 */
export function launchAddAppCuration(curationKey: string, appCuration: EditAddAppCuration) {
  linkContentFolder(curationKey);
  const addApp = createAddAppsFromCurationMeta(curationKey, [appCuration]);
  GameLauncher.launchAdditionalApplication(addApp[0]);
}

/** Symlinks (or copies if unavailble) a curations `content` folder to `htdocs\content`
 * @param curationKey Key of the (game) curation to link
 */
async function linkContentFolder(curationKey: string) {
  const curationPath = path.join(window.External.config.fullFlashpointPath, 'Curations', curationKey);
  const htdocsContentPath = path.join(GameLauncher.getHtdocsPath(), 'content');
  // Clear out old folder if exists
  await fs.access(htdocsContentPath, fs.constants.F_OK)
    .then(() => fs.remove(htdocsContentPath))
    .catch((error) => { /* No file is okay, ignore error */ });
  const contentPath = path.join(curationPath, 'content');
  if (fs.existsSync(contentPath)) {
    if (process.platform === 'win32') {
      // Use symlinks on windows if running as Admin - Much faster than copying
      await new Promise(() => {
        exec('NET SESSION', (err,so,se) => {
          if (se.length === 0) {
            return fs.symlink(contentPath, htdocsContentPath);
          } else {
            return fs.copy(contentPath, htdocsContentPath);
          }
        });
      });
    } else {
      await fs.copy(contentPath, htdocsContentPath);
    }
  }
}