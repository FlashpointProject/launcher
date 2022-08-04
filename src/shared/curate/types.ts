import { Tag } from 'flashpoint-launcher';
import { CurationIndexImage } from './OLD_types';

export type LoadedCuration = {
  folder: string;
  uuid: string;
  group: string;
  game: CurationMeta;
  addApps: AddAppCuration[];
  thumbnail: CurationIndexImage;
  screenshot: CurationIndexImage;
}

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
  type: 'file' | 'directory';
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
  platform: string;
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
