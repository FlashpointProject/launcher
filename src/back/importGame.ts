import { exec } from 'child_process';
import { remote } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as YAML from 'yaml';
import { htdocsPath, LOGOS, SCREENSHOTS } from '../shared/constants';
import { convertEditToCurationMeta } from '../shared/curate/metaToMeta';
import { CurationIndexImage, EditAddAppCuration, EditCuration } from '../shared/curate/types';
import { getContentFolderByKey, getCurationFolder, indexContentFolder } from '../shared/curate/util';
import { IAdditionalApplicationInfo, IGameInfo } from '../shared/game/interfaces';
import { ILogPreEntry } from '../shared/Log/interface';
import { formatDate, sizeToString } from '../shared/Util';
import { Coerce } from '../shared/utils/Coerce';
import { GameManager } from './game/GameManager';
import { GameLauncher, LaunchAddAppOpts, LaunchGameOpts } from './GameLauncher';
import { ensurePath } from './util/misc';
import { uuid } from './util/uuid';

const { strToBool } = Coerce;

const access = promisify(fs.access);
const copyFile = promisify(fs.copyFile);
const lstat = promisify(fs.lstat);
const readFile = promisify(fs.readFile);
const rename = promisify(fs.rename);
const rmdir = promisify(fs.rmdir);
const symlink = promisify(fs.symlink);
const writeFile = promisify(fs.writeFile);

type ImportCurationOpts = {
  curation: EditCuration;
  games: GameManager;
  /** If the status should be logged to the console (for debugging purposes). */
  log?: LogFn;
  date?: Date;
  saveCuration: boolean;
  fpPath: string;
  imageFolderPath: string;
}

/**
 * Import a curation.
 * @returns A promise that resolves when the import is complete.
 */
export async function importCuration(opts: ImportCurationOpts): Promise<void> {
  if (opts.date === undefined) { opts.date = new Date(); }
  const {
    curation,
    games,
    log,
    date,
    saveCuration,
    fpPath,
    imageFolderPath: imagePath,
  } = opts;

  const logMsg = logMessage || noop;

  // TODO: Consider moving this check outside importCuration
  // Warn if launch command is already present on another game
  const existingGame = games.findGame(g => g.launchCommand === curation.meta.launchCommand);
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
      throw new Error('User Cancelled Import');
    }
  }
  // Build content list
  const contentToMove = [
    [getContentFolderByKey(curation.key), path.join(fpPath, htdocsPath)]
  ];
  const extrasAddApp = curation.addApps.find(a => a.meta.applicationPath === ':extras:');
  if (extrasAddApp && extrasAddApp.meta.launchCommand && extrasAddApp.meta.launchCommand.length > 0) {
    // Add extras folder if meta has an entry
    contentToMove.push([path.join(getCurationFolder(curation), 'Extras'), path.join(window.External.config.fullFlashpointPath, 'Extras', extrasAddApp.meta.launchCommand)]);
  }
  // Create and add game and additional applications
  const gameId = uuid();
  const game = createGameFromCurationMeta(gameId, curation, date);
  const addApps = createAddAppsFromCurationMeta(gameId, curation.addApps);
  // Make a copy if not deleting the curation afterwards
  const moveFiles = !saveCuration;
  curationLog(log, 'Importing Curation Meta');
  // Copy/extract content and image files
  // @TODO "updateMetas" does not indicate when it is done, which could be a problem
  //       since this used to await for it to complete.
  games.updateMetas({
    games: [game],
    addApps: addApps,
    saveToDisk: true,
  });
  //.then(() => { if (log) { logMsg('Meta Added', curation); } }),

  // Copy Thumbnail
  curationLog(log, 'Importing Curation Thumbnail');
  await importGameImage(curation.thumbnail, game.id, LOGOS, path.join(fpPath, imagePath), log)
  .then(() => { if (log) { logMsg('Thumbnail Copied', curation); } });

  // Copy Screenshot
  curationLog(log, 'Importing Curation Screenshot');
  await importGameImage(curation.screenshot, game.id, SCREENSHOTS, path.join(fpPath, imagePath), log)
  .then(() => { if (log) { logMsg('Screenshot Copied', curation); } });

  // Copy content and Extra files
  curationLog(log, 'Importing Curation Content');
  await (async () => {
    // Copy each paired content folder one at a time (allows for cancellation)
    for (let pair of contentToMove) {
      await copyFolder(pair[0], pair[1], moveFiles, log);
    }
  })()
  .then(async () => {
    curationLog(log, 'Saving Imported Content');
    try {
      if (saveCuration) {
        // Save working meta
        const metaPath = path.join(getCurationFolder(curation), 'meta.yaml');
        const meta = YAML.stringify(convertEditToCurationMeta(curation.meta, curation.addApps));
        await writeFile(metaPath, meta);
        // Date in form 'YYYY-MM-DD' for folder sorting
        const date = new Date();
        const dateStr = date.getFullYear().toString() + '-' +
                        date.getUTCMonth().toString().padStart(2, '0') + '-' +
                        date.getUTCDay().toString().padStart(2, '0');
        const backupPath = path.join(window.External.config.fullFlashpointPath, 'Curations', '_Imported', `${dateStr}__${curation.key}`);
        await copyFolder(getCurationFolder(curation), backupPath, true, log);
      }
      if (log) {
        logMsg('Content Copied', curation);
      }
    } catch (error) {
      curationLog(log, `Error importing ${curation.meta.title} - Informing user...`);
      const res = remote.dialog.showMessageBoxSync({
        title: 'Error saving curation',
        message: 'Saving curation import failed. Some/all files failed to move. Please check the content folder yourself before removing manually.\n\nOpen folder now?',
        buttons: ['Yes', 'No']
      });
      if (res === 0) {
        console.log('Opening curation folder after error');
        remote.shell.openItem(getCurationFolder(curation));
      }
    }
  })
  .catch((error) => {
    curationLog(log, error.message);
    console.warn(error.message);
  });
}

/**
 * Create and launch a game from curation metadata.
 * @param curation Curation to launch
 */
export async function launchCuration(curation: EditCuration, opts: Omit<LaunchGameOpts, 'game'|'addApps'>) {
  await linkContentFolder(curation.key, opts.fpPath);
  curationLog(opts.log, `Launching Curation ${curation.meta.title}`);
  const game = createGameFromCurationMeta(curation.key, curation, new Date());
  const addApps = createAddAppsFromCurationMeta(curation.key, curation.addApps);
  GameLauncher.launchGame({
    ...opts,
    game,
    addApps,
  });
}

/**
 * Create and launch an additional application from curation metadata.
 * @param curationKey Key of the parent curation index
 * @param appCuration Add App Curation to launch
 */
export async function launchAddAppCuration(curationKey: string, appCuration: EditAddAppCuration, opts: Omit<LaunchAddAppOpts, 'addApp'>) {
  await linkContentFolder(curationKey, opts.fpPath);
  const addApps = createAddAppsFromCurationMeta(curationKey, [appCuration]);
  GameLauncher.launchAdditionalApplication({
    ...opts,
    addApp: addApps[0],
  });
}

function logMessage(text: string, curation: EditCuration): void {
  console.log(`- ${text}\n  (id: ${curation.key})`);
}

function noop(...args: any) {}

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
    extreme:             !!strToBool(meta.extreme || ''),
    library: '', // This will be set when saved
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

async function importGameImage(image: CurationIndexImage, gameId: string, folder: typeof LOGOS | typeof SCREENSHOTS, fullImagePath: string, log: LogFn | undefined): Promise<void> {
  if (image.exists) {
    const last = path.join(gameId.substr(0, 2), gameId.substr(2, 2), gameId+'.png');
    const imagePath = path.join(fullImagePath, folder, last);
    if (imagePath.startsWith(fullImagePath)) { // (Make sure the image path does not climb out of the image folder)
      // Check if the image is its own file
      if (image.filePath !== undefined) {
        await ensurePath(path.dirname(imagePath));
        await copyOrMoveFile(image.filePath, imagePath, false, log);
      }
      // Check if the image is extracted
      else if (image.fileName !== undefined && image.rawData !== undefined) {
        await writeFile(imagePath, image.rawData);
      }
    }
  }
}

/** Symlinks (or copies if unavailble) a curations `content` folder to `htdocs\content`
 * @param curationKey Key of the (game) curation to link
 */
async function linkContentFolder(curationKey: string, fpPath: string) {
  const curationPath = path.join(window.External.config.fullFlashpointPath, 'Curations', curationKey);
  const htdocsContentPath = path.join(fpPath, htdocsPath, 'content');
  // Clear out old folder if exists
  console.log('Removing old Server/htdocs/content ...');
  await access(htdocsContentPath, fs.constants.F_OK)
    .then(() => rmdir(htdocsContentPath))
    .catch((error) => { /* No file is okay, ignore error */ });
  const contentPath = path.join(curationPath, 'content');
  console.log('Building new Server/htdocs/content ...');
  if (fs.existsSync(contentPath)) {
    if (process.platform === 'win32') {
      // Use symlinks on windows if running as Admin - Much faster than copying
      await new Promise((resolve) => {
        exec('NET SESSION', async (err,so,se) => {
          if (se.length === 0) {
            console.log('Linking...');
            await symlink(contentPath, htdocsContentPath);
            console.log('Linked!!');
            resolve();
          } else {
            console.log('Copying...');
            await copyFile(contentPath, htdocsContentPath);
            console.log('Copied!');
            resolve();
          }
        });
      });
    } else {
      console.log('Copying...');
      await copyFile(contentPath, htdocsContentPath);
      console.log('Copied!');
    }
  }
}

/**
 * Move a folders contents to another, with warnings for overwrites
 * @param inFolder Folder to copy from
 * @param outFolder Folder to copy to
 */
async function copyFolder(inFolder: string, outFolder: string, move: boolean, log: LogFn | undefined) {
  const contentIndex = await indexContentFolder(inFolder, curationLog.bind(undefined, log));
  let yesToAll = false;
  return Promise.all(
    contentIndex.map(async (content) => {
      // For checking cancel at end
      let cancel = false;
      const source = path.join(inFolder, content.filePath);
      const dest = path.join(outFolder, content.filePath);
      // Ensure that the folders leading up to the file exists
      await ensurePath(path.dirname(dest));
      await access(dest, fs.constants.F_OK)
      .then(async () => {
        // Ask to overwrite if file already exists
        const filesDifferent = !(await equalFileHashes(source, dest));
        // Only ask when files don't match
        if (filesDifferent) {
          if (!yesToAll) {
            copyOrMoveFile(source, dest, move, log);
            return;
          }
          const newStats = await lstat(source);
          const currentStats = await lstat(dest);
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
              copyOrMoveFile(source, dest, move, log);
              break;
            case 2:
              yesToAll = true;
              copyOrMoveFile(source, dest, move, log);
              break;
            case 3:
              cancel = true;
              break;
          }
          if (response === 0) {
            copyOrMoveFile(source, dest, move, log);
          }
          if (response === 2) { cancel = true; }
        }
      })
      .catch(async () => {
        // Dest file doesn't exist, just move
        copyOrMoveFile(source, dest, move, log);
      });
      if (cancel) { throw Error('Import cancelled by user.'); }
    })
  )
  .catch((error) => {
    throw error;
  });
}

async function copyOrMoveFile(source: string, dest: string, move: boolean, log: LogFn | undefined) {
  try {
    if (move) { await rename(source, dest); } // @TODO Make sure this overwrites files
    else      { await copyFile(source, dest); }
  } catch (error) {
    curationLog(log, `Error copying file '${source}' to '${dest}' - ${error.message}`);
    if (move) {
      curationLog(log, 'Attempting to copy file instead of move...');
      try {
        await copyFile(source, dest);
      } catch (error) {
        curationLog(log, 'Copy unsuccessful');
        throw error;
      }
      curationLog(log, 'Copy successful');
    }
  }
}

type LogFn = (entry: ILogPreEntry) => void;
function curationLog(log: LogFn | undefined, content: string): void {
  if (log) {
    log({
      source: 'Curate',
      content,
    });
  }
}

/**
 * Check whether 2 files hashes match
 * @param filePath First file to compare
 * @param secondFilePath Second file to compare
 * @returns True if matching, false if not.
 */
async function equalFileHashes(filePath: string, secondFilePath: string) {
  // Hash first file
  const buffer = await readFile(filePath);
  const secondBuffer = await readFile(secondFilePath);
  return buffer.equals(secondBuffer);
}
