import { ApiEmitter } from '@back/extensions/ApiEmitter';
import { genContentTree } from '@back/rust';
import { BackState } from '@back/types';
import { serveFile } from '@back/util/FileServer';
import { uuid } from '@back/util/uuid';
import { fixSlashes } from '@shared/Util';
import { BackOut } from '@shared/back/types';
import { CURATIONS_FOLDER_WORKING } from '@shared/constants';
import { getContentFolderByKey } from '@shared/curate/util';
import { GamePropSuggestions } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { AddAppCuration, CurationFpfssInfo, CurationState, CurationWarnings, LoadedCuration } from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import * as http from 'http';
import { Progress } from 'node-7z';
import * as path from 'path';
import { checkAndDownloadGameData, extractFullPromise, fpDatabase } from '..';
import { loadCurationIndexImage } from './parse';
import { readCurationMeta } from './read';
import { saveCuration } from './write';
import { getCurationFpfssInfo } from './fpfss';
import { axios } from '@back/dns';

const whitelistedBaseFiles = ['logo.png', 'ss.png'];

export type GetCurationFileFunc = (folder: string, relativePath: string) => string;

export type UpdateCurationFileFunc = (folder: string, relativePath: string, data: Buffer) => Promise<void>;

export type RemoveCurationFileFunc = (folder: string, relativePath: string) => Promise<void>;

export const onFileServerRequestPostCuration =
  async (pathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse, tempCurationsPath: string, onNewCuration: (filePath: string, fpfssInfo: CurationFpfssInfo | null, onProgress?: (progress: Progress) => void) => Promise<CurationState>) => {
    if (req.method === 'POST') {
      const chunks: any[] = [];
      req.on('data', (chunk) => {
        chunks.push(chunk);
      });
      req.on('error', (error) => {
        log.error('Curate', `Failure in request! ${error.toString()}`);
        res.writeHead(500);
        res.end();
      });
      req.on('end', async () => {
        const data = Buffer.concat(chunks);
        const randomFilePath = path.join(tempCurationsPath, `${uuid()}.7z`);
        await fs.promises.mkdir(path.dirname(randomFilePath), { recursive: true });
        await fs.promises.writeFile(randomFilePath, data);
        await onNewCuration(randomFilePath, null)
        .then(() => {
          res.writeHead(200);
          res.end();
        })
        .catch((error) => {
          log.error('Curate', `Failed to load curation archive! ${error.toString()}`);
          res.writeHead(500);
          res.end();
        })
        .finally(() => {
          fs.promises.unlink(randomFilePath);
        });
      });
    } else {
      res.writeHead(400);
      res.end();
    }
  };

export const onFileServerRequestCurationFileFactory = (getCurationFilePath: GetCurationFileFunc, onUpdateCurationFile: UpdateCurationFileFunc, onRemoveCurationFile: RemoveCurationFileFunc) =>
  async (pathname: string, url: URL, req: http.IncomingMessage, res: http.ServerResponse) => {
    const splitPath = pathname.split('/');
    // Find theme associated with the path (/curation/<folder>/<relativePath>)
    const folder = splitPath.length > 0 ? splitPath[0] : '';
    const relativePath = fixSlashes(splitPath.length > 1 ? splitPath.slice(1).join('/') : '');

    // Make sure we're in the content folder
    if (whitelistedBaseFiles.includes(relativePath) || relativePath.startsWith('content/')) {
      switch (req.method) {
        case 'DELETE': {
          onRemoveCurationFile(folder, relativePath)
          .then(() => {
            res.writeHead(200);
            res.end();
          })
          .catch(() => {
            res.writeHead(500);
            res.end();
          });
          break;
        }
        case 'POST':
        case 'PUT': {
          const chunks: any[] = [];
          req.on('data', (chunk) => {
            chunks.push(chunk);
          });
          req.on('end', async () => {
            const data = Buffer.concat(chunks);
            await onUpdateCurationFile(folder, relativePath, data);
            res.writeHead(200);
            res.end();
          });
          break;
        }
        case 'GET':
        default: {
          const filePath = getCurationFilePath(folder, relativePath);
          try {
            const stat = await fs.promises.stat(filePath);
            if (stat.isDirectory()) {
              // Return file list as json
              const folderIndex = await fs.promises.readdir(filePath, { withFileTypes: true });
              res.write(JSON.stringify({
                type: 'folderIndex',
                files: folderIndex.filter(dirent => dirent.isFile()).map(d => d.name),
                folders: folderIndex.filter(dirent => dirent.isDirectory()).map(d => d.name)
              }));
              res.end();
            } else if (stat.isFile()) {
              serveFile(req, res, filePath);
            }
          } catch (err: any) {
            if (err.code === 'ENOENT') {
              res.writeHead(404);
            } else {
              res.writeHead(500);
              log.error('Launcher', `Error stating curation file of ${folder} - ${relativePath}\n${err}`);
            }
            res.end();
          }
          break;
        }
      }
    } else {
      res.writeHead(403);
      res.end();
    }
  };

export async function genCurationWarnings(curation: LoadedCuration, fpPath: string, suggestions: GamePropSuggestions, strings: LangContainer['curate'], onWillGenCurationWarnings: ApiEmitter<{ curation: LoadedCuration, warnings: CurationWarnings }>): Promise<CurationWarnings> {
  const warns: CurationWarnings = {
    fieldWarnings: [],
    writtenWarnings: [],
  };
  // Check launch command exists
  const launchCommand = curation.game.launchCommand || '';
  if (!curation.game.title || curation.game.title == '') { warns.writtenWarnings.push('noTitle'); }
  if (!curation.game.applicationPath || curation.game.applicationPath == '') { warns.writtenWarnings.push('noApplicationPath'); }
  if (!curation.game.platforms || curation.game.platforms.length == 0) { warns.writtenWarnings.push('noPlatforms'); }
  if (launchCommand === '') { warns.writtenWarnings.push('noLaunchCommand'); }
  if (!curation.game.source) { warns.writtenWarnings.push('noSource'); }
  // Validate release date
  if (curation.game.releaseDate && !isValidDate(curation.game.releaseDate)) { warns.writtenWarnings.push('releaseDateInvalid'); }
  // Check for unused values (with suggestions)
  if (curation.game.applicationPath) {
    if (!curation.game.applicationPath.startsWith(':') && !fs.existsSync(path.join(fpPath, fixSlashes(curation.game.applicationPath)))) {
      warns.writtenWarnings.push('unusedApplicationPath');
    }
  }
  // Check if library is set
  if (suggestions.library.findIndex(l => l === curation.game.library) === -1) { warns.writtenWarnings.push('nonExistingLibrary'); }
  if (!curation.game.tags || curation.game.tags.length === 0) { warns.writtenWarnings.push('noTags'); }
  if (!curation.thumbnail.exists) { warns.writtenWarnings.push('noLogo'); }
  if (!curation.screenshot.exists) { warns.writtenWarnings.push('noScreenshot'); }

  const mutable = {
    curation: { ...curation },
    warnings: warns
  };
  // Map to field warnings
  mutable.warnings.fieldWarnings = mutable.warnings.writtenWarnings.map(s => {
    switch (s) {
      case 'noTitle':
        return 'title';
      case 'noApplicationPath':
        return 'applicationPath';
      case 'noPlatforms':
        return 'platforms';
      case 'noTags':
        return 'tags';
      case 'noSource':
        return 'source';
      case 'releaseDateInvalid':
        return 'releaseDate';
      case 'unusedApplicationPath':
        return 'applicationPath';
      case 'nonExistingLibrary':
        return 'library';
      case 'noLaunchCommand':
        return 'launchCommand';
      default:
        return '';
    }
  });
  // Let extensions make changes
  await onWillGenCurationWarnings.fire(mutable);

  // Clean up fieldWarnings
  const setWarnings: CurationWarnings = {
    writtenWarnings: mutable.warnings.writtenWarnings,
    fieldWarnings: Array.from(new Set(mutable.warnings.fieldWarnings))
  };

  return setWarnings;
}

export async function loadCurationFolder(rootPath: string, folderName: string, state: BackState) {
  const parsedMeta = await readCurationMeta(path.join(rootPath, folderName), state.platformAppPaths);
  if (parsedMeta) {
    const loadedCuration: LoadedCuration = {
      folder: folderName,
      uuid: parsedMeta.uuid || uuid(),
      group: parsedMeta.group,
      game: parsedMeta.game,
      addApps: parsedMeta.addApps,
      fpfssInfo: null,
      thumbnail: await loadCurationIndexImage(path.join(rootPath, folderName, 'logo.png')),
      screenshot: await loadCurationIndexImage(path.join(rootPath, folderName, 'ss.png'))
    };
    const alreadyImported = (await fpDatabase.findGame(loadedCuration.uuid)) !== null;
    const curation: CurationState = {
      ...loadedCuration,
      alreadyImported,
      warnings: await genCurationWarnings(loadedCuration, state.config.flashpointPath, state.suggestions, state.languageContainer.curate, state.apiEmitters.curations.onWillGenCurationWarnings)
    };
    // Try and load fpfss data
    curation.fpfssInfo = await getCurationFpfssInfo(path.join(rootPath, folderName));
    state.loadedCurations.push(curation);
    genContentTree(getContentFolderByKey(folderName, state.config.flashpointPath)).then((contentTree) => {
      const curationIdx = state.loadedCurations.findIndex((c) => c.folder === folderName);
      if (curationIdx >= 0) {
        state.loadedCurations[curationIdx].contents = contentTree;
        state.socketServer.broadcast(BackOut.CURATE_CONTENTS_CHANGE, folderName, contentTree);
      }
    });
  }
}

// Duplicates and then loads a curation
export async function duplicateCuration(srcFolder: string, state: BackState): Promise<string> {
  // Copy curation to a new folder
  const rootPath = path.join(state.config.flashpointPath, CURATIONS_FOLDER_WORKING);
  const srcPath = path.join(rootPath, srcFolder);
  await fs.promises.access(srcPath, fs.constants.R_OK);
  const destFolder = uuid();
  const destPath = path.join(rootPath, destFolder);
  await fs.copy(srcPath, destPath);

  // Load new folder and add Copy to its title
  await loadCurationFolder(rootPath, destFolder, state);
  const curationIdx = state.loadedCurations.findIndex(c => c.folder === destFolder);
  if (curationIdx > -1) {
    state.loadedCurations[curationIdx].game.title = state.loadedCurations[curationIdx].game.title ? state.loadedCurations[curationIdx].game.title + ' - Copy' : '? - Copy';
    // Give it a unique UUID
    state.loadedCurations[curationIdx].uuid = uuid();
  }

  // Notify frontend of new curation
  state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [state.loadedCurations[curationIdx]]);

  return destFolder;
}

/**
 * Check of a string is a valid date.
 * Format: "YYYY(-M(M)(-D(D)))"
 * Explanation: "M" and "D" can be one or two digits long.
 *              "M" must be between 1 and 12, and "D" must be between 1 and 31.
 * Examples: "2007", "2010-11", "2019-07-17"
 * Source: https://stackoverflow.com/questions/22061723/regex-date-validation-for-yyyy-mm-dd (but slightly modified)
 *
 * @param str String to check.
 */
function isValidDate(str: string): boolean {
  return (/^\d{4}(-(0?[1-9]|1[012])(-(0?[1-9]|[12][0-9]|3[01]))?)?$/).test(str);
}

export async function makeCurationFromGame(state: BackState, gameId: string, skipDataPack?: boolean): Promise<string | undefined> {
  const game = await fpDatabase.findGame(gameId);
  const folder = uuid();
  if (game) {
    const curPath = path.join(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, folder);
    await fs.promises.mkdir(curPath, { recursive: true });
    const contentFolder = path.join(curPath, 'content');
    await fs.promises.mkdir(contentFolder, { recursive: true });

    const imagesRoot = path.join(state.config.flashpointPath, state.preferences.imageFolderPath);
    // Copy images (download from remote if does not exist)
    const logoRelPath = path.join('Logos', gameId.substring(0, 2), gameId.substring(2, 4), `${gameId}.png`);
    const logoPath = path.join(imagesRoot, logoRelPath);
    await fs.access(logoPath, fs.constants.F_OK)
    .then(() => {
      // Copy existing image
      return fs.copyFile(logoPath, path.join(curPath, 'logo.png'));
    })
    .catch(async () => {
      // Download fresh image
      const destPath = path.join(curPath, 'logo.png');
      const url = new URL(logoRelPath, state.preferences.onDemandBaseUrl);
      const writer = fs.createWriteStream(destPath);
      await axios.get(url.href, {
        responseType: 'stream',
      }).then((response) => {
        return new Promise<void>((resolve, reject) => {
          response.data.pipe(writer);
          writer.on('error', reject);
          writer.on('close', resolve);
        });
      });
    });

    const screenshotRelPath = path.join('Screenshots', gameId.substring(0, 2), gameId.substring(2, 4), `${gameId}.png`);
    const screenshotPath = path.join(imagesRoot, screenshotRelPath);
    await fs.access(screenshotPath, fs.constants.F_OK)
    .then(() => {
      // Copy existing image
      return fs.copyFile(screenshotPath, path.join(curPath, 'ss.png'));
    })
    .catch(async () => {
      // Download fresh image
      const destPath = path.join(curPath, 'ss.png');
      const url = new URL(screenshotRelPath, state.preferences.onDemandBaseUrl);
      const writer = fs.createWriteStream(destPath);
      await axios.get(url.href, {
        responseType: 'stream',
      }).then((response) => {
        return new Promise<void>((resolve, reject) => {
          response.data.pipe(writer);
          writer.on('error', reject);
          writer.on('close', resolve);
        });
      });
    });

    // Extract active data pack if exists
    if (game.activeDataId) {
      await checkAndDownloadGameData(game.activeDataId);
      const activeData = await fpDatabase.findGameDataById(game.activeDataId);
      if (activeData && activeData.path && !skipDataPack) {
        // Extract data pack into curation folder
        const dataPath = path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath, activeData.path);
        await extractFullPromise([dataPath, curPath, { $bin: state.sevenZipPath }]);
        // Clean up content.json file from extracted data pack
        await fs.unlink(path.join(curPath, 'content.json'))
        .catch(() => { /** Probably doesn't exist */ });
        log.debug('Launcher', 'Make Curation From Game - Found and extracted data pack into curation folder');
      }
      if (activeData) {
        // Update curation meta fields with saved
        (game as any).applicationPath = activeData.applicationPath;
        (game as any).launchCommand = activeData.launchCommand;
        (game as any).mountParameters = activeData.parameters || '';
      }
    } else {
      (game as any).applicationPath = game.legacyApplicationPath;
      (game as any).launchCommand = game.legacyLaunchCommand;
      log.debug('Launcher', 'Make Curation From Game - Game has no active data');
    }

    const data: LoadedCuration = {
      folder,
      uuid: game.id,
      group: '',
      fpfssInfo: null,
      game: {
        ...game,
        tags: game.detailedTags,
        platforms: game.detailedPlatforms,
      },
      addApps: game.addApps ? game.addApps.map<AddAppCuration>(a => {
        return {
          key: uuid(),
          heading: a.name,
          applicationPath: a.applicationPath,
          launchCommand: a.launchCommand
        };
      }) : [],
      thumbnail: await loadCurationIndexImage(path.join(curPath, 'logo.png')),
      screenshot: await loadCurationIndexImage(path.join(curPath, 'ss.png'))
    };
    const curation: CurationState = {
      ...data,
      alreadyImported: true,
      warnings: await genCurationWarnings(data, state.config.flashpointPath, state.suggestions, state.languageContainer.curate, state.apiEmitters.curations.onWillGenCurationWarnings),
    };
    await saveCuration(curPath, curation);
    state.loadedCurations.push(curation);

    // Let contents update without blocking
    genContentTree(getContentFolderByKey(folder, state.config.flashpointPath))
    .then((contentTree) => {
      const idx = state.loadedCurations.findIndex(c => c.folder === folder);
      if (idx > -1) {
        state.loadedCurations[idx].contents = contentTree;
        state.socketServer.broadcast(BackOut.CURATE_CONTENTS_CHANGE, folder, contentTree);
      }
    });

    // Send back responses
    state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
    return curation.folder;
  }
}

export async function refreshCurationContent(state: BackState, folder: string) {
  const curationIdx = state.loadedCurations.findIndex(c => c.folder === folder);
  if (curationIdx !== -1) {
    const curation = state.loadedCurations[curationIdx];
    const contentPath = getContentFolderByKey(curation.folder, state.config.flashpointPath);
    // Check for new loaded images
    if (curation.thumbnail.exists === false) {
      curation.thumbnail = await loadCurationIndexImage(path.join(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, curation.folder, 'logo.png'));
    } else {
      curation.thumbnail.version += 1;
    }
    if (curation.screenshot.exists === false) {
      curation.screenshot = await loadCurationIndexImage(path.join(state.config.flashpointPath, CURATIONS_FOLDER_WORKING, curation.folder, 'ss.png'));
    } else {
      curation.screenshot.version += 1;
    }
    curation.contents = await genContentTree(contentPath);
    curation.warnings = await genCurationWarnings(curation, state.config.flashpointPath, state.suggestions, state.languageContainer['curate'], state.apiEmitters.curations.onWillGenCurationWarnings);
    state.loadedCurations[curationIdx] = curation;
    state.socketServer.broadcast(BackOut.CURATE_LIST_CHANGE, [curation]);
  }
}
