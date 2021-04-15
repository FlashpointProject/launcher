import { Game } from '@database/entity/Game';
import { EditCurationMeta } from '@shared/curate/OLD_types';

export const enum ExtensionType {
  System,
  User
}

export type DevScript = {
  name: string;
  description: string;
  command: string;
}

export type ContextButton = {
  context: ButtonContext;
  name: string;
  command: string;
  runWithNoCuration?: boolean;
}

export type Application = {
  provides: string[];
  name: string;
  command?: string;
  arguments: string[];
  path?: string;
  url?: string;
}

export type AppProvider = Application & {
  callback: (game: Game) => Promise<string | BrowserApplicationOpts>;
}

export type ApplicationMode = 'regular' | 'browser';

export type BrowserApplicationOpts = {
  url: string;
  proxy?: string;
}

export type ButtonContext = 'game' | 'playlist' | 'curation';

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
  contextButtons: ContextButton[];
  applications: Application[];
  configuration: ExtConfiguration[];
  curationTemplates: CurationTemplate[];
}

export interface CurationTemplate {
  name: string;
  logo: string;
  meta: EditCurationMeta;
}

export interface IExtensionDescription extends IExtensionManifest {
  id: string;
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

export type ExtConfiguration = {
  title: string;
  properties: {
    [key: string]: ExtConfigurationProp
  };
}

export type ExtConfigurationProp = {
  type: 'string' | 'object' | 'boolean';
  default: any;
  enum: any[];
  title: string;
  description: string;
}
