import { IExtensionManifest } from '@shared/extensions/interfaces';

export const nullExtensionDescription = Object.freeze(<IExtensionManifest>{
  name: 'Null Extension Description',
  version: '0.0.0',
  author: 'flashpoint',
  launcherVersion: '',
  extensionLocation: '/FAKE/PATH/',
  isBuiltin: false,
});
