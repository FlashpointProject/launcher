import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import { validateSemiUUID } from '@renderer/util/uuid';
import { htdocsPath, LOGOS, SCREENSHOTS } from '@shared/constants';
import { convertEditToCurationMeta } from '@shared/curate/metaToMeta';
import { CurationIndexImage, EditAddAppCuration, EditAddAppCurationMeta, EditCuration, EditCurationMeta } from '@shared/curate/types';
import { getContentFolderByKey, getCurationFolder, indexContentFolder } from '@shared/curate/util';
import { sizeToString } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import { execFile } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as YAML from 'yaml';
import { GameManager } from './game/GameManager';
import { TagManager } from './game/TagManager';
import { GameManagerState } from './game/types';
import { GameLauncher, LaunchAddAppOpts, LaunchGameOpts } from './GameLauncher';
import { LogFunc, OpenDialogFunc, OpenExternalFunc } from './types';
import { getMklinkBatPath } from './util/elevate';
import { uuid } from './util/uuid';

const { strToBool } = Coerce;

type ImportCurationOpts = {
  curation: EditCuration;
  gameManager: GameManagerState;
  /** If the status should be logged to the console (for debugging purposes). */
  log?: LogFunc;
  date?: Date;
  saveCuration: boolean;
  fpPath: string;
  imageFolderPath: string;
  openDialog: OpenDialogFunc;
  openExternal: OpenExternalFunc;
  tagCategories: TagCategory[];
}

/**
 * Import a curation.
 * @returns A promise that resolves when the import is complete.
 */
export async function importCuration(opts: ImportCurationOpts): Promise<void> {
  if (opts.date === undefined) { opts.date = new Date(); }
  const {
    curation,
    log,
    date,
    saveCuration,
    fpPath,
    imageFolderPath: imagePath,
  } = opts;

  const logMsg = logMessage || noop;

  // TODO: Consider moving this check outside importCuration
  // Warn if launch command is already present on another game
  if (curation.meta.launchCommand) {
    const existingGame = await GameManager.findGame(undefined, {
      where: {
        launchCommand: curation.meta.launchCommand
      }
    });
    if (existingGame) {
      // Warn user of possible duplicate
      const response = await opts.openDialog({
        title: 'Possible Duplicate',
        message: 'There is already a game using this launch command. It may be a duplicate.\nContinue importing this curation?\n\n'
                + `Curation:\n\tTitle: ${curation.meta.title}\n\tLaunch Command: ${curation.meta.launchCommand}\n\tPlatform: ${curation.meta.platform}\n\n`
                + `Existing Game:\n\tID: ${existingGame.id}\n\tTitle: ${existingGame.title}\n\tPlatform: ${existingGame.platform}`,
        buttons: ['Yes', 'No']
      });
      if (response === 1) {
        throw new Error('User Cancelled Import');
      }
    }
  }
  // Build content list
  const contentToMove = [
    [getContentFolderByKey(curation.key, fpPath), path.join(fpPath, htdocsPath)]
  ];
  const extrasAddApp = curation.addApps.find(a => a.meta.applicationPath === ':extras:');
  if (extrasAddApp && extrasAddApp.meta.launchCommand && extrasAddApp.meta.launchCommand.length > 0) {
    // Add extras folder if meta has an entry
    contentToMove.push([path.join(getCurationFolder(curation, fpPath), 'Extras'), path.join(fpPath, 'Extras', extrasAddApp.meta.launchCommand)]);
  }
  // Create and add game and additional applications
  const gameId = validateSemiUUID(curation.key) ? curation.key : uuid();
  const oldGame = await GameManager.findGame(gameId);
  if (oldGame) {
    const response = await opts.openDialog({
      title: 'Overwriting Game',
      message: 'There is already a game using this id. Importing will override it.\nContinue importing this curation?\n\n'
              + `Curation:\n\tTitle: ${curation.meta.title}\n\tLaunch Command: ${curation.meta.launchCommand}\n\tPlatform: ${curation.meta.platform}\n\n`
              + `Existing Game:\n\tTitle: ${oldGame.title}\n\tLaunch Command: ${oldGame.launchCommand}\n\tPlatform: ${oldGame.platform}`,
      buttons: ['Yes', 'No']
    });
    if (response === 1) {
      throw new Error('User Cancelled Import');
    }
  }
  const game = await createGameFromCurationMeta(gameId, curation.meta, curation.addApps, date);
  // Make a copy if not deleting the curation afterwards
  const moveFiles = !saveCuration;
  curationLog(log, 'Importing Curation Meta');
  // Copy/extract content and image files
  GameManager.updateGame(game).then(() => logMsg('Meta Added', curation));

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
      await copyFolder(pair[0], pair[1], moveFiles, opts.openDialog, log);
    }
  })()
  .then(async () => {
    curationLog(log, 'Saving Imported Content');
    try {
      if (saveCuration) {
        // Save working meta
        const metaPath = path.join(getCurationFolder(curation, fpPath), 'meta.yaml');
        const meta = YAML.stringify(convertEditToCurationMeta(curation.meta, opts.tagCategories, curation.addApps));
        await fs.writeFile(metaPath, meta);
        // Date in form 'YYYY-MM-DD' for folder sorting
        const date = new Date();
        const dateStr = date.getFullYear().toString() + '-' +
                        (date.getUTCMonth() + 1).toString().padStart(2, '0') + '-' +
                        date.getUTCDate().toString().padStart(2, '0');
        const backupPath = path.join(fpPath, 'Curations', '_Imported', `${dateStr}__${curation.key}`);
        await copyFolder(getCurationFolder(curation, fpPath), backupPath, true, opts.openDialog, log);
      }
      if (log) {
        logMsg('Content Copied', curation);
      }
    } catch (error) {
      curationLog(log, `Error importing ${curation.meta.title} - Informing user...`);
      const res = await opts.openDialog({
        title: 'Error saving curation',
        message: 'Saving curation import failed. Some/all files failed to move. Please check the content folder yourself before removing manually.\n\nOpen folder now?',
        buttons: ['Yes', 'No']
      });
      if (res === 0) {
        console.log('Opening curation folder after error');
        opts.openExternal(getCurationFolder(curation, fpPath));
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
export async function launchCuration(key: string, meta: EditCurationMeta, addAppMetas: EditAddAppCurationMeta[], skipLink: boolean, opts: Omit<LaunchGameOpts, 'game'|'addApps'>) {
  if (!skipLink) { await linkContentFolder(key, opts.fpPath, opts.isDev, opts.exePath); }
  curationLog(opts.log, `Launching Curation ${meta.title}`);
  GameLauncher.launchGame({
    ...opts,
    game: await createGameFromCurationMeta(key, meta, [], new Date()),
  });
}

/**
 * Create and launch an additional application from curation metadata.
 * @param curationKey Key of the parent curation index
 * @param appCuration Add App Curation to launch
 */
export async function launchAddAppCuration(curationKey: string, appCuration: EditAddAppCuration, skipLink: boolean, opts: Omit<LaunchAddAppOpts, 'addApp'>) {
  if (!skipLink) { await linkContentFolder(curationKey, opts.fpPath, opts.isDev, opts.exePath); }
  GameLauncher.launchAdditionalApplication({
    ...opts,
    addApp: createAddAppFromCurationMeta(appCuration, createPlaceholderGame()),
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
async function createGameFromCurationMeta(gameId: string, gameMeta: EditCurationMeta, addApps : EditAddAppCuration[], date: Date): Promise<Game> {
  const game: Game = {
    id:                  gameId, // (Re-use the id of the curation)
    title:               gameMeta.title               || '',
    alternateTitles:     gameMeta.alternateTitles     || '',
    series:              gameMeta.series              || '',
    developer:           gameMeta.developer           || '',
    publisher:           gameMeta.publisher           || '',
    platform:            gameMeta.platform            || '',
    playMode:            gameMeta.playMode            || '',
    status:              gameMeta.status              || '',
    notes:               gameMeta.notes               || '',
    tags:                gameMeta.tags                || [],
    source:              gameMeta.source              || '',
    applicationPath:     gameMeta.applicationPath     || '',
    launchCommand:       gameMeta.launchCommand       || '',
    releaseDate:         gameMeta.releaseDate         || '',
    version:             gameMeta.version             || '',
    originalDescription: gameMeta.originalDescription || '',
    language:            gameMeta.language            || '',
    dateAdded:           date.toISOString(),
    dateModified:        date.toISOString(),
    broken:              false,
    extreme:             !!strToBool(gameMeta.extreme || ''),
    library:             gameMeta.library || '',
    orderTitle: '', // This will be set when saved
    addApps: [],
    placeholder: false
  };
  game.addApps = addApps.map(addApp => createAddAppFromCurationMeta(addApp, game));
  return game;
}

function createAddAppFromCurationMeta(addAppMeta: EditAddAppCuration, game: Game): AdditionalApp {
  return {
    id: addAppMeta.key,
    name: addAppMeta.meta.heading || '',
    applicationPath: addAppMeta.meta.applicationPath || '',
    launchCommand: addAppMeta.meta.launchCommand || '',
    autoRunBefore: false,
    waitForExit: false,
    parentGame: game
  };
}

async function importGameImage(image: CurationIndexImage, gameId: string, folder: typeof LOGOS | typeof SCREENSHOTS, fullImagePath: string, log: LogFunc | undefined): Promise<void> {
  if (image.exists) {
    const last = path.join(gameId.substr(0, 2), gameId.substr(2, 2), gameId+'.png');
    const imagePath = path.join(fullImagePath, folder, last);
    if (imagePath.startsWith(fullImagePath)) { // (Make sure the image path does not climb out of the image folder)
      // Check if the image is its own file
      if (image.filePath !== undefined) {
        await fs.promises.mkdir(path.dirname(imagePath), { recursive: true });
        await copyOrMoveFile(image.filePath, imagePath, false, log);
      }
      // Check if the image is extracted
      else if (image.fileName !== undefined && image.rawData !== undefined) {
        await fs.writeFile(imagePath, image.rawData);
      }
    }
  }
}

/** Symlinks (or copies if unavailble) a curations `content` folder to `htdocs\content`
 * @param curationKey Key of the (game) curation to link
 */
async function linkContentFolder(curationKey: string, fpPath: string, isDev: boolean, exePath: string) {
  const curationPath = path.join(fpPath, 'Curations', curationKey);
  const htdocsContentPath = path.join(fpPath, htdocsPath, 'content');
  // Clear out old folder if exists
  console.log('Removing old Server/htdocs/content ...');
  await fs.access(htdocsContentPath, fs.constants.F_OK)
    .then(() => fs.remove(htdocsContentPath))
    .catch((error) => { /* No file is okay, ignore error */ });
  const contentPath = path.join(curationPath, 'content');
  console.log('Linking new Server/htdocs/content ...');
  if (fs.existsSync(contentPath)) {
    if (process.platform === 'win32') {
      console.log('Linking...');
      // Start an elevated Batch script to do the link - Windows needs admin!
      const mklinkBatPath = getMklinkBatPath(isDev, exePath);
      const mklinkDir = path.dirname(mklinkBatPath);
      await new Promise((resolve, reject) => {
        execFile('mklink.bat', [`"${htdocsContentPath}"`, `"${contentPath}"`], { cwd: mklinkDir, shell: true }, (err, stdout, stderr) => {
          if (err) { reject();  }
          else     { resolve(); }
        });
      });
      console.log('Linked!');
    } else {
      console.log('Linking...');
      await fs.symlink(contentPath, htdocsContentPath);
      console.log('Linked!');
    }
  }
}

/**
 * Move a folders contents to another, with warnings for overwrites
 * @param inFolder Folder to copy from
 * @param outFolder Folder to copy to
 */
async function copyFolder(inFolder: string, outFolder: string, move: boolean, openDialog: OpenDialogFunc, log: LogFunc | undefined) {
  const contentIndex = await indexContentFolder(inFolder, curationLog.bind(undefined, log));
  let yesToAll = false;
  return Promise.all(
    contentIndex.map(async (content) => {
      // For checking cancel at end
      let cancel = false;
      const source = path.join(inFolder, content.filePath);
      const dest = path.join(outFolder, content.filePath);
      // Ensure that the folders leading up to the file exists
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await fs.access(dest, fs.constants.F_OK)
      .then(async () => {
        // Ask to overwrite if file already exists
        const filesDifferent = !(await equalFileHashes(source, dest));
        // Only ask when files don't match
        if (filesDifferent) {
          if (!yesToAll) {
            await copyOrMoveFile(source, dest, move, log);
            return;
          }
          const newStats = await fs.lstat(source);
          const currentStats = await fs.lstat(dest);
          const response = await openDialog({
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
              await copyOrMoveFile(source, dest, move, log);
              break;
            case 2:
              yesToAll = true;
              await copyOrMoveFile(source, dest, move, log);
              break;
            case 3:
              cancel = true;
              break;
          }
          if (response === 0) {
            await copyOrMoveFile(source, dest, move, log);
          }
          if (response === 2) { cancel = true; }
        }
      })
      .catch(async () => {
        // Dest file doesn't exist, just move
        copyOrMoveFile(source, dest, move, log);
      });
      if (cancel) { throw new Error('Import cancelled by user.'); }
    })
  );
}

async function copyOrMoveFile(source: string, dest: string, move: boolean, log: LogFunc | undefined) {
  try {
    if (move) { await fs.rename(source, dest); } // @TODO Make sure this overwrites files
    else      { await fs.copyFile(source, dest); }
  } catch (error) {
    curationLog(log, `Error copying file '${source}' to '${dest}' - ${error.message}`);
    if (move) {
      curationLog(log, 'Attempting to copy file instead of move...');
      try {
        await fs.copyFile(source, dest);
      } catch (error) {
        curationLog(log, 'Copy unsuccessful');
        throw error;
      }
      curationLog(log, 'Copy successful');
    }
  }
}

function curationLog(log: LogFunc | undefined, content: string): void {
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
  const buffer = await fs.readFile(filePath);
  const secondBuffer = await fs.readFile(secondFilePath);
  return buffer.equals(secondBuffer);
}

function createPlaceholderGame(): Game {
  const id = uuid();
  return {
    id: id,
    parentGameId: id,
    title: '',
    alternateTitles: '',
    series: '',
    developer: '',
    publisher: '',
    platform: '',
    dateAdded: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    broken: false,
    extreme: false,
    playMode: '',
    status: '',
    notes: '',
    tags: [],
    source: '',
    applicationPath: '',
    launchCommand: '',
    releaseDate: '',
    version: '',
    originalDescription: '',
    language: '',
    library: '',
    orderTitle: '',
    addApps: [],
    placeholder: true
  };
}

export async function createTagsFromLegacy(tags: string): Promise<Tag[]> {
  const allTags: Tag[] = [];

  for (let t of tags.split(';')) {
    const trimTag = t.trim();
    let tag = await TagManager.findTag(trimTag);
    if (!tag && trimTag !== '') {
      // Tag doesn't exist, make a new one
      tag = await TagManager.createTag(trimTag);
    }
    if (tag) {
      allTags.push(tag);
    }
  }

  return allTags.filter((v,i) => allTags.findIndex(v2 => v2.id == v.id) == i); // remove dupes
}