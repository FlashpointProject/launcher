import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import { IncomingMessage } from 'http';
import { extractFull } from 'node-7z';
import * as os from 'os';
import * as path from 'path';
import * as stream from 'stream';
import { UpgradeStage } from '../upgrade/types';
import { pathTo7z } from './SevenZip';
const http  = require('follow-redirects').http;
const https = require('follow-redirects').https;

interface IGetUpgradeOpts {
  /** Path to install the upgrade to */
  installPath: string;
  /** Name of file to save to */
  downloadFilename: string;
}

export interface UpgradeStatus {
  /** Fired whenever progress is made in the process */
  on(event: 'progress', handler: () => void): this;
  emit(event: 'progress'): boolean;
  /** Fired when an error occurs, this also means that the process has ended */
  once(event: 'error', handler: (error: any) => void): this;
  emit(event: 'error', error: any): boolean;
  /** Fired when something goes wrong, this DOES NOT mean that the process has ended */
  on(event: 'warn', handler: (warning: string) => void): this;
  emit(event: 'warn', warning: string): boolean;
  /** Fired when the process is done (and it was successful) */
  once(event: 'done', handler: () => void): this;
  emit(event: 'done'): boolean;
}

export type UpgradeStatusTask = 'downloading' | 'extracting' | 'none';

export class UpgradeStatus extends EventEmitter {
  public currentTask: UpgradeStatusTask = 'none';
  public downloadProgress: number = 0;
  public extractProgress: number = 0;

  /** Get the estimated progress of the whole process (from 0 to 1) */
  public getEstimatedProgress(): number {
    return this.downloadProgress;
  }
}

interface UpgradeDownloadStatus {
  /** Fired when an error occurs, this also means that the process has ended */
  once(event: 'error', handler: (error: any) => void): this;
  emit(event: 'error', error: any): boolean;
  /** Fired when process has been made */
  once(event: 'progress', handler: () => void): this;
  emit(event: 'progress'): boolean;
  /** Fired when the process is done (and it was successful) */
  once(event: 'done', handler: (filePath: string) => void): this;
  emit(event: 'done', filePath: string): boolean;
}
class UpgradeDownloadStatus extends EventEmitter {
  /** Number of bytes downloaded */
  bytesDownloaded: number = 0;
  /** Number of bytes to download (in total) */
  contentLength: number = 0;
}

export function downloadAndInstallUpgrade(upgrade: UpgradeStage, opts: IGetUpgradeOpts): UpgradeStatus {
  const status = new UpgradeStatus();
  status.currentTask = 'downloading';
  log(`Download of upgrade "${upgrade.title}" started.`);
  const dlStatus = (
    downloadUpgrade(upgrade, opts.downloadFilename, (offset) => { status.downloadProgress = offset / 1; })
    .on('progress', () => {
      if (dlStatus.contentLength > 0) {
        status.downloadProgress = dlStatus.bytesDownloaded / dlStatus.contentLength;
        status.emit('progress');
      }
    })
    .once('done', (zipPath) => {
      console.log(zipPath);
      status.currentTask = 'extracting';
      log(`Download of the "${upgrade.title}" upgrade complete!`);
      log(`Installation of the "${upgrade.title}" upgrade started.`);
      extractFull(zipPath, opts.installPath, { $bin: pathTo7z, $progress: true })
      .on('progress', (progress) => {
        status.extractProgress = progress.percent / 100;
        status.emit('progress');
      })
      .once('end', () => {
        log(`Installation of the "${upgrade.title}" upgrade complete!\n`+
            'Restart the launcher for the upgrade to take effect.');
        status.emit('done');
      })
      .once('error', (error) => {
        log(`Installation of the "${upgrade.title}" upgrade failed!\n${error}`);
        status.emit('error', error);
      });
    })
    .once('error', (error) => {
      log(`Download of the "${upgrade.title}" upgrade failed!\n${error}`);
      status.emit('error', error);
    })
  );
  return status;
}

/**
 * Download and save upgrade file to the temp folder (or if local, just check if the file exists)
 * @param upgrade Upgrade to download
 * @returns Path of the local zip file, ready for extraction/installation
 */
function downloadUpgrade(upgrade: UpgradeStage, filename: string, onData: (offset: number) => void): UpgradeDownloadStatus {
  const status = new UpgradeDownloadStatus();
  tryDownload(0);
  return status;
  /** Try downloading/locating the file */
  function tryDownload(index: number) {
    const urlOrPath = upgrade.sources[index];
    if (urlOrPath.startsWith('file://') || urlOrPath.indexOf('://') === -1) { // (Local file)
      fs.exists(urlOrPath, (exists) => {
        if (exists) { status.emit('done', urlOrPath); }
        else        { status.emit('error', new Error('File does not exist.')); }
      });
    } else { // (Network resource)
      let protocol: any = urlOrPath.startsWith('https://') ? https : http;
      try {
        protocol.get(urlOrPath, (res: IncomingMessage) => {
          const { statusCode, headers } = res;
          status.contentLength = parseInt(headers['content-length']+'', 10);
          if (statusCode === 200) {
            const filePath = path.posix.join(os.tmpdir(), filename);
            const fileStream = fs.createWriteStream(filePath);
            res.pipe(createMiddleStream(length => {
                  status.bytesDownloaded += length;
                  status.emit('progress');
                }))
                .pipe(fileStream);
            res.once('error', (error) => { status.emit('error', error); });
            fileStream.on('close', () => { status.emit('done', filePath); });
          } else { status.emit('error', new Error(`File request failed. Server responded with code: ${res.statusCode}`)); }
        });
      }
      catch (error) { status.emit('error', new Error(`File download failed. ${error}`)); }
    }
  }
}

/**
 * Check if all files in the stage's "checks" array exists.
 * This aborts as soon as it encounters a "check" that does not exist.
 * @param stage Stage to check the "checks" of.
 * @param flashpointFolder Path of the Flashpoint folder root.
 */
export async function performUpgradeStageChecks(stage: UpgradeStage, flashpointFolder: string): Promise<boolean[]> {
  const success = await Promise.all(stage.checks.map(check => (
    fs.pathExists(path.join(flashpointFolder, check))
  )));
  return success;
}

function log(content: string): void {
  window.External.log.addEntry({
    source: 'Upgrade',
    content: content
  });
}

/** Create a transform stream that reads the length of the data being passed along */
function createMiddleStream(onData: (length: number) => void): stream.Transform {
  return new stream.Transform({
    transform(chunk, encoding, callback) {
      this.push(chunk);
      onData(chunk.length);
      callback();
    }
  });
}
