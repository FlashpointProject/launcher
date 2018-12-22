import * as fs from 'fs';
import * as os from 'os';
import { unzip } from '../util/unzip';
import { IUpgradeStage } from '../upgrade/upgrade';
const MultipartDownload = require('multipart-download');

interface IGetUpgradeOpts {
  /** Path to install the upgrade to */
  installPath: string;
  /** Title of the upgrade (for logging purposes) */
  upgradeTitle: string;
}

interface IGetUpgradeResult {

}

export function downloadAndInstallUpgrade(upgrade: IUpgradeStage, opts: IGetUpgradeOpts): Promise<IGetUpgradeResult> {
  return new Promise((resolve, reject) => {
    log(`Download of upgrade "${opts.upgradeTitle}" started.`);
    downloadUpgrade(upgrade)
    .then((zipPath) => {
      log(`Download of the "${opts.upgradeTitle}" upgrade complete!`);
      log(`Installation of the "${opts.upgradeTitle}" upgrade started.`);
      console.log(opts.installPath);
      unzip(zipPath, opts.installPath)
      .on('warn', warning => { log(warning); })
      .once('done', () => {
        log(`Installation of the "${opts.upgradeTitle}" upgrade complete!\n`+
            'Restart the launcher for the upgrade to take effect.');
        resolve();
      })
      .once('error', (error) => {
        log(`Installation of the "${opts.upgradeTitle}" upgrade failed!\nError: ${error}`);
        reject(error);
      });
    })
    .catch((error) => {
      log(`Download of the "${opts.upgradeTitle}" upgrade failed!\nError: ${error}`);
      reject(error);
    });
  });
}

/**
 * Download and save upgrade file to the temp folder (or if local, just check if the file exists)
 * @param upgrade Upgrade to download
 * @returns Path of the local zip file, ready for extraction/installation
 */
function downloadUpgrade(upgrade: IUpgradeStage): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlOrPath = upgrade.sources[0];
    if (urlOrPath.startsWith('file://') || urlOrPath.indexOf('://') === -1) { // (Local file)
      fs.exists(urlOrPath, (exists) => {
        if (exists) { resolve(urlOrPath); }
        else        { reject();  }
      });
    } else { // (Network resource)
      (new MultipartDownload()).start(urlOrPath, {
        numOfConnections: 3,
        saveDirectory: os.tmpdir(),
        fileName: 'flashpoint_screenshots.zip',
      })
      .on('end', (output: string) => resolve(output))
      .on('error', (error: any) => reject(error));
    }
  });
}

function log(content: string): void {
  window.External.log.addEntry({
    source: 'Upgrade',
    content: content
  });
}
