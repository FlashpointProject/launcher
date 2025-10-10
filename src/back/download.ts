import { PartialGameData } from '@fparchive/flashpoint-archive';
import { DownloadDetails } from '@shared/back/types';
import { GameData } from 'flashpoint-launcher';
import * as fs from 'fs';
import * as path from 'path';
import { fpDatabase } from '.';
import { BackState } from './types';
import { EventQueue } from './util/EventQueue';

export async function downloadGameData(gameDataId: number, state: BackState, abortSignal: AbortSignal,
  onProgress?: (percent: number) => void, onDetails?: (details: DownloadDetails) => void): Promise<void> {
  const gameData = await fpDatabase.findGameDataById(gameDataId);
  log.debug('Game Launcher', `Checking ${state.preferences.gameDataSources.length} Sources for this GameData...`);
  if (gameData) {
    for (const source of state.preferences.gameDataSources) {
      let success = false;
      for (const provider of state.registry.dataSources.values()) {
        log.debug('Launcher', `testing ${provider.name}`);
        const dataPacksFullPath = path.join(state.config.flashpointPath, state.preferences.dataPacksFolderPath);
        try {
          success = await provider.downloadGame(source, gameData, dataPacksFullPath, abortSignal, onProgress, onDetails);
          if (success) {
            return;
          }
        } catch (err) {
          log.error('Launcher', `Error from source ${provider.name} (${provider.id}) - ${err}`);
          success = false;
        }
      }
    }
  }
  throw new Error('No working Sources available for this GameData.');
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
        });
      });
    } else {
      return fpDatabase.saveGameData(existingGameData);
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
        });
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
