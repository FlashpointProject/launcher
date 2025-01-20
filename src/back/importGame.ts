import { GameData, PartialGameData } from '@fparchive/flashpoint-archive';
import { ArchiveState } from '@shared/back/types';
import { CURATIONS_FOLDER_TEMP, CURATIONS_FOLDER_WORKING, LOGOS, SCREENSHOTS } from '@shared/constants';
import { CurationIndexImage } from '@shared/curate/OLD_types';
import { convertEditToCurationMetaFile } from '@shared/curate/metaToMeta';
import { AddAppCuration, CurationMeta } from '@shared/curate/types';
import { getCurationFolder } from '@shared/curate/util';
import { TaskProgress } from '@shared/utils/TaskProgress';
import { newGame } from '@shared/utils/misc';
import * as child_process from 'child_process';
import { execFile } from 'child_process';
import * as crypto from 'crypto';
import { AdditionalApp, Game, GameLaunchInfo, LoadedCuration, Platform, Tag, TagCategory } from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as YAML from 'yaml';
import { addPromise, fpDatabase } from '.';
import { GameLauncher, LaunchAddAppOpts, LaunchGameOpts, checkAndInstallPlatform } from './GameLauncher';
import { ApiEmitterFirable } from './extensions/ApiEmitter';
import { copyFolder } from './rust';
import { BackState, OpenExternalFunc, ShowMessageBoxFunc } from './types';
import { awaitDialog } from './util/dialog';
import { getMklinkBatPath } from './util/elevate';
import { onDidInstallGameData, onWillImportCuration } from './util/events';
import { uuid } from './util/uuid';

type ImportCurationOpts = {
  curation: LoadedCuration;
  date?: Date;
  saveCuration: boolean;
  fpPath: string;
  dataPacksFolderPath: string;
  htdocsFolderPath: string;
  imageFolderPath: string;
  openDialog: ShowMessageBoxFunc;
  openExternal: OpenExternalFunc;
  tagCategories: TagCategory[];
  taskProgress: TaskProgress;
  sevenZipPath: string;
  state: BackState;
}

export type CurationImportState = {
  /** Game being imported */
  game: Game;
  /** Files being copied, and to where */
  contentToMove: string[][];
  /** Path of the curation */
  curationPath: string;
}

/**
 * Import a curation.
 *
 * @param opts Import options
 * @returns A promise that resolves when the import is complete.
 */
export async function importCuration(opts: ImportCurationOpts): Promise<void> {
  log.debug('Import', 'Importing game...');
  if (opts.date === undefined) { opts.date = new Date(); }
  const {
    curation,
    date,
    saveCuration,
    fpPath,
    imageFolderPath: imagePath,
    dataPacksFolderPath,
    taskProgress
  } = opts;

  taskProgress.setStageProgress(0, 'Importing...');

  // TODO: Consider moving this check outside importCuration
  // Warn if launch command is already present on another game
  // if (curation.game.launchCommand) {
  //   const existingGameData = await GameManager.findGameData({
  //     where: {
  //       launchCommand: curation.game.launchCommand
  //     }
  //   });
  //   let existingGame: Game | null = null;
  //   if (existingGameData) {
  //     existingGame = await fpDatabase.findGame(existingGameData.gameId);
  //   }
  //   // } else {
  //   //   existingGame = await GameManager.findGame(undefined, {
  //   //     where: {
  //   //       legacyLaunchCommand: curation.game.launchCommand
  //   //     }
  //   //   });
  //   // }
  //   if (existingGame) {
  //     // Warn user of possible duplicate
  //     const dialogId = await opts.openDialog({
  //       message: 'There is already a game using this launch command. It may be a duplicate.\nContinue importing this curation?\n\n'
  //               + `Curation:\n\tTitle: ${curation.game.title}\n\tLaunch Command: ${curation.game.launchCommand}\n\tPlatform: ${curation.game.platforms ? curation.game.platforms.join('; ') : ''}\n\n`
  //               + `Existing Game:\n\tID: ${existingGame.id}\n\tTitle: ${existingGame.title}\n\tPlatforms: ${existingGame.platforms.join('; ')}`,
  //       buttons: ['Yes', 'No']
  //     });
  //     const response = (await awaitDialog(opts.state, dialogId)).buttonIdx;
  //     if (response === 1) {
  //       throw new Error('User Cancelled Import');
  //     }
  //   }
  // }
  // Build content list
  const contentToMove = [];
  const extrasAddApp = curation.addApps.find(a => a.applicationPath === ':extras:');
  if (extrasAddApp && extrasAddApp.launchCommand && extrasAddApp.launchCommand.length > 0) {
    // Add extras folder if meta has an entry
    contentToMove.push([path.join(getCurationFolder(curation, fpPath), 'Extras'), path.join(fpPath, 'Extras', extrasAddApp.launchCommand)]);
  }
  // Create and add game and additional applications
  const gameId = curation.uuid;
  const oldGame = await fpDatabase.findGame(gameId);
  if (oldGame) {
    const existingGameDatas = await fpDatabase.findGameData(gameId);
    const existingGameData = existingGameDatas.length > 0 ? existingGameDatas[0] : null;
    const launchCommand = existingGameData ? existingGameData.launchCommand : oldGame.legacyLaunchCommand;
    const dialogId = await opts.openDialog({
      message: 'There is already a game using this id. Importing will override it.\nContinue importing this curation?\n\n'
              + `Curation:\n\tTitle: ${curation.game.title}\n\tLaunch Command: ${curation.game.launchCommand}\n\tPlatform: ${curation.game.platforms ? curation.game.platforms.join('; ') : ''}\n\n`
              + `Existing Game:\n\tTitle: ${oldGame.title}\n\tLaunch Command: ${launchCommand}\n\tPlatform: ${oldGame.platforms.join('; ')}`,
      buttons: ['Yes', 'No']
    });
    const response = (await awaitDialog(opts.state, dialogId)).buttonIdx;
    if (response === 1) {
      throw new Error('User Cancelled Import');
    }
  }

  // Add game to database
  log.debug('Import', 'Creating game');
  let game = await createGameFromCurationMeta(gameId, curation.game, curation.addApps, date);
  const addApps = game.addApps;
  game = await fpDatabase.createGame(game);
  if (addApps && addApps.length > 0) {
    for (const addApp of addApps) {
      await fpDatabase.createAddApp(addApp);
    }
  }
  log.debug('Import', 'Created game entry');

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
      const dialogId = await opts.openDialog({
        message: 'Saving curation import failed. Some/all files failed to move.\nPlease check the content folder yourself before removing manually.\nOpen folder now?',
        buttons: ['Yes', 'No']
      });
      const res = (await awaitDialog(opts.state, dialogId)).buttonIdx;
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

    const tempDir = path.join(fpPath, CURATIONS_FOLDER_TEMP, `${curation.folder}-pack`);
    fs.ensureDirSync(tempDir);
    const zipPath = path.join(tempDir, `${curation.folder}.zip`);
    // Create content.json just for safety / compat
    const contentJson = {
      "version": 1,
      "uniqueId": gameId,
      "platform": curation.game.primaryPlatform
    };
    const contentJsonPath = path.join(tempDir, 'content.json');
    await fs.promises.writeFile(contentJsonPath, JSON.stringify(contentJson, undefined, 2));
    // Build zip to import
    const contentPath = path.join(curationPath, 'content');
    await addPromise(zipPath, [
      contentPath,
      contentJsonPath
    ], { $bin: opts.sevenZipPath, recursive: true });
    
    log.debug('Import', 'Importing game data...');
    taskProgress.setStageProgress(0.9, 'Importing Zipped File...');
    await importGameData(game.id, zipPath, dataPacksFolderPath, curation.game.applicationPath, curation.game.launchCommand, curation.game.mountParameters);
    await fs.promises.unlink(zipPath);
  })
  .catch((error) => {
    log.error('Import', 'ERROR: ' + (error ? error.message : 'Unknown'));
    curationLog(error ? error.message : 'Unknown');
    console.warn(error ? error.message : 'Unknown');
    taskProgress.setStageProgress(1, error ? error.message : 'Unknown');

    if (game.id) {
      // Clean up half imported entries
      fpDatabase.deleteGame(game.id);
    }
    // Let it bubble up
    throw error;
  });
}

function importGameData(gameId: string, filePath: string, dataPacksFolderPath: string, applicationPath?: string, launchCommand?: string, mountParameters?: string): Promise<GameData> {
  return new Promise<GameData>((resolve, reject) => {
    fs.promises.access(filePath, fs.constants.F_OK)
    .then(async () => {
      // Gather basic info
      const stats = await fs.promises.stat(filePath);
      const hash = crypto.createHash('sha256');
      hash.setEncoding('hex');
      const stream = fs.createReadStream(filePath);
      stream.on('end', async () => {
        const sha256 = hash.digest('hex').toUpperCase();
        const gameData = await fpDatabase.findGameData(gameId);
        const existingGameData = gameData.find(g => g.sha256.toLowerCase() === sha256.toLowerCase());
        // Copy file
        const dateAdded = new Date();
        const cleanDate = existingGameData ? existingGameData.dateAdded.includes('T') ? existingGameData.dateAdded : `${existingGameData.dateAdded} +0000 UTC` : '';
        const newFilename = existingGameData ? `${gameId}-${new Date(cleanDate).getTime()}.zip` : `${gameId}-${dateAdded.getTime()}.zip`;
        const newPath = path.join(dataPacksFolderPath, newFilename);
        await fs.promises.copyFile(filePath, newPath);
        if (existingGameData) {
          if (existingGameData.presentOnDisk === false) {
            // File wasn't on disk before but is now, update GameData info
            existingGameData.path = newFilename;
            existingGameData.presentOnDisk = true;
            fpDatabase.saveGameData(existingGameData)
            .then(async (gameData) => {
              await onDidInstallGameData.fire(gameData);
              resolve(gameData);
            })
            .catch(reject);
          } else {
            // File exists on disk already
            resolve(existingGameData);
          }
        } else {
          // SHA256 not matching any existing GameData, create a new one
          const newGameData: PartialGameData = {
            title: 'Data Pack',
            gameId: gameId,
            size: stats.size,
            dateAdded: dateAdded.toISOString(),
            presentOnDisk: true,
            path: newFilename,
            sha256: sha256,
            applicationPath: applicationPath || '',
            launchCommand: launchCommand || '',
            parameters: mountParameters,
            crc32: 0,
          };
          fpDatabase.createGameData(newGameData)
          .then(async (gameData) => {
            const game = await fpDatabase.findGame(gameId);
            if (game) {
              // Remove legacy info when adding game data
              game.archiveState = ArchiveState.Available;
              game.legacyApplicationPath = '';
              game.legacyLaunchCommand = '';
              game.activeDataId = gameData.id;
              game.activeDataOnDisk = gameData.presentOnDisk;
              await fpDatabase.saveGame(game);
              await onDidInstallGameData.fire(gameData);
              resolve(gameData);
            }
          })
          .catch(reject);
        }

      });
      stream.pipe(hash);
    })
    .catch(reject);
  });
}

/**
 * Create and launch a game from curation metadata.
 *
 * @param curation Curation to launch
 * @param symlinkCurationContent Symlink the curation content to htdocs/content/
 * @param skipLink Skips any linking of the content folder
 * @param opts Options for game launches
 * @param onWillEvent Fires before the curation has launched
 * @param onDidEvent Fires after the curation has launched
 * @param serverOverride Changes the active server given a server name / alias as defined in services.json
 */
export async function launchCuration(curation: LoadedCuration, symlinkCurationContent: boolean,
  skipLink: boolean, opts: Omit<LaunchGameOpts, 'game'|'addApps'>, onWillEvent: ApiEmitterFirable<GameLaunchInfo>, onDidEvent: ApiEmitterFirable<Game>, serverOverride?: string) {
  if (curation.game.platforms) {
    await checkAndInstallPlatform(curation.game.platforms, opts.state, opts.openDialog);
  }
  if (!skipLink || !symlinkCurationContent) { await linkContentFolder(curation.folder, opts.fpPath, opts.isDev, opts.exePath, opts.htdocsPath, symlinkCurationContent); }
  curationLog(`Launching Curation ${curation.game.title}`);
  const game = await createGameFromCurationMeta(curation.folder, curation.game, [], new Date());
  clearWininetCache();
  await GameLauncher.launchGame({
    ...opts,
    game: game
  },
  onWillEvent, true, serverOverride);
  await onDidEvent.fire(game);
}

/**
 * Create and launch an additional application from curation metadata.
 *
 * @param folder Key of the parent curation index
 * @param appCuration Add App Curation to launch
 * @param platforms Platforms of the curation
 * @param symlinkCurationContent Symlink the curation content to htdocs/content/
 * @param skipLink Skips any linking of the content folder
 * @param opts Options for add app launches
 * @param onWillEvent Fires before the curation add app has launched
 * @param onDidEvent Fires after the curation add app has launched
 */
export async function launchAddAppCuration(folder: string, appCuration: AddAppCuration, platforms: Platform[], symlinkCurationContent: boolean,
  skipLink: boolean, opts: Omit<LaunchAddAppOpts, 'addApp'>, onWillEvent: ApiEmitterFirable<AdditionalApp>, onDidEvent: ApiEmitterFirable<AdditionalApp>) {
  if (platforms) {
    await checkAndInstallPlatform(platforms, opts.state, opts.openDialog);
  }
  if (!skipLink || !symlinkCurationContent) { await linkContentFolder(folder, opts.fpPath, opts.isDev, opts.exePath, opts.htdocsPath, symlinkCurationContent); }
  const addApp = createAddAppFromCurationMeta(appCuration, createPlaceholderGame(platforms));
  await onWillEvent.fire(addApp);
  clearWininetCache();
  await GameLauncher.launchAdditionalApplication({
    ...opts,
    addApp: addApp
  }, true);
  await onDidEvent.fire(addApp);
}

function clearWininetCache() {
  if (process.platform === 'win32') {
    child_process.exec('RunDll32.exe InetCpl.cpl,ClearMyTracksByProcess 8', (err) => {
      if (err) {
        log.error('Launcher', `Error clearing WinINet Cache: ${err}`);
      }
    });
  }
}

function logMessage(text: string, folder: string): void {
  console.log(`- ${text}\n  (id: ${folder})`);
}

/**
 * Create a game info from a curation.
 *
 * @param gameId ID to use for created Game
 * @param gameMeta Curation Metadata to inherit
 * @param addApps Curation add apps to inherit
 * @param date Date to mark this game as added on
 */
async function createGameFromCurationMeta(gameId: string, gameMeta: CurationMeta, addApps : AddAppCuration[], date: Date): Promise<Game> {
  const game: Game = {
    ...newGame(),
    id:                    gameId, // (Re-use the id of the curation)
    title:                 gameMeta.title               || '',
    alternateTitles:       gameMeta.alternateTitles     || '',
    series:                gameMeta.series              || '',
    developer:             gameMeta.developer           || '',
    publisher:             gameMeta.publisher           || '',
    primaryPlatform:       gameMeta.primaryPlatform     || '',
    platforms:             gameMeta.platforms?.map(t => t.name)  || [],
    playMode:              gameMeta.playMode            || '',
    status:                gameMeta.status              || '',
    notes:                 gameMeta.notes               || '',
    tags:                  gameMeta.tags?.map(t => t.name)       || [],
    source:                gameMeta.source              || '',
    legacyApplicationPath: gameMeta.applicationPath     || '',
    legacyLaunchCommand:   gameMeta.launchCommand       || '',
    releaseDate:           gameMeta.releaseDate         || '',
    version:               gameMeta.version             || '',
    originalDescription:   gameMeta.originalDescription || '',
    language:              gameMeta.language            || '',
    dateAdded:             date.toISOString(),
    dateModified:          date.toISOString(),
    library:               gameMeta.library || '',
    addApps:               [],
    activeDataOnDisk: false,
    ruffleSupport:         gameMeta.ruffleSupport       || '',
  };
  game.addApps = addApps.map(addApp => createAddAppFromCurationMeta(addApp, game))
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
    parentGameId: game.id,
  };
}

async function importGameImage(image: CurationIndexImage, gameId: string, folder: typeof LOGOS | typeof SCREENSHOTS, fullImagePath: string): Promise<void> {
  if (image.exists) {
    const last = path.join(gameId.substring(0, 2), gameId.substring(2, 4), gameId+'.png');
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

/**
 * Symlinks (or copies if unavailable) a curations `content` folder to `htdocs\content`
 *
 * @param curationKey Key of the curation to link content from
 * @param fpPath Path to the root of the Flashpoint Data folder
 * @param isDev Running in a dev environment
 * @param exePath Path to the Flashpoint Launcher exe
 * @param htdocsPath Path to the htdocs folder
 * @param symlinkCurationContent Symlink the curation content instead of copying files
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

function curationLog(content: string): void {
  log.info('Curate', content);
}

function createPlaceholderGame(platforms: Platform[] = []): Game {
  const id = uuid();
  const game = newGame();
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
    platforms: platforms,
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
    let tag = await fpDatabase.findTag(trimTag);
    if (!tag && trimTag !== '') {
      // Tag doesn't exist, make a new one
      tag = await fpDatabase.createTag(trimTag);
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
 *
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
