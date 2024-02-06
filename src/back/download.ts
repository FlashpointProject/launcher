import { downloadFile } from '@shared/Util';
import * as crypto from 'crypto';
import { GameData, GameDataSource } from 'flashpoint-launcher';
import * as fs from 'fs';
import * as path from 'path';
import { fpDatabase, onDidInstallGameData } from '.';
import { DownloadDetails } from '@shared/back/types';
import { PartialGameData } from '@fparchive/flashpoint-archive';

export async function downloadGameData(gameDataId: number, dataPacksFolderPath: string, sources: GameDataSource[], abortSignal: AbortSignal, onProgress?: (percent: number) => void, onDetails?: (details: DownloadDetails) => void): Promise<void> {
  const gameData = await fpDatabase.findGameDataById(gameDataId);
  const sourceErrors: string[] = [];
  log.debug('Game Launcher', `Checking ${sources.length} Sources for this GameData...`);
  if (gameData) {
    // GameData real, find an available source
    for (const source of sources) {
      try {
        const fullUrl = new URL(`${gameData.gameId}-${new Date(gameData.dateAdded).getTime()}.zip`, source.arguments[0]).href;
        const tempPath = path.join(dataPacksFolderPath, `${gameData.gameId}-${new Date(gameData.dateAdded).getTime()}.zip.temp`);
        await downloadFile(fullUrl, tempPath, abortSignal, onProgress, onDetails);
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
                await importGameDataSkipHash(gameData.gameId, tempPath, dataPacksFolderPath, sha256, gameData)
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
        const sourceError = `Downloading from Source "${source.name}" failed:\n ${error}`;
        sourceErrors.push(sourceError);
      }
    }
    throw ['No working Sources available for this GameData.'].concat(sourceErrors).join('\n\n');
  }
}

export async function importGameDataSkipHash(gameId: string, filePath: string, dataPacksFolderPath: string, sha256: string, existingGameData?: GameData): Promise<GameData> {
  await fs.promises.access(filePath, fs.constants.F_OK);
  // Gather basic info
  const stats = await fs.promises.stat(filePath);
  if (!existingGameData) {
    const gameData = await fpDatabase.findGameData(gameId);
    existingGameData = gameData.find(g => g.sha256.toLowerCase() === sha256.toLowerCase());
  }
  // Copy file
  const dateAdded = new Date();
  const newFilename = existingGameData ? `${gameId}-${new Date(existingGameData.dateAdded).getTime()}.zip` : `${gameId}-${dateAdded.getTime()}.zip`;
  const newPath = path.join(dataPacksFolderPath, newFilename);
  await fs.promises.copyFile(filePath, newPath);
  if (existingGameData) {
    existingGameData.path = newFilename;
    existingGameData.presentOnDisk = true;
    return fpDatabase.saveGameData(existingGameData);
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
