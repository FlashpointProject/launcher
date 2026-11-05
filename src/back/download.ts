import { PartialGameData } from '@fparchive/flashpoint-archive';
import { DownloadDetails } from '@shared/back/types';
import { downloadFile } from '@shared/Util';
import { getGameDataFilename } from '@shared/utils/misc';
import { GameData, GameDataSource } from 'flashpoint-launcher';
import * as fs from 'fs';
import * as crypto from 'node:crypto';
import * as path from 'path';
import { fpDatabase } from '.';
import { axios } from './dns';
import { EventQueue } from './util/EventQueue';
import { onDidInstallGameData } from './util/events';

export async function downloadGameData(gameDataId: number, dataPacksFolderPath: string, sources: GameDataSource[], abortSignal: AbortSignal,
  onProgress?: (percent: number) => void, onDetails?: (details: DownloadDetails) => void, databaseQueue?: EventQueue): Promise<void> {
  const gameData = await fpDatabase.findGameDataById(gameDataId);
  const sourceErrors: string[] = [];
  log.debug('Game Launcher', `Checking ${sources.length} Sources for this GameData...`);
  if (gameData) {
    // GameData real, find an available source
    for (const source of sources) {
      const filename = getGameDataFilename(gameData);
      const fullUrl = new URL(filename, source.arguments[0]);
      if (fullUrl.host !== new URL(source.arguments[0]).host) {
        throw new Error(`Filename URL escapes source host: ${fullUrl.href}`);
      }
      try {
        const tempPath = path.join(dataPacksFolderPath, `${filename}.temp`);
        log.info('Launcher', 'Downloading game data to ' + tempPath);
        await downloadFile(axios, fullUrl.href, tempPath, abortSignal, onProgress, onDetails);
        // Check hash of download
        const hash = crypto.createHash('sha256');
        hash.setEncoding('hex');
        const stream = fs.createReadStream(tempPath);
        await new Promise<void>((resolve, reject) => {
          stream.on('end', async () => {
            const sha256 = hash.digest('hex').toUpperCase();
            console.log(`hash ${sha256}`);
            if (sha256.toLowerCase() !== gameData.sha256.toLowerCase()) {
              reject('Hash of download does not match! Download aborted.\n (It may be a corrupted download, try again)');
            } else {
              try {
                log.debug('Game Launcher', 'Validated game data, importing to games folder');
                await importGameDataSkipHash(gameData.gameId, tempPath, dataPacksFolderPath, sha256, gameData, databaseQueue)
                .catch((err) => {
                  console.log(`Error importing game data ${err}`);
                  log.error('Launcher', 'Error importing game data ' + err);
                  throw err;
                });
                await fs.promises.unlink(tempPath);
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          });
          stream.pipe(hash);
        })
        .then(async () => {
          await onDidInstallGameData.fire(gameData);
        });
        return;
      } catch (error) {
        const sourceError = `Downloading from Source "${source.name}" (${fullUrl}) failed:\n ${error}`;
        sourceErrors.push(sourceError);
      }
    }
    throw ['No working Sources available for this GameData.'].concat(sourceErrors).join('\n\n');
  }
}

export async function importGameDataSkipHash(gameId: string, filePath: string, dataPacksFolderPath: string, sha256: string,
  existingGameData?: GameData, databaseQueue?: EventQueue): Promise<GameData> {
  await fs.promises.access(filePath, fs.constants.F_OK);
  // Gather basic info
  const stats = await fs.promises.stat(filePath);
  if (!existingGameData) {
    const gameData = await fpDatabase.findGameData(gameId);
    existingGameData = gameData.find(g => g.sha256.toLowerCase() === sha256.toLowerCase());
  }
  // Copy file
  const dateAdded = new Date();
  const cleanDate = existingGameData ? existingGameData.dateAdded.includes('T') ? existingGameData.dateAdded : `${existingGameData.dateAdded} +0000 UTC` : '';
  const newFilename = existingGameData ? `${gameId}-${new Date(cleanDate).getTime()}.zip` : `${gameId}-${dateAdded.getTime()}.zip`;
  const newPath = path.join(dataPacksFolderPath, newFilename);
  await fs.promises.copyFile(filePath, newPath);
  if (existingGameData) {
    existingGameData.path = newFilename;
    existingGameData.presentOnDisk = true;
    if (databaseQueue !== undefined) {
      return new Promise<GameData>((resolve, reject) => {
        databaseQueue.push(async () => {
          try {
            resolve(await fpDatabase.saveGameData(existingGameData));
          } catch (err) {
            reject(err);
          }
        })
      });
    } else {
      return fpDatabase.saveGameData(existingGameData)
    }
  } else {
    const newGameData: PartialGameData = {
      title: 'Data Pack',
      gameId: gameId,
      size: stats.size,
      dateAdded: dateAdded.toISOString(),
      presentOnDisk: true,
      path: newFilename,
      sha256,
      crc32: 0,
      applicationPath: '',
      launchCommand: '',
    };
    if (databaseQueue) {
      return new Promise<GameData>((resolve, reject) => {
        databaseQueue.push(async () => {
          try {
            const gameData = await fpDatabase.createGameData(newGameData);
            const game = await fpDatabase.findGame(gameId);
            if (game) {
              game.activeDataId = gameData.id;
              game.activeDataOnDisk = gameData.presentOnDisk;
              await fpDatabase.saveGame(game);
              resolve(gameData);
            }
            reject();
          } catch (err) {
            reject(err);
          }
        })
      });
    }
    const gameData = await fpDatabase.createGameData(newGameData);
    const game = await fpDatabase.findGame(gameId);
    if (game) {
      game.activeDataId = gameData.id;
      game.activeDataOnDisk = gameData.presentOnDisk;
      await fpDatabase.saveGame(game);
      return gameData;
    }
  }
  throw 'Something went wrong importing (skipped hash)';
}
