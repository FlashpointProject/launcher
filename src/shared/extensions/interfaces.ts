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
}

export type ExtensionContribution<T extends keyof Contributions> = {
  key: T;
  extId: string;
  value: Contributions[T];
}

export type Contributions = {
  themes: ExtTheme[]; // TODO Implement
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
