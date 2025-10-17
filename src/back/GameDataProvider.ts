import { DownloadDetails } from '@shared/back/types';
import { downloadFile } from '@shared/Util';
import { getGameDataFilename } from '@shared/utils/misc';
import { GameData, GameDataProvider, GameDataSource } from 'flashpoint-launcher';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import { axios } from './dns';
import { importGameDataSkipHash } from './download';

export const GameDataProviderRaw: GameDataProvider = {
  id: 'ds-raw',
  name: 'Https Downloader',
  downloadGame: async (source: GameDataSource, gameData: GameData, dataPacksFolderPath: string, abortSignal: AbortSignal, onProgress?: (percent: number) => void, onDetails?: (details: DownloadDetails) => void) => {
    if (source.type !== 'raw') {
      return false;
    }

    const filename = getGameDataFilename(gameData);
    const fullUrl = new URL(filename, source.arguments[0]).href;
    const tempPath = path.join(dataPacksFolderPath, `${filename}.temp`);
    await downloadFile(axios, fullUrl, tempPath, abortSignal, onProgress, onDetails);
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
    });

    return true;
  }
};
