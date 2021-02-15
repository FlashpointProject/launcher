import * as SourceDataManager from '@back/game/SourceDataManager';
import * as SourceManager from '@back/game/SourceManager';
import { Source } from '@database/entity/Source';
import { SourceData } from '@database/entity/SourceData';
import { sizeToString } from '@shared/Util';
import { throttle } from '@shared/utils/throttle';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { getManager } from 'typeorm';

export function find(): Promise<Source[]> {
  const sourceRepository = getManager().getRepository(Source);
  return sourceRepository.find();
}

export function findOne(sourceId: number): Promise<Source | undefined> {
  const sourceRepository = getManager().getRepository(Source);
  return sourceRepository.findOne(sourceId);
}

export function findBySourceFileUrl(sourceFileUrl: string): Promise<Source | undefined> {
  const sourceRepository = getManager().getRepository(Source);
  return sourceRepository.findOne({
    where: {
      sourceFileUrl
    }
  });
}

export function save(source: Source): Promise<Source> {
  const sourceRepository = getManager().getRepository(Source);
  return sourceRepository.save(source);
}

export async function importFromURL(url: string, saveDir: string, onProgress?: (progress: number) => void): Promise<Source> {
  const progressThrottle = onProgress && throttle(onProgress, 250);
  // Generate / Open File to save
  const parsedUrl = new URL(url);
  const filePath = path.join(saveDir, `${parsedUrl.hostname}${parsedUrl.pathname.replace('/', '.')}.source`);
  // Fetch URL
  const res = await axios.get(url,
    {
      responseType: 'stream'
    });
  const contentLength: number = res.headers['content-length'];
  log.debug('Launcher', 'Source Download Started');
  let progress = 0;
  const fileStream = fs.createWriteStream(filePath);
  return new Promise<Source>((resolve, reject) => {
    fileStream.on('close', async () => {
      log.debug('Launcher', `Source Downloaded: '${url}' to '${filePath}' (${sizeToString(contentLength)})`);
      onProgress && onProgress(1);
      // Set up Source
      const splitUrl = parsedUrl.href.split('/');
      const baseUrl = splitUrl.slice(0, splitUrl.length - 1).join('/');
      let source = (await SourceManager.findBySourceFileUrl(url)) || new Source();
      const date = new Date();
      source.name = source.name || url;
      source.dateAdded = source.dateAdded || date;
      source.lastUpdated = date;
      source.baseUrl = baseUrl;
      source.sourceFileUrl = url;
      source.count = -1;
      source = await SourceManager.save(source);
      // Clear old SourceData
      log.debug('Launcher', 'Clearing old SourceData...');
      await SourceDataManager.clearSource(source.id);
      log.debug('Launcher', 'Loading new Source file...');
      // Parse Source file
      const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
      const rl = readline.createInterface({
        input: readStream
      });
      let hash: string | undefined = undefined;
      log.debug('Launcher', 'Reading Source file into DB');
      let sdBuffer: SourceData[] = [];
      for await (const line of rl) {
        if (hash) {
          const sourceData = new SourceData();
          sourceData.sha256 = hash;
          sourceData.sourceId = source.id;
          sourceData.urlPath = line;
          sdBuffer.push(sourceData);
          if (sdBuffer.length > 2000) {
            // Push a transaction when 500 stored
            await SourceDataManager.updateData(sdBuffer);
            sdBuffer = [];
          }
          hash = undefined;
        } else {
          hash = line;
        }
      }
      if (sdBuffer.length > 0) {
        await SourceDataManager.updateData(sdBuffer);
      }
      log.info('Launcher', 'Updated Source.');
      source.count = await SourceDataManager.countBySource(source.id);
      log.info('Launcher', `Found ${source.count} Data Packs.`);
      resolve(await SourceManager.save(source));
    });
    res.data.on('data', (chunk: any) => {
      progress = progress + chunk.length;
      progressThrottle && progressThrottle(progress / contentLength);
      fileStream.write(chunk);
    });
    res.data.on('end', () => {
      fileStream.close();
    });
  });
}
