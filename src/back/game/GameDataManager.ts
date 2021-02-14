import { GameData } from '@database/entity/GameData';
import { SourceData } from '@database/entity/SourceData';
import { downloadFile } from '@renderer/Util';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getManager, In } from 'typeorm';
import * as GameManager from './GameManager';
import * as SourceManager from './SourceManager';

export async function downloadGameData(gameDataId: number, dataPacksFolderPath: string, onProgress?: (percent: number) => void): Promise<void> {
  const gameData = await findOne(gameDataId);
  console.log('fetching gamedata');
  if (gameData) {
    if (gameData.presentOnDisk) { return; }
    console.log('fetching sourcedata');
    // GameData real, check each source that's available
    const sourceData = await findSourceDataForHashes([gameData.sha256]);
    for (const sd of sourceData) {
      const source = await SourceManager.findOne(sd.sourceId);
      if (source) {
        console.log(`trying ${source.name}`);
        const fullUrl = new URL(sd.urlPath, source?.baseUrl).href;
        const tempPath = path.join(dataPacksFolderPath, `${gameData.gameId}-${gameData.dateAdded.getTime()}.zip.temp`);
        try {
          await downloadFile(fullUrl, tempPath, onProgress);
          // Check hash of download
          const hash = crypto.createHash('sha256');
          hash.setEncoding('hex');
          const stream = fs.createReadStream(tempPath);
          await new Promise<void>((resolve, reject) => {
            stream.on('end', async () => {
              const sha256 = hash.digest('hex').toUpperCase();
              console.log(`hash ${sha256}`);
              if (sha256 !== gameData.sha256) {
                reject('Hash of download does not match! Download aborted.');
              } else {
                await importGameDataSkipHash(gameData.gameId, tempPath, dataPacksFolderPath, sha256);
                console.log('imported, cleaning up');
                await fs.promises.unlink(tempPath);
                resolve();
              }
            });
            stream.pipe(hash);
          });
          return;
        } catch (error) {
          log.info('Launcher', `Downloading from Source "${source.name}" (${fullUrl}) failed: ${error}`);
        }
      }
    }
    throw 'No working Sources available for this GameData.';
  }
}

export function findOne(id: number): Promise<GameData | undefined> {
  const gameDataRepository = getManager().getRepository(GameData);
  return gameDataRepository.findOne(id);
}

export function findGameData(gameId: string): Promise<GameData[]> {
  const gameDataRepository = getManager().getRepository(GameData);
  return gameDataRepository.find({
    where: {
      gameId
    }
  });
}

export function findSourceDataForHashes(hashes: string[]): Promise<SourceData[]> {
  const sourceDataRepository = getManager().getRepository(SourceData);
  return sourceDataRepository.find({
    sha256: In(hashes)
  });
}

export function save(gameData: GameData): Promise<GameData> {
  const gameDataRepository = getManager().getRepository(GameData);
  return gameDataRepository.save(gameData);
}

export async function importGameDataSkipHash(gameId: string, filePath: string, dataPacksFolderPath: string, sha256: string): Promise<GameData> {
  await fs.promises.access(filePath, fs.constants.F_OK);
  // Gather basic info
  const stats = await fs.promises.stat(filePath);
  const gameData = await findGameData(gameId);
  const existingGameData = gameData.find(g => g.sha256 === sha256);
  // Copy file
  const dateAdded = new Date();
  const newFilename = existingGameData ? `${gameId}-${existingGameData.dateAdded.getTime()}.zip` : `${gameId}-${dateAdded.getTime()}.zip`;
  const newPath = path.join(dataPacksFolderPath, newFilename);
  await fs.promises.copyFile(filePath, newPath);
  if (existingGameData) {
    if (existingGameData.presentOnDisk === false) {
      existingGameData.path = newFilename;
      existingGameData.presentOnDisk = true;
      return save(existingGameData);
    }
  } else {
    const newGameData = new GameData();
    newGameData.title = 'Data Pack';
    newGameData.gameId = gameId;
    newGameData.size = stats.size;
    newGameData.dateAdded = dateAdded;
    newGameData.presentOnDisk = true;
    newGameData.path = newFilename;
    newGameData.sha256 = sha256;
    newGameData.crc32 = 0; // TODO: Find decent lib for CRC32
    const gameData = await save(newGameData);
    const game = await GameManager.findGame(gameId);
    if (game) {
      game.activeDataId = gameData.id;
      game.activeDataOnDisk = gameData.presentOnDisk;
      return gameData;
    }
  }
  throw 'Something went wrong importing (skipped hash)';
}

export function importGameData(gameId: string, filePath: string, dataPacksFolderPath: string): Promise<GameData> {
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
        const gameData = await findGameData(gameId);
        const existingGameData = gameData.find(g => g.sha256 === sha256);
        // Copy file
        const dateAdded = new Date();
        const newFilename = existingGameData ? `${gameId}-${existingGameData.dateAdded.getTime()}.zip` : `${gameId}-${dateAdded.getTime()}.zip`;
        const newPath = path.join(dataPacksFolderPath, newFilename);
        await fs.promises.copyFile(filePath, newPath);
        if (existingGameData) {
          if (existingGameData.presentOnDisk === false) {
            existingGameData.path = newFilename;
            existingGameData.presentOnDisk = true;
            save(existingGameData)
            .then(resolve)
            .catch(reject);
          }
        } else {
          const newGameData = new GameData();
          newGameData.title = 'Data Pack';
          newGameData.gameId = gameId;
          newGameData.size = stats.size;
          newGameData.dateAdded = dateAdded;
          newGameData.presentOnDisk = true;
          newGameData.path = newFilename;
          newGameData.sha256 = sha256;
          newGameData.crc32 = 0; // TODO: Find decent lib for CRC32
          save(newGameData)
          .then(async (gameData) => {
            const game = await GameManager.findGame(gameId);
            if (game) {
              game.activeDataId = gameData.id;
              game.activeDataOnDisk = gameData.presentOnDisk;
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
