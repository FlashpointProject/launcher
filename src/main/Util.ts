import * as fs from 'fs';
import * as util from 'util';
import * as child_process from 'child_process';
import { app } from 'electron';
import { IAppConfigData } from '../shared/config/IAppConfigData';
import { AppConfig } from '../shared/config/AppConfig';

const execFile = util.promisify(child_process.execFile);

/**
 * Check is an application is installed
 *
 * @param binaryName The command you would use the run an application command
 * @param argument An argument to pass the command. This argument should not
 *   cause any side effects. By default --version
 */
export async function isInstalled(binaryName: string, argument = '--version') {
  try {
    await execFile(binaryName, [argument]);
  } catch (e) {
    return false;
  }

  return true;
}

/**
 * If Electron is in development mode (or in release mode)
 * (This is copied straight out of the npm package 'electron-is-dev')
 */
export const isDev: boolean = (function() {
  const getFromEnv = parseInt(process.env.ELECTRON_IS_DEV || '', 10) === 1;
  const isEnvSet = 'ELECTRON_IS_DEV' in process.env;
  return isEnvSet ? getFromEnv : (process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath));
})();


/**
 * Call a function once the electron app is ready, or immediately if it is already ready
 */
export function callIfOrOnceReady(func: () => void): void {
  if (app.isReady()) {
    func();
  } else {
    app.once('ready', func);
  }
}

export function getLaunchBoxImageNames(imageFolderPath: string, callback: (imageNames: string[]) => void) {
  fs.readdir(imageFolderPath, (err, files) => {
    if (err) { throw new Error('wat'); }
    callback(files);
  });
}
