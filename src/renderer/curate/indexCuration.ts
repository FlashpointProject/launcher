import * as fs from 'fs-extra';
import { extractFull } from 'node-7z';
import * as path from 'path';
import { get7zExec } from '../../shared/utils/SevenZip';
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
export function indexCurationFolder(filepath: string): Promise<CurationIndex> {
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
export function indexCurationArchive(filePath: string): Promise<CurationIndex> {
  return new Promise<CurationIndex>((resolve, reject) => {
    const curation = createCurationIndex();
    const curationPath = getCurationFolder(curation);
    const extractPath = path.join(curationPath, 'Extracted');
    fs.mkdirsSync(extractPath);
    // Extract to Curation folder
    extractFull(filePath, extractPath, { $bin: get7zExec() })
    .on(('end'), () => {
      const rootPath = getRootPath(extractPath);
      if (rootPath) {
        fs.copySync(rootPath, curationPath);
        // Won't clear folders, but will clear files
        fs.removeSync(rootPath);
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

export function indexExistingCuration(key: string): Promise<CurationIndex> {
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
 * Check if a file (inside an archive file) is inside a curation folder.
 * @param filePath Path of the file (inside the archive).
 */
export function isInCurationFolder(filePath: string): boolean {
  const split = filePath.toLowerCase().split('/');
  return (
    // Check if the file is two or more folders deep
    split.length > 2 &&
    // Check if the second folder in the path is the content folder
    // (The first folder is usually named after the name)
    split[1] === 'content' &&
    // Check if the third name is not empty (if it is, then this is a folder)
    split[2] !== ''
  );
}

/**
 * Recursively index the content folder (or one of it's sub-folders, at any depth).
 * @param folderPath Path of the folder to index.
 * @param contentPath Path of the content folder of the curation.
 * @param curation Curation index to add the indexed content to.
 * @returns A promise that is resolved once the index is done.
 */
function indexContentFolder(folderPath: string, contentPath: string, curation: CurationIndex): Promise<void[]> {
  return (
    // List all sub-files (and folders)
    fs.readdir(folderPath)
    // Run a promise on each file (and wait for all to finish)
    .then(files => Promise.all(
      files.map(fileName => {
        const filePath = path.join(folderPath, fileName);
        return fs.stat(filePath)
        .then(stats => new Promise<void>((resolve, reject) => {
          const isDirectory = stats.isDirectory();
          // Add content index
          curation.content.push({
            fileName: fixSlashes(path.relative(contentPath, filePath)) + (isDirectory ? '/' : ''),
            fileSize: stats.size,
          });
          // Check if it should recurse
          if (isDirectory) {
            indexContentFolder(filePath, contentPath, curation)
            .then(() => { resolve(); })
            .catch(error => { reject(error); });
          } else { resolve(); } // (It's a file, don't recurse)
        }));
      })
    ))
  );
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