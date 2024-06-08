import { Platform, Tag } from 'flashpoint-launcher';

export type ContentTree = {
  // Root node - 'content' folder
  root: ContentTreeNode;
}

export type ContentTreeNode = {
  name: string;
  /** Frontend - Whether this is expanded in the content tree view */
  expanded: boolean;
  /** File size (if type is file) */
  size?: number;
  nodeType: 'file' | 'directory' | string;
  /** Immediate items below this node */
  children: ContentTreeNode[];
  /** Number of items below this node */
  count: number;
}

export type CurationMeta = Partial<{
  // Game fields
  title: string;
  alternateTitles: string;
  series: string;
  developer: string;
  publisher: string;
  status: string;
  extreme: boolean;
  tags: Tag[];
  source: string;
  launchCommand: string;
  library: string;
  notes: string;
  curationNotes: string;
  primaryPlatform: string;
  platforms: Platform[];
  applicationPath: string;
  playMode: string;
  releaseDate: string;
  version: string;
  originalDescription: string;
  language: string;
  mountParameters: string;
}>



export type AddAppCurationMeta = Partial<{
  heading: string;
  applicationPath: string;
  launchCommand: string;
}>

export type AddAppCuration = {key: string} & AddAppCurationMeta;

export type PlatformAppPathSuggestions = Record<string, PlatformAppPath[]>;

export type PlatformAppPath = {
  appPath: string;
  count: number;
}
