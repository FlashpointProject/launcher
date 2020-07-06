import { IExtension } from './interfaces';

export function extensionString(ext: IExtension): string {
  return `ID - ${ext.id}\n` +
  `Type - ${ext.type}\n` +
  `Path - ${ext.extensionPath}`;
}
