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

export type CurationState = LoadedCuration & {
  alreadyImported: boolean;
  warnings: CurationWarnings;
  locked?: boolean;
  contents?: ContentTree;
}

/** A set of warnings for things that should be fixed in a curation. */
export type CurationWarnings = {
  /** If the launch command is missing */
  noLaunchCommand?: boolean;
  /** If the launch command is not a url with the "http" protocol and doesn't point to a file in 'content' */
  invalidLaunchCommand?: string[];
  /** If the release date is invalid (incorrectly formatted). */
  releaseDateInvalid?: boolean;
  /** If the application path value isn't used by any other game. */
  unusedApplicationPath?: boolean;
  /** If the tags value contains values not used by any other game. */
  unusedTags?: string[];
  /** Missing Logo */
  noLogo?: boolean;
  /** Missing Screenshot */
  noScreenshot?: boolean;
  /** No Tags on Curation */
  noTags?: boolean;
  /** No Source on Curation */
  noSource?: boolean;
  /** Text in Tags field that hasn't been entered */
  unenteredTag?: boolean;
  /** If the platform value isn't used by any other game. */
  unusedPlatform?: boolean;
  /** If the library value does not point to an existing library. */
  nonExistingLibrary?: boolean;
  /** If there are non-content folders present in the curation folder (Crendor would be proud) */
  nonContentFolders?: string[];
};

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
