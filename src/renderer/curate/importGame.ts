import { exec } from 'child_process';
import { remote } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import { IAdditionalApplicationInfo, IGameInfo } from '../../shared/game/interfaces';
import { GameLibraryFileItem } from '../../shared/library/types';
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
import { curationLog, getContentFolderByKey, getCurationFolder } from './util';


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
  libraries: GameLibraryFileItem[], log: boolean = false, date: Date = new Date(),
  saveCuration: boolean
): Promise<void> {
  // TODO: Consider moving this check outside importCuration
  // Warn if launch command is already present on another game
  const existingGame = games.collection.games.find(g => g.launchCommand === curation.meta.launchCommand);
  if (existingGame) {
    // Warn user of possible duplicate
    const res = await remote.dialog.showMessageBox({
      title: 'Possible Duplicate',
      message: 'There is already a game using this launch command. It may be a duplicate.\nContinue importing this curation?\n\n'
               + `Curation:\n\tTitle: ${curation.meta.title}\n\tPlatform: ${curation.meta.platform}\n\n`
               + `Existing Game:\n\tID: ${existingGame.id}\n\tTitle: ${existingGame.title}\n\tPlatform: ${existingGame.platform}`,
      buttons: ['Yes', 'No']
    });
    if (res.response === 1) {
      throw 'User Cancelled Import';
    }
  }
  // Build content list
  const contentToMove = [
    [getContentFolderByKey(curation.key),                   GameLauncher.getHtdocsPath()]
  ];
  const extrasAddApp = curation.addApps.find(a => a.meta.applicationPath === ':extras:');
  if (extrasAddApp && extrasAddApp.meta.launchCommand && extrasAddApp.meta.launchCommand.length > 0) {
    // Add extras folder if meta has an entry
    contentToMove.push([path.join(getCurationFolder(curation), 'Extras'), path.join(window.External.config.fullFlashpointPath, 'Extras', extrasAddApp.meta.launchCommand)]);
  }
  // Find the library and get its prefix
  const library = libraries.find(lib => lib.route === curation.meta.library);
  const libraryPrefix = library && library.prefix || '';
  // Create and add game and additional applications
  const gameId = uuid();
  const game = createGameFromCurationMeta(gameId, curation, date);
  const addApps = createAddAppsFromCurationMeta(gameId, curation.addApps);
  // Get the nome of the folder to put the images in
  const imageFolderName = (
    getImageFolderName(game, libraryPrefix, true) ||
    removeFileExtension(formatUnknownPlatformName(libraryPrefix))
  );
  // Make a copy if not deleting the curation afterwards
  const moveFiles = !saveCuration;
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
    // Copy content and Extra files
    (async () => {
      // Copy each paired content folder one at a time (allows for cancellation)
      for (let pair of contentToMove) {
        await copyFolder(pair[0], pair[1], moveFiles);
      }
    })()
    .then(() => {
      if (saveCuration) {
        const date = new Date();
        // Date in form 'YYYY-MM-DD' for folder sorting
        const dateStr = date.getFullYear().toString() + '-' +
                        date.getUTCMonth().toString().padStart(2, '0') + '-' +
                        date.getUTCDay().toString().padStart(2, '0');
        const backupPath = path.join(window.External.config.fullFlashpointPath, 'Curations', '_Imported', `${dateStr}__${curation.key}`);
        copyFolder(getCurationFolder(curation), backupPath, true);
      }
      if (log) {
        logMsg('Content Copied', curation);
      }
    })
    .catch((error) => {
      curationLog(error.message);
      console.warn(error.message);
    })
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
function createGameFromCurationMeta(gameId: string, curation: EditCuration, date: Date): IGameInfo {
  const meta = curation.meta;
  return {
    id:                  gameId, // (Re-use the id of the curation)
    title:               meta.title               || '',
    alternateTitles:     meta.alternateTitles     || '',
    series:              meta.series              || '',
    developer:           meta.developer           || '',
    publisher:           meta.publisher           || '',
    platform:            meta.platform            || '',
    playMode:            meta.playMode            || '',
    status:              meta.status              || '',
    notes:               meta.notes               || '',
    tags:                meta.tags                || '',
    source:              meta.source              || '',
    applicationPath:     meta.applicationPath     || '',
    launchCommand:       meta.launchCommand       || '',
    releaseDate:         meta.releaseDate         || '',
    version:             meta.version             || '',
    originalDescription: meta.originalDescription || '',
    language:            meta.language            || '',
    dateAdded:           formatDate(date),
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
      launchCommand: meta.launchCommand || '',
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
export async function launchCuration(curation: EditCuration) {
  await linkContentFolder(curation.key);
  console.log('Finished linking');
  const game = createGameFromCurationMeta(curation.key, curation, new Date());
  const addApps = createAddAppsFromCurationMeta(curation.key, curation.addApps);
  GameLauncher.launchGame(game, addApps);
}

/**
 * Create and launch an additional application from curation metadata.
 * @param curationKey Key of the parent curation index
 * @param appCuration Add App Curation to launch
 */
export async function launchAddAppCuration(curationKey: string, appCuration: EditAddAppCuration) {
  await linkContentFolder(curationKey);
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
  console.log('removing old content');
  await fs.access(htdocsContentPath, fs.constants.F_OK)
    .then(() => fs.remove(htdocsContentPath))
    .catch((error) => { /* No file is okay, ignore error */ });
  const contentPath = path.join(curationPath, 'content');
  console.log(contentPath);
  if (fs.existsSync(contentPath)) {
    console.log('content exists');
    if (process.platform === 'win32') {
      // Use symlinks on windows if running as Admin - Much faster than copying
      await new Promise((resolve) => {
        exec('NET SESSION', async (err,so,se) => {
          if (se.length === 0) {
            await fs.symlink(contentPath, htdocsContentPath);
            resolve();
          } else {
            console.log('Copying...');
            await fs.copy(contentPath, htdocsContentPath);
            console.log('Copied!');
            resolve();
          }
        });
      });
    } else {
      console.log('Copying...');
      await fs.copy(contentPath, htdocsContentPath);
      console.log('Copied!');
    }
  }
}

/**
 * Move a folders contents to another, with warnings for overwrites
 * @param inFolder Folder to copy from
 * @param outFolder Folder to copy to
 */
async function copyFolder(inFolder: string, outFolder: string, move: boolean) {
  const contentIndex = await indexContentFolder(inFolder);
  let yesToAll = false;
  return Promise.all(
    contentIndex.map(async (content) => {
      // For checking cancel at end
      let cancel = false;
      const source = path.join(inFolder, content.filePath);
      const dest = path.join(outFolder, content.filePath);
      // Ensure that the folders leading up to the file exists
      await fs.ensureDir(path.dirname(dest));
      await fs.access(dest, fs.constants.F_OK)
      .then(async () => {
        // Ask to overwrite if file already exists
        const filesDifferent = !(await equalFileHashes(source, dest));
        // Only ask when files don't match
        if (filesDifferent) {
          if (!yesToAll) {
            copyFile(source, dest, move);
            return;
          }
          const newStats = await fs.lstat(source);
          const currentStats = await fs.lstat(dest);
          const response = remote.dialog.showMessageBoxSync({
            type: 'warning',
            title: 'Import Warning',
            message: 'Overwrite File?\n' +
                    `${content.filePath}\n` +
                    `Current File: ${sizeToString(currentStats.size)} (${currentStats.size} Bytes)\n`+
                    `New File: ${sizeToString(newStats.size)} (${newStats.size} Bytes)`,
            buttons: ['Yes', 'No', 'Yes to All', 'Cancel']
          });
          switch (response) {
            case 0:
              copyFile(source, dest, move);
              break;
            case 2:
              yesToAll = true;
              copyFile(source, dest, move);
              break;
            case 3:
              cancel = true;
              break;
          }
          if (response === 0) {
            copyFile(source, dest, move);
          }
          if (response === 2) { cancel = true; }
        }
      })
      .catch(async () => {
        // Dest file doesn't exist, just move
        copyFile(source, dest, move);
      });
      if (cancel) { throw Error('Import cancelled by user.'); }
    })
  )
  .catch((error) => {
    throw error;
  });
}

async function copyFile(source: string, dest: string, move: boolean) {
  if (move) { await fs.move(source, dest, { overwrite: true }); }
  else      { await fs.copyFile(source, dest); }
}

/**
 * Check whether 2 files hashes match
 * @param filePath First file to compare
 * @param secondFilePath Second file to compare
 * @returns True if matching, false if not.
 */
async function equalFileHashes(filePath: string, secondFilePath: string) {
  // Hash first file
  const buffer = await fs.readFile(filePath);
  const secondBuffer = await fs.readFile(secondFilePath);
  return buffer.equals(secondBuffer);
}