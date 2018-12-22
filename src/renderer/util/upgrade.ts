import { EventEmitter } from 'events';
import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { unzip } from '../util/unzip';
import { IUpgradeStage } from '../upgrade/upgrade';

interface IGetUpgradeOpts {
  /** Path to install the upgrade to */
  installPath: string;
  /** Title of the upgrade (for logging purposes) */
  upgradeTitle: string;
}

export declare interface UpgradeStatus {
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

export class UpgradeStatus extends EventEmitter {
  /** */
  public downloadProgress: number = 0;

  /** Get the estimated progess of the whole process (from 0 to 1) */
  public getEstimagedProgress(): number {
    return this.downloadProgress;
  }
}

export function downloadAndInstallUpgrade(upgrade: IUpgradeStage, opts: IGetUpgradeOpts): UpgradeStatus {
  const status = new UpgradeStatus();
  log(`Download of upgrade "${opts.upgradeTitle}" started.`);
  downloadUpgrade(upgrade, opts.upgradeTitle, (offset) => { status.downloadProgress = offset / 1; })
  .then((zipPath) => {
    log(`Download of the "${opts.upgradeTitle}" upgrade complete!`);
    log(`Installation of the "${opts.upgradeTitle}" upgrade started.`);
    unzip(zipPath, opts.installPath)
    .on('warn', warning => { log(warning); })
    .once('done', () => {
      log(`Installation of the "${opts.upgradeTitle}" upgrade complete!\n`+
          'Restart the launcher for the upgrade to take effect.');
      status.emit('done');
    })
    .once('error', (error) => {
      log(`Installation of the "${opts.upgradeTitle}" upgrade failed!\nError: ${error}`);
      status.emit('error', error);
    });
  })
  .catch((error) => {
    log(`Download of the "${opts.upgradeTitle}" upgrade failed!\nError: ${error}`);
    status.emit('error', error);
  });
  return status;
}

/**
 * Download and save upgrade file to the temp folder (or if local, just check if the file exists)
 * @param upgrade Upgrade to download
 * @returns Path of the local zip file, ready for extraction/installation
 */
function downloadUpgrade(upgrade: IUpgradeStage, title: string, onData: (offset: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlOrPath = upgrade.sources[0];
    if (urlOrPath.startsWith('file://') || urlOrPath.indexOf('://') === -1) { // (Local file)
      fs.exists(urlOrPath, (exists) => {
        if (exists) { resolve(urlOrPath); }
        else        { reject();  }
      });
    } else { // (Network resource)
      http.get(urlOrPath, (res) => {
        if (res.statusCode === 200) {
          const filePath = path.join(os.tmpdir(), `flashpoint_stage_${title}.zip`);
          const fileStream = fs.createWriteStream(filePath);
          res.pipe(fileStream);
          res.once('end', () => { resolve(filePath); });
          res.once('error', (error) => { reject(error); });          
        } else { reject(new Error(`File request failed. Server responded with code: ${res.statusCode}`)); }
      });
    }
  });
}

function log(content: string): void {
  window.External.log.addEntry({
    source: 'Upgrade',
    content: content
  });
}
