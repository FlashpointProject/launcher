import * as fs from 'fs-extra';
import { extractFull } from 'node-7z';
import * as path from 'path';
import { EditCuration } from '../context/CurationContext';
import { get7zExec } from '../util/SevenZip';
import { uuid } from '../uuid';
import { ParsedCurationMeta } from './parse';
import { getCurationFolder } from './util';

export type CurationIndex = {
  /** UUID of the curation, used for storage */
  key: string;
  /** Data of each file in the content folder (and sub-folders). */
  content: CurationIndexContent[];
  /** Errors that occurred while indexing. */
  errors: CurationIndexError[];
  /** Meta data of the curation. */
  meta: ParsedCurationMeta;
  /** Screenshot. */
  screenshot: CurationIndexImage;
  /** Thumbnail. */
  thumbnail: CurationIndexImage;
};

export type CurationIndexContent = {
  /** Name and path of the file (relative to the content folder). */
  fileName: string;
  /** Size of the file (in bytes, uncompressed) */
  fileSize: number;
}

export type CurationIndexError = {
  /** Human readable error message. */
  message: string;
};

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
};

/**
 * Index a curation folder (index all content files, load and parse meta etc.)
 * @param filepath Path of the folder to index.
 */
export function importCurationFolder(filepath: string): Promise<CurationIndex> {
  return new Promise<CurationIndex>((resolve, reject) => {
    const curation = createCurationIndex();
    const curationFolder = getCurationFolder(curation);
    fs.copySync(filepath, curationFolder);
    resolve(curation);
  });
}

/**
 * Index a curation archive (index all content files, load and parse meta etc.)
 * @param filepath Path of the archive to index.
 */
export function importCurationArchive(filePath: string): Promise<CurationIndex> {
  return new Promise<CurationIndex>((resolve, reject) => {
    const curation = createCurationIndex();
    const curationPath = getCurationFolder(curation);
    const extractPath = path.join(curationPath, '.temp');
    fs.mkdirsSync(extractPath);
    // Extract to Curation folder
    extractFull(filePath, extractPath, { $bin: get7zExec() })
    .on(('end'), () => {
      const rootPath = getRootPath(extractPath);
      if (rootPath) {
        fs.copySync(rootPath, curationPath);
        fs.removeSync(extractPath);
      } else if (!rootPath) {
        curation.errors.push({
          message: 'No meta.txt found in imported curation.'
        });
      }
      resolve(curation);
    })
    .on('error', (error) => {
      log('Error extracting archive - ' + error.message);
      console.error(error.message);
    });
  });
}

export function importExistingCuration(key: string): Promise<CurationIndex> {
  return new Promise<CurationIndex>((resolve) => {
    const curation = createCurationIndex();
    curation.key = key;
    resolve(curation);
  });
}

function getRootPath(dir: string): string|undefined {
  const files = fs.readdirSync(dir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(dir, file);
    // Found root, pass back
    if (fullPath.endsWith('meta.txt')) {
      return dir;
    } else if (fs.lstatSync(fullPath).isDirectory()) {
      const deeper = getRootPath(fullPath);
      if (deeper) {
        return deeper;
      }
    }
  }
  // Return undefined, so that higher level knows this is pointless
  return;
}

/** Create an "empty" curation index object. */
function createCurationIndex(): CurationIndex {
  return {
    key: uuid(),
    meta: {
      game: {},
      addApps: [],
    },
    content: [],
    errors: [],
    screenshot: createCurationIndexImage(),
    thumbnail: createCurationIndexImage(),
  };
}

/** Create an "empty" curation index image. */
export function createCurationIndexImage(): CurationIndexImage {
  return {
    exists: false,
    version: 0,
  };
}

/**
 * Recursively index the content folder
 * @param curation Curation to set the indexed content of
 */
export function indexContentFolder(curation: EditCuration) {
  const contentPath = path.join(getCurationFolder(curation), 'content');
  curation.content = [];
  if (fs.existsSync(contentPath)) {
    recursiveFolderIndex(contentPath, contentPath, curation);
  }
}

function recursiveFolderIndex(folderPath: string, contentPath: string, curation: EditCuration) {
  // List all sub-files (and folders)
  const files = fs.readdirSync(folderPath);
  // Run a promise on each file (and wait for all to finish)
  for (let fileName of files) {
    const filePath = path.join(folderPath, fileName);
    const stats = fs.lstatSync(filePath);
    const isDirectory = stats.isDirectory();
    // Add content index
    curation.content.push({
      fileName: fixSlashes(path.relative(contentPath, filePath)) + (isDirectory ? '/' : ''),
      fileSize: stats.size,
    });
    // Check if it should recurse
    if (isDirectory) {
      recursiveFolderIndex(filePath, contentPath, curation);
    }
  }
}

/** Replace all back-slashes with forward slashes. */
export function fixSlashes(str: string): string {
  return str.replace(/\\/g, '/');
}

function log(content: string): void {
  window.External.log.addEntry({
    source: 'Curate',
    content: content
  });
}