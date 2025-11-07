import { IExtensionManifest } from 'flashpoint-launcher';

export const nullExtensionDescription = Object.freeze(<IExtensionManifest>{
  name: 'Null Extension Description',
  version: '0.0.0',
  author: 'flashpoint',
  launcherVersion: '',
  extensionLocation: '/FAKE/PATH/',
  isBuiltin: false,
});
