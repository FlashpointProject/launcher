import { IExtension, IExtensionManifest } from '@shared/extensions/interfaces';
import { LogFunc } from '@shared/interfaces';
import { ILogEntry, LogLevel } from '@shared/Log/interface';
import * as path from 'path';
import { ExtensionLogFunc } from './types';

export function extensionString(ext: IExtension): string {
  return `ID - ${ext.id}\n` +
  `Type - ${ext.type}\n` +
  `Path - ${ext.extensionPath}`;
}

export function getExtensionEntry(ext: IExtension): string {
  if (ext.manifest.main) {
    const filePath = path.join(ext.extensionPath, ext.manifest.main);
    const relative = path.relative(ext.extensionPath, filePath);
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
      // Path is inside extension path
      return filePath;
    } else {
      // Don't allow imports outside extension path
      throw new Error('Extension is trying to import files outside its path!');
    }
  }
  throw new Error('Extension defines no entry point!');
}

export function newExtLog(extManifest: IExtensionManifest, message: string, func: LogFunc): ILogEntry {
  return func('Extensions', `[${extManifest.displayName || extManifest.name}] ${message}`);
}

export function extLogFactory(logLevel: LogLevel, ext: IExtension, addLog: (entry: ILogEntry) => void, func: LogFunc): ExtensionLogFunc {
  return (message: string) => {
    addLog(newExtLog(ext.manifest, message, func));
  };
}
