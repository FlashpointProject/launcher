import { IExtension, IExtensionManifest } from '@shared/extensions/interfaces';
import { LogFunc } from '@shared/interfaces';
import { ILogEntry } from '@shared/Log/interface';
import * as path from 'path';
import { ExtensionLogFunc } from './types';

export function extensionString(ext: IExtension): string {
  return `ID - ${ext.id}\n` +
  `Type - ${ext.type}\n` +
  `Path - ${ext.extensionPath}`;
}

/**
 * Get modules entry point
 * @param ext Extension to read module from
 * @returns Path to module entry point
 */
export function getExtensionEntry(ext: IExtension): string {
  if (ext.manifest.main) {
    const filePath = path.join(ext.extensionPath, ext.manifest.main);
    const relative = path.relative(ext.extensionPath, filePath);
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
      // Path is inside extension path
      return path.resolve(filePath);
    } else {
      // Don't allow imports outside extension path
      throw new Error('Extension is trying to import files outside its path!');
    }
  }
  throw new Error('Extension defines no entry point!');
}

/** Creates an Extension log (Message format "[extension-name] <message>")
 * @param extManifest Manifest of the Extension
 * @param message Message to fill in
 * @param func Log function to use (log.info, warn, error etc.)
 * @returns Complete Log Entry
*/
export function newExtLog(extManifest: IExtensionManifest, message: string, func: LogFunc): ILogEntry {
  return func('Extensions', `[${extManifest.displayName || extManifest.name}] ${message}`);
}

/** Creates an Extension Log Function
 * @param extManifest Manifest of the Extension
 * @param addLog Function to push new log onto Logs page stack
 * @param func Log function to use (log.info, warn, error etc.)
 * @returns Function that logs an extensions message given just a message string
 */
export function extLogFactory(extManifest: IExtensionManifest, addLog: (entry: ILogEntry) => void, func: LogFunc): ExtensionLogFunc {
  return (message: string) => {
    addLog(newExtLog(extManifest, message, func));
  };
}
