import { Tag } from '@database/entity/Tag';
import { ParsedCurationMeta } from './parse';

/** Data of a curation in the curation importer. */
export type EditCuration = {
  /** Unique key of the curation (UUIDv4). Generated when loaded. */
  key: string;
  /** Meta data of the curation. */
  meta: EditCurationMeta;
  /** Keys of additional applications that belong to this game. */
  addApps: EditAddAppCuration[];
  /** Data of each file in the content folder (and sub-folders). */
  content: IndexedContent[];
  /** List of unused folders at root. Easier for Watcher to update. */
  unusedDirs: string[];
  /** Screenshot. */
  screenshot: CurationIndexImage;
  /** Thumbnail. */
  thumbnail: CurationIndexImage;
  /** If the curation and its additional applications are locked (and can not be edited). */
  locked: boolean;
  /** Whether a curation is marked for deletion */
  delete: boolean;
}

/** Data of an additional application curation in the curation importer. */
export type EditAddAppCuration = {
  /** Unique key of the curation (UUIDv4). Generated when loaded. */
  key: string;
  /** Meta data of the curation. */
  meta: EditAddAppCurationMeta;
}

/** Meta data of a curation. */
export type EditCurationMeta = Partial<{
  // Game fields
  title: string;
  alternateTitles: string;
  series: string;
  developer: string;
  publisher: string;
  status: string;
  extreme: string;
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
}>

/** Meta data of an additional application curation. */
export type EditAddAppCurationMeta = Partial<{
  heading: string;
  applicationPath: string;
  launchCommand: string;
}>

export type CurationIndex = {
  /** UUID of the curation, used for storage */
  key: string;
  /** Data of each file in the content folder (and sub-folders). */
  content: IndexedContent[];
  /** Errors that occurred while indexing. */
  errors: CurationIndexError[];
  /** Meta data of the curation. */
  meta: ParsedCurationMeta;
  /** Screenshot. */
  screenshot: CurationIndexImage;
  /** Thumbnail. */
  thumbnail: CurationIndexImage;
}

export type IndexedContent = {
  /** Name and path of the file (relative to the content folder). */
  filePath: string;
  /** Size of the file (in bytes, uncompressed) */
  fileSize: number;
}

export type CurationIndexContent = {
  /** Name and path of the file (relative to the content folder). */
  fileName: string;
  /** Size of the file (in bytes, uncompressed) */
  fileSize: number;
}

export type CurationIndexError = {
  /** Human readable error message. */
  message: string;
}

export type CurationIndexImage = {
  /** Base64 encoded data of the image file (in case it was extracted from an archive). */
  data?: string;
  /** Raw data of the image file (in case it was extracted from an archive). */
  rawData?: Buffer;
  /** If the images was found. */
  exists: boolean;
  /** Name and path of the file (relative to the curation folder). */
  fileName?: string;
  /** Full path of the image (in case it was loaded from a folder). */
  filePath?: string;
  /** Version to force CSS refresh later */
  version: number;
}
