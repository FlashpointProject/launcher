import { IExtension } from '@shared/extensions/interfaces';
import * as path from 'path';

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

export function newExtLog(ext: IExtension, message: string, func: (source: string, message: string) => void) {
  func('Extensions', `[${ext.manifest.name}] ${message}`);
}
