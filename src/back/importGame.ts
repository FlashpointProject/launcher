import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import { validateSemiUUID } from '@renderer/util/uuid';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import { convertEditToCurationMetaFile } from '@shared/curate/metaToMeta';
import { CurationIndexImage, EditAddAppCuration, EditAddAppCurationMeta, EditCuration, EditCurationMeta } from '@shared/curate/types';
import { getContentFolderByKey, getCurationFolder, indexContentFolder } from '@shared/curate/util';
import { sizeToString } from '@shared/Util';
import { execFile } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as YAML from 'yaml';
import { ApiEmitter } from './extensions/ApiEmitter';
import { GameManager } from './game/GameManager';
import { TagManager } from './game/TagManager';
import { GameManagerState } from './game/types';
import { GameLauncher, GameLaunchInfo, LaunchAddAppOpts, LaunchGameOpts } from './GameLauncher';
import { OpenExternalFunc, ShowMessageBoxFunc } from './types';
import { getMklinkBatPath } from './util/elevate';
import { uuid } from './util/uuid';

type ImportCurationOpts = {
  curation: EditCuration;
  gameManager: GameManagerState;
  date?: Date;
  saveCuration: boolean;
  fpPath: string;
  htdocsPath: string;
  imageFolderPath: string;
  openDialog: ShowMessageBoxFunc;
  openExternal: OpenExternalFunc;
  tagCategories: TagCategory[];
}

export type CurationImportState = {
  /** Game being imported */
  game: Game;
  /** Files being copied, and to where */
  contentToMove: string[][];
  /** Path of the curation */
  curationPath: string;
}

export const onWillImportCuration: ApiEmitter<CurationImportState> = new ApiEmitter<CurationImportState>();

/**
 * Import a curation.
 * @returns A promise that resolves when the import is complete.
 */
export async function importCuration(opts: ImportCurationOpts): Promise<void> {
  if (opts.date === undefined) { opts.date = new Date(); }
  const {
    htdocsPath,
    curation,
    date,
    saveCuration,
    fpPath,
    imageFolderPath: imagePath,
  } = opts;

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

  // Add game to database
  const game = await createGameFromCurationMeta(gameId, curation.meta, curation.addApps, date);
  GameManager.updateGame(game).then(() => logMessage('Meta Added', curation));

  // Store curation state for extension use later
  const curationState: CurationImportState = {
    game,
    contentToMove,
    curationPath: getCurationFolder(curation, fpPath)
  };

  // Copy content and Extra files
  // curationLog('Importing Curation Content');
  await (async () => {
    // Remove read-only flags from all files (since they can cause issues when moving/copying)
    // Note: This is only tested on Windows (Node's file permission implementation on Windows is incomplete, check the docs).
    if (process.platform === 'win32') {
      let didFail = false;
      for (const pair of contentToMove) {
        try {
          await iterateDirectory(pair[0], async (filePath, stats) => {
            try {
              let mode = stats.mode;
              mode = mode | 0o666; // read & write permissions for everyone
              if (mode !== stats.mode) { await fs.chmod(filePath, mode); }
            } catch (error) {
              curationLog(`Failed to get/set permissions of file (Path: "${filePath}").`);
              didFail = true;
            }
          });
        } catch (error) {
          curationLog(`Failed to iterate through files before copying (From: "${pair[0]}", To: "${pair[1]}"). Error: ${error}`);
          didFail = true;
        }
      }
      if (didFail) {
        curationLog('WARNING! One or more files failed to get unflagged as read-only. This may cause files to fail to import! Check the errors above for more information.');
      }
    }
  })()
  .then(async () => {
    // If configured, save a copy of the curation before importing
    curationLog('Saving Imported Content');
    try {
      if (saveCuration) {
        // Save working meta
        const metaPath = path.join(getCurationFolder(curation, fpPath), 'meta.yaml');
        const meta = YAML.stringify(convertEditToCurationMetaFile(curation.meta, opts.tagCategories, curation.addApps));
        await fs.writeFile(metaPath, meta);
        // Date in form 'YYYY-MM-DD' for folder sorting
        const date = new Date();
        const dateStr = date.getFullYear().toString() + '-' +
                        (date.getUTCMonth() + 1).toString().padStart(2, '0') + '-' +
                        date.getUTCDate().toString().padStart(2, '0');
        const backupPath = path.join(fpPath, 'Curations', 'Imported', `${dateStr}__${curation.key}`);
        await fs.copy(getCurationFolder(curation, fpPath), backupPath);
        // Why does this return before finishing copying? Replaced with line above for now.
        // await copyFolder(getCurationFolder(curation, fpPath), backupPath, true, opts.openDialog);
      }
      if (log) {
        logMessage('Content Copied', curation);
      }
    } catch (error) {
      curationLog(`Error importing ${curation.meta.title} - Informing user...`);
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
  .then(async () => {
    // Copy Thumbnail
    // curationLog('Importing Curation Thumbnail');
    await importGameImage(curation.thumbnail, game.id, LOGOS, path.join(fpPath, imagePath))
    .then(() => { if (log) { logMessage('Thumbnail Copied', curation); } });

    // Copy Screenshot
    // curationLog('Importing Curation Screenshot');
    await importGameImage(curation.screenshot, game.id, SCREENSHOTS, path.join(fpPath, imagePath))
    .then(() => { if (log) { logMessage('Screenshot Copied', curation); } });
  })
  .then(async () => {
    // Notify extensions and let them make changes
    await onWillImportCuration.fire(curationState);
  })
  .then(async () => {
    // Copy each paired content folder one at a time (allows for cancellation)
    for (const pair of curationState.contentToMove) {
      await fs.copy(pair[0], pair[1], { recursive: true, preserveTimestamps: true });
      // await copyFolder(pair[0], pair[1], moveFiles, opts.openDialog, log);
    }
  })
  .catch((error) => {
    curationLog(error.message);
    console.warn(error.message);
  });
}

/**
 * Create and launch a game from curation metadata.
 * @param curation Curation to launch
 */
export async function launchCuration(key: string, meta: EditCurationMeta, addAppMetas: EditAddAppCurationMeta[], symlinkCurationContent: boolean,
  skipLink: boolean, opts: Omit<LaunchGameOpts, 'game'|'addApps'>, onWillEvent:ApiEmitter<GameLaunchInfo>, onDidEvent: ApiEmitter<Game>) {
  if (!skipLink || !symlinkCurationContent) { await linkContentFolder(key, opts.fpPath, opts.isDev, opts.exePath, opts.htdocsPath, symlinkCurationContent); }
  curationLog(`Launching Curation ${meta.title}`);
  const game = await createGameFromCurationMeta(key, meta, [], new Date());
  GameLauncher.launchGame({
    ...opts,
    game: game,
  },
  onWillEvent);
  onDidEvent.fire(game);
}

/**
 * Create and launch an additional application from curation metadata.
 * @param curationKey Key of the parent curation index
 * @param appCuration Add App Curation to launch
 */
export async function launchAddAppCuration(curationKey: string, appCuration: EditAddAppCuration, symlinkCurationContent: boolean,
  skipLink: boolean, opts: Omit<LaunchAddAppOpts, 'addApp'>, onWillEvent: ApiEmitter<AdditionalApp>, onDidEvent: ApiEmitter<AdditionalApp>) {
  if (!skipLink || !symlinkCurationContent) { await linkContentFolder(curationKey, opts.fpPath, opts.isDev, opts.exePath, opts.htdocsPath, symlinkCurationContent); }
  const addApp = createAddAppFromCurationMeta(appCuration, createPlaceholderGame());
  await onWillEvent.fire(addApp);
  GameLauncher.launchAdditionalApplication({
    ...opts,
    addApp: addApp,
  });
  onDidEvent.fire(addApp);
}

function logMessage(text: string, curation: EditCuration): void {
  console.log(`- ${text}\n  (id: ${curation.key})`);
}

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
    extreme:             gameMeta.extreme || false,
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

async function importGameImage(image: CurationIndexImage, gameId: string, folder: typeof LOGOS | typeof SCREENSHOTS, fullImagePath: string): Promise<void> {
  if (image.exists) {
    const last = path.join(gameId.substr(0, 2), gameId.substr(2, 2), gameId+'.png');
    const imagePath = path.join(fullImagePath, folder, last);
    if (imagePath.startsWith(fullImagePath)) { // (Make sure the image path does not climb out of the image folder)
      // Check if the image is its own file
      if (image.filePath !== undefined) {
        await fs.promises.mkdir(path.dirname(imagePath), { recursive: true });
        await fs.promises.access(image.filePath, fs.constants.R_OK).then(() => log.debug('TEST', 'CAN READ')).catch(() => log.debug('TEST', 'CAN NOT READ'));
        await fs.promises.copyFile(image.filePath, imagePath);
      }
      // Check if the image is extracted
      else if (image.fileName !== undefined && image.rawData !== undefined) {
        await fs.writeFile(imagePath, image.rawData);
      }
    }
  }
}

/** Symlinks (or copies if unavailable) a curations `content` folder to `htdocs\content`
 * @param curationKey Key of the (game) curation to link
 */
async function linkContentFolder(curationKey: string, fpPath: string, isDev: boolean, exePath: string, htdocsPath: string, symlinkCurationContent: boolean) {
  const curationPath = path.join(fpPath, 'Curations', 'Working', curationKey);
  const htdocsContentPath = path.join(fpPath, htdocsPath, 'content');
  // Clear out old folder if exists
  console.log('Removing old Server/htdocs/content ...');
  await fs.remove(htdocsContentPath);
  const contentPath = path.join(curationPath, 'content');
  console.log('Linking new Server/htdocs/content ...');
  if (fs.existsSync(contentPath)) {
    if (symlinkCurationContent) {
      // Symlink content
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
    } else {
      // Copy content
      console.log('Linking...');
      await fs.copy(contentPath, htdocsContentPath);
      console.log('Linked!');
    }
  }
}

/**
 * Move a folders contents to another, with warnings for overwrites
 * @param inFolder Folder to copy from
 * @param outFolder Folder to copy to
 */
async function copyFolder(inFolder: string, outFolder: string, move: boolean, openDialog: ShowMessageBoxFunc) {
  const contentIndex = await indexContentFolder(inFolder, curationLog);
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
            await copyOrMoveFile(source, dest, move);
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
              await copyOrMoveFile(source, dest, move);
              break;
            case 2:
              yesToAll = true;
              await copyOrMoveFile(source, dest, move);
              break;
            case 3:
              cancel = true;
              break;
          }
          if (response === 0) {
            await copyOrMoveFile(source, dest, move);
          }
          if (response === 2) { cancel = true; }
        }
      })
      .catch(async () => {
        // Dest file doesn't exist, just move
        copyOrMoveFile(source, dest, move);
      });
      if (cancel) { throw new Error('Import cancelled by user.'); }
    })
  );
}

async function copyOrMoveFile(source: string, dest: string, move: boolean) {
  try {
    if (move) { await fs.rename(source, dest); } // @TODO Make sure this overwrites files
    else      { await fs.copyFile(source, dest); }
  } catch (error) {
    curationLog(`Error copying file '${source}' to '${dest}' - ${error.message}`);
    if (move) {
      curationLog('Attempting to copy file instead of move...');
      try {
        await fs.copyFile(source, dest);
      } catch (error) {
        curationLog('Copy unsuccessful');
        throw error;
      }
      curationLog('Copy successful');
    }
  }
}

function curationLog(content: string): void {
  log.info('Curate', content);
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

export async function createTagsFromLegacy(tags: string, tagCache: Record<string, Tag>): Promise<Tag[]> {
  const allTags: Tag[] = [];

  addTagLoop:
  for (const t of tags.split(';')) {
    const trimTag = t.trim();
    const cachedTag = tagCache[trimTag];
    if (cachedTag) {
      allTags.push(cachedTag);
      continue addTagLoop;
    }
    let tag = await TagManager.findTag(trimTag);
    if (!tag && trimTag !== '') {
      // Tag doesn't exist, make a new one
      tag = await TagManager.createTag(trimTag);
    }
    if (tag) {
      tagCache[trimTag] = tag;
      allTags.push(tag);
    }
  }

  return allTags.filter((v,i) => allTags.findIndex(v2 => v2.id == v.id) == i); // remove dupes
}

/**
 * Recursively iterate over the children of a directory and call a callback for each file/directory (including the root file or directory).
 * @param filePath Path of file/directory to iterate over.
 * @param callback Callback to call for each file/directory encountered.
 */
async function iterateDirectory(filePath: string, callback: (filePath: string, stats: fs.Stats) => Promise<void>): Promise<void> {
  const stats = await fs.lstat(filePath);

  await callback(filePath, stats);

  if (stats.isDirectory()) {
    const files = await fs.readdir(filePath);
    for (const childName of files) {
      await iterateDirectory(path.join(filePath, childName), callback);
    }
  }
}
