import * as child_process from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as util from 'util';
import { IAppConfigData } from '../shared/config/interfaces';
import { parseVariableString } from '../shared/utils/VariableString';
import { ParseArgs, ParseArgsConfig } from './background/types';

const execFile = util.promisify(child_process.execFile);

/**
 * Check if an application is installed
 * @param binaryName The command you would use the run an application command
 * @param argument An argument to pass the command. This argument should not cause any side effects. By default --version
 */
export async function isInstalled(binaryName: string, argument = '--version'): Promise<boolean> {
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
}());

/** Wait until electron app is ready (doesn't wait if already ready) */
export function waitUntilReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (app.isReady()) {
      resolve();
    } else {
      app.once('ready', () => { resolve(); });
    }
  });
}

/** Get the path where the config and preference files should be located if this application is installed. */
export function getInstalledConfigsPath() {
  return path.join(app.getPath('appData'), 'flashpoint-launcher');
}

/**
 * Parse a variable string using a generic get variable value function.
 * @param str String to parse.
 */
export function parseVarStr(str: string, parseArgs : Partial<ParseArgs>) {
  return parseVariableString(str, (name) => { return parseArgs[name] || ''; });
}

/**
 * Create a ParseArgs object for use in replacing variables inside arguments (Config data required)
 * @param config Config data (for flashpoint pathing)
 */
export function buildParseArgsConfig(config : IAppConfigData) : ParseArgsConfig {
  return {
    flashpointPath: config ? path.resolve(config.flashpointPath) : ''
  , ...buildParseArgs()};
}

/**
 * Create a ParseArgs object for use in replacing variables (No config data loaded)
 */
export function buildParseArgs() : ParseArgs {
  return {};
}