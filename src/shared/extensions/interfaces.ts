export const enum ExtensionType {
  System,
  User
}

export type DevScript = {
  name: string;
  description: string;
  command: string;
}

export type ExtTheme = {
  id: string;
  path: string;
  logoSet?: string;
}

export interface ILogoSet {
  /** Id of the logo set */
  id: string;
  /** Name of the logo set */
  name: string;
  /** Path relative to extension path */
  path: string;
}

export type LogoSet = ILogoSet & {
  /** Path on disk */
  fullPath: string;
  /** List of provided files */
  files: string[];
}


export type ExtensionContribution<T extends keyof Contributions> = {
  key: T;
  extId: string;
  value: Contributions[T];
}

export type Contributions = {
  logoSets: ILogoSet[];
  themes: ExtTheme[];
  devScripts: DevScript[];
}

export interface IExtensionManifest {
  name: string;
  displayName?: string;
  author: string;
  version: string;
  launcherVersion: string;
  description?: string;
  icon?: string;
  main?: string;
  contributes?: Contributions;
}

export interface IExtension {
  readonly id: string;
  readonly type: ExtensionType,
  readonly manifest: IExtensionManifest,
  readonly extensionPath: string
}
