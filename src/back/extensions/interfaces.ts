export const enum ExtensionType {
  System,
  User
}

export interface IExtensionManifest {
  name: string;
  displayName?: string;
  author: string;
  version: string;
  launcherVersion: string;
  description?: string;
  icon?: string;
}

export interface IExtension {
  readonly id: string;
  readonly type: ExtensionType,
  readonly manifest: IExtensionManifest,
  readonly extensionPath: string
}

export interface IExtensionService {
  getExtensions(): Promise<IExtension[]>;
  getExtension(id: string): Promise<IExtension | undefined>;
}
