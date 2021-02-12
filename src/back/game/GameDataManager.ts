import { GameData } from '@database/entity/GameData';
import { SourceData } from '@database/entity/SourceData';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getManager, In } from 'typeorm';
import * as GameManager from './GameManager';

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

export function importGameData(gameId: string, filePath: string, fullDataPacksFolderPath: string): Promise<GameData> {
  return new Promise<GameData>((resolve, reject) => {
    fs.promises.access(filePath, fs.constants.R_OK)
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
        const newPath = path.join(fullDataPacksFolderPath, newFilename);
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
