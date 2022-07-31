import * as GameDataManager from '@back/game/GameDataManager';
import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import { convertEditToCurationMetaFile } from '@shared/curate/metaToMeta';
import { CurationIndexImage } from '@shared/curate/OLD_types';
import { AddAppCuration, CurationMeta, LoadedCuration } from '@shared/curate/types';
import { getCurationFolder } from '@shared/curate/util';
import { TaskProgress } from '@shared/utils/TaskProgress';
import * as child_process from 'child_process';
import { execFile } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as YAML from 'yaml';
import { ApiEmitter } from './extensions/ApiEmitter';
import * as GameManager from './game/GameManager';
import * as TagManager from './game/TagManager';
import { GameManagerState } from './game/types';
import { GameLauncher, GameLaunchInfo, LaunchAddAppOpts, LaunchGameOpts } from './GameLauncher';
import { copyFolder } from './rust';
import { OpenExternalFunc, ShowMessageBoxFunc } from './types';
import { getMklinkBatPath } from './util/elevate';
import { uuid } from './util/uuid';


type ImportCurationOpts = {
  curation: LoadedCuration;
  gameManager: GameManagerState;
  date?: Date;
  saveCuration: boolean;
  fpPath: string;
  dataPacksFolderPath: string;
  bluezipPath: string;
  imageFolderPath: string;
  openDialog: ShowMessageBoxFunc;
  openExternal: OpenExternalFunc;
  tagCategories: TagCategory[];
  taskProgress: TaskProgress;
  sevenZipPath: string;
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
    dataPacksFolderPath,
    bluezipPath,
    curation,
    date,
    saveCuration,
    fpPath,
    imageFolderPath: imagePath,
    taskProgress
  } = opts;

  taskProgress.setStageProgress(0, 'Importing...');

  // TODO: Consider moving this check outside importCuration
  // Warn if launch command is already present on another game
  if (curation.game.launchCommand) {
    const existingGame = await GameManager.findGame(undefined, {
      where: {
        launchCommand: curation.game.launchCommand
      }
    });
    if (existingGame) {
      // Warn user of possible duplicate
      const response = await opts.openDialog({
        title: 'Possible Duplicate',
        message: 'There is already a game using this launch command. It may be a duplicate.\nContinue importing this curation?\n\n'
                + `Curation:\n\tTitle: ${curation.game.title}\n\tLaunch Command: ${curation.game.launchCommand}\n\tPlatform: ${curation.game.platform}\n\n`
                + `Existing Game:\n\tID: ${existingGame.id}\n\tTitle: ${existingGame.title}\n\tPlatform: ${existingGame.platform}`,
        buttons: ['Yes', 'No']
      });
      if (response === 1) {
        throw new Error('User Cancelled Import');
      }
    }
  }
  // Build content list
  const contentToMove = [];
  const extrasAddApp = curation.addApps.find(a => a.applicationPath === ':extras:');
  if (extrasAddApp && extrasAddApp.launchCommand && extrasAddApp.launchCommand.length > 0) {
    // Add extras folder if meta has an entry
    contentToMove.push([path.join(getCurationFolder(curation, fpPath), 'Extras'), path.join(fpPath, 'Extras', extrasAddApp.launchCommand)]);
  }
  // Create and add game and additional applications
  const gameId = curation.uuid;
  const oldGame = await GameManager.findGame(gameId);
  if (oldGame) {
    const response = await opts.openDialog({
      title: 'Overwriting Game',
      message: 'There is already a game using this id. Importing will override it.\nContinue importing this curation?\n\n'
              + `Curation:\n\tTitle: ${curation.game.title}\n\tLaunch Command: ${curation.game.launchCommand}\n\tPlatform: ${curation.game.platform}\n\n`
              + `Existing Game:\n\tTitle: ${oldGame.title}\n\tLaunch Command: ${oldGame.launchCommand}\n\tPlatform: ${oldGame.platform}`,
      buttons: ['Yes', 'No']
    });
    if (response === 1) {
      throw new Error('User Cancelled Import');
    }
  }

  // Add game to database
  let game = await createGameFromCurationMeta(gameId, curation.game, curation.addApps, date);
  game = await GameManager.save(game);

  // Store curation state for extension use later
  const curationState: CurationImportState = {
    game,
    contentToMove,
    curationPath: getCurationFolder(curation, fpPath)
  };

  taskProgress.setStageProgress(0.1, 'Fixing File Permissions...');

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
    taskProgress.setStageProgress(0.35, 'Saving Copy of Curation to Imported...');
    // If configured, save a copy of the curation before importing
    curationLog('Saving Imported Content');
    try {
      if (saveCuration) {
        // Save working meta
        const metaPath = path.join(getCurationFolder(curation, fpPath), 'meta.yaml');
        const meta = YAML.stringify(convertEditToCurationMetaFile(curation.game, opts.tagCategories, curation.addApps));
        await fs.writeFile(metaPath, meta);
        // Date in form 'YYYY-MM-DD' for folder sorting
        const date = new Date();
        const dateStr = date.getFullYear().toString() + '-' +
                        (date.getUTCMonth() + 1).toString().padStart(2, '0') + '-' +
                        date.getUTCDate().toString().padStart(2, '0');
        const backupPath = path.join(fpPath, 'Curations', 'Imported', `${dateStr}__${curation.folder}`);
        await copyFolder(getCurationFolder(curation, fpPath), backupPath);
        // Why does this return before finishing copying? Replaced with line above for now.
        // await copyFolder(getCurationFolder(curation, fpPath), backupPath, true, opts.openDialog);
      }
      if (log) {
        logMessage('Content Copied', curation.folder);
      }
    } catch (error) {
      curationLog(`Error importing ${curation.game.title} - Informing user...`);
      const res = await opts.openDialog({
        title: 'Error saving curation',
        message: 'Saving curation import failed. Some/all files failed to move. Please check the content folder yourself before removing manually.\n\nOpen folder now?',
        buttons: ['Yes', 'No']
      });
      if (res === 0) {
        console.log('Opening curation folder after error');
        await opts.openExternal(getCurationFolder(curation, fpPath));
      }
    }
  })
  .then(async () => {
    // Copy Thumbnail
    // curationLog('Importing Curation Thumbnail');
    await importGameImage(curation.thumbnail, game.id, LOGOS, path.join(fpPath, imagePath))
    .then(() => { if (log) { logMessage('Thumbnail Copied', curation.folder); } });

    // Copy Screenshot
    // curationLog('Importing Curation Screenshot');
    await importGameImage(curation.screenshot, game.id, SCREENSHOTS, path.join(fpPath, imagePath))
    .then(() => { if (log) { logMessage('Screenshot Copied', curation.folder); } });
  })
  .then(async () => {
    taskProgress.setStageProgress(0.5, 'Extensions Working...');
    // Notify extensions and let them make changes
    await onWillImportCuration.fire(curationState);
  })
  .then(async () => {
    // Copy each paired content folder one at a time (allows for cancellation)
    for (const pair of curationState.contentToMove) {
      await fs.copy(pair[0], pair[1], { recursive: true, preserveTimestamps: true });
      // await copyFolder(pair[0], pair[1], moveFiles, opts.openDialog, log);
    }
    logMessage('Content Copied', curation.folder);
  })
  .then(async () => {
    taskProgress.setStageProgress(0.75, 'Packing Game Zip...');

    const curationPath = path.resolve(getCurationFolder(curation, fpPath));
    // const zipPath = path.join(fpPath, CURATIONS_FOLDER_TEMP, `${uuid()}.zip`);
    // const zip = add(zipPath, curationPath + '/*ontent/*', { $bin: sevenZipPath, recursive: true });
    // await new Promise<void>((resolve, reject) => {
    //   zip.on('end', () => resolve());
    //   zip.on('error', reject);
    // });

    // Build bluezip
    const bluezipProc = child_process.spawn('bluezip', [curationPath, '-no', curationPath], {cwd: path.dirname(bluezipPath)});
    await new Promise<void>((resolve, reject) => {
      bluezipProc.stdout.on('data', (data: any) => {
        log.debug('Curate', `Bluezip output: ${data}`);
      });
      bluezipProc.stderr.on('data', (data: any) => {
        log.debug('Curate', `Bluezip error: ${data}`);
      });
      bluezipProc.on('close', (code: any) => {

        if (code) {
          log.error('Curate', `Bluezip exited with code: ${code}`);
          reject();
        } else {
          log.debug('Curate', 'Bluezip exited successfully.');
          resolve();
        }
      });
    });
    // Import bluezip
    const filePath = path.join(curationPath, `${curation.folder}.zip`);
    taskProgress.setStageProgress(0.9, 'Importing Zipped File...');
    await GameDataManager.importGameData(game.id, filePath, dataPacksFolderPath, curation.game.mountParameters);
    await fs.promises.unlink(filePath);
  })
  .catch((error) => {
    curationLog(error ? error.message : 'Unknown');
    console.warn(error ? error.message : 'Unknown');
    taskProgress.setStageProgress(1, error ? error.message : 'Unknown');

    if (game.id) {
      // Clean up half imported entries
      GameManager.removeGameAndAddApps(game.id, dataPacksFolderPath);
    }
    // Let it bubble up
    throw error;
  });
}

/**
 * Create and launch a game from curation metadata.
 * @param curation Curation to launch
 */
export async function launchCuration(curation: LoadedCuration, symlinkCurationContent: boolean,
  skipLink: boolean, opts: Omit<LaunchGameOpts, 'game'|'addApps'>, onWillEvent:ApiEmitter<GameLaunchInfo>, onDidEvent: ApiEmitter<Game>) {
  if (!skipLink || !symlinkCurationContent) { await linkContentFolder(curation.folder, opts.fpPath, opts.isDev, opts.exePath, opts.htdocsPath, symlinkCurationContent); }
  curationLog(`Launching Curation ${curation.game.title}`);
  const game = await createGameFromCurationMeta(curation.folder, curation.game, [], new Date());
  await GameLauncher.launchGame({
    ...opts,
    game: game,
  },
  onWillEvent);
  await onDidEvent.fire(game);
}

/**
 * Create and launch an additional application from curation metadata.
 * @param folder Key of the parent curation index
 * @param appCuration Add App Curation to launch
 */
export async function launchAddAppCuration(folder: string, appCuration: AddAppCuration, symlinkCurationContent: boolean,
  skipLink: boolean, opts: Omit<LaunchAddAppOpts, 'addApp'>, onWillEvent: ApiEmitter<AdditionalApp>, onDidEvent: ApiEmitter<AdditionalApp>) {
  if (!skipLink || !symlinkCurationContent) { await linkContentFolder(folder, opts.fpPath, opts.isDev, opts.exePath, opts.htdocsPath, symlinkCurationContent); }
  const addApp = createAddAppFromCurationMeta(appCuration, createPlaceholderGame());
  await onWillEvent.fire(addApp);
  await GameLauncher.launchAdditionalApplication({
    ...opts,
    addApp: addApp,
  });
  await onDidEvent.fire(addApp);
}

function logMessage(text: string, folder: string): void {
  console.log(`- ${text}\n  (id: ${folder})`);
}

/**
 * Create a game info from a curation.
 * @param curation Curation to get data from.
 * @param gameId ID to use for Game
 */
async function createGameFromCurationMeta(gameId: string, gameMeta: CurationMeta, addApps : AddAppCuration[], date: Date): Promise<Game> {
  const game: Game = new Game();
  Object.assign(game, {
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
    placeholder: false,
    activeDataOnDisk: false
  });
  game.addApps = addApps.map(addApp => createAddAppFromCurationMeta(addApp, game));
  return game;
}

function createAddAppFromCurationMeta(addAppMeta: AddAppCuration, game: Game): AdditionalApp {
  return {
    id: addAppMeta.key,
    name: addAppMeta.heading || '',
    applicationPath: addAppMeta.applicationPath || '',
    launchCommand: addAppMeta.launchCommand || '',
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
        await new Promise<void>((resolve, reject) => {
          execFile('mklink.bat', [`"${htdocsContentPath}"`, `"${contentPath}"`], { cwd: mklinkDir, shell: true }, (err) => {
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
// async function copyFolder(inFolder: string, outFolder: string, move: boolean, openDialog: ShowMessageBoxFunc) {
//   const contentIndex = await indexContentFolder(inFolder, curationLog);
//   let yesToAll = false;
//   return Promise.all(
//     contentIndex.map(async (content) => {
//       // For checking cancel at end
//       let cancel = false;
//       const source = path.join(inFolder, content.filePath);
//       const dest = path.join(outFolder, content.filePath);
//       // Ensure that the folders leading up to the file exists
//       await fs.promises.mkdir(path.dirname(dest), { recursive: true });
//       await fs.access(dest, fs.constants.F_OK)
//       .then(async () => {
//         // Ask to overwrite if file already exists
//         const filesDifferent = !(await equalFileHashes(source, dest));
//         // Only ask when files don't match
//         if (filesDifferent) {
//           if (!yesToAll) {
//             await copyOrMoveFile(source, dest, move);
//             return;
//           }
//           const newStats = await fs.lstat(source);
//           const currentStats = await fs.lstat(dest);
//           const response = await openDialog({
//             type: 'warning',
//             title: 'Import Warning',
//             message: 'Overwrite File?\n' +
//                     `${content.filePath}\n` +
//                     `Current File: ${sizeToString(currentStats.size)} (${currentStats.size} Bytes)\n`+
//                     `New File: ${sizeToString(newStats.size)} (${newStats.size} Bytes)`,
//             buttons: ['Yes', 'No', 'Yes to All', 'Cancel']
//           });
//           switch (response) {
//             case 0:
//               await copyOrMoveFile(source, dest, move);
//               break;
//             case 2:
//               yesToAll = true;
//               await copyOrMoveFile(source, dest, move);
//               break;
//             case 3:
//               cancel = true;
//               break;
//           }
//           if (response === 0) {
//             await copyOrMoveFile(source, dest, move);
//           }
//           if (response === 2) { cancel = true; }
//         }
//       })
//       .catch(async () => {
//         // Dest file doesn't exist, just move
//         copyOrMoveFile(source, dest, move);
//       });
//       if (cancel) { throw new Error('Import cancelled by user.'); }
//     })
//   );
// }
//
// async function copyOrMoveFile(source: string, dest: string, move: boolean) {
//   try {
//     if (move) { await fs.rename(source, dest); } // @TODO Make sure this overwrites files
//     else      { await fs.copyFile(source, dest); }
//   } catch (error) {
//     curationLog(`Error copying file '${source}' to '${dest}' - ${error.message}`);
//     if (move) {
//       curationLog('Attempting to copy file instead of move...');
//       try {
//         await fs.copyFile(source, dest);
//       } catch (error) {
//         curationLog('Copy unsuccessful');
//         throw error;
//       }
//       curationLog('Copy successful');
//     }
//   }
// }

function curationLog(content: string): void {
  log.info('Curate', content);
}

/**
 * Check whether 2 files hashes match
 * @param filePath First file to compare
 * @param secondFilePath Second file to compare
 * @returns True if matching, false if not.
 */
// async function equalFileHashes(filePath: string, secondFilePath: string) {
//   // Hash first file
//   const buffer = await fs.readFile(filePath);
//   const secondBuffer = await fs.readFile(secondFilePath);
//   return buffer.equals(secondBuffer);
// }

function createPlaceholderGame(): Game {
  const id = uuid();
  const game = new Game();
  Object.assign(game, {
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
    placeholder: true,
    activeDataOnDisk: false
  });
  return game;
}

export async function createTagsFromLegacy(tags: string, tagCache: Record<string, Tag>): Promise<Tag[]> {
  const allTags: Tag[] = [];

  for (const t of tags.split(';')) {
    const trimTag = t.trim();
    const cachedTag = tagCache[trimTag];
    if (cachedTag) {
      allTags.push(cachedTag);
      continue;
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
