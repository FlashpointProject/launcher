import { Application, Game, IExtensionManifest, ILogoSet } from 'flashpoint-launcher';

export const enum ExtensionType {
  System,
  User
}

export type AppProvider = Application & {
  callback: (game: Game, launchCommand: string) => Promise<string | BrowserApplicationOpts>;
}

export type ApplicationMode = 'regular' | 'browser';

export type BrowserApplicationOpts = {
  url: string;
  proxy?: string;
}

export type LogoSet = ILogoSet & {
  /** Path on disk */
  fullPath: string;
  /** List of provided files */
  files: string[];
}

export interface IExtension {
  readonly id: string;
  readonly type: ExtensionType,
  readonly manifest: IExtensionManifest,
  readonly extensionPath: string
}
