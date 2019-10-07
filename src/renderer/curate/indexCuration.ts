import * as extract from 'extract-zip';
import * as fs from 'fs-extra';
import * as path from 'path';
import { promisify } from 'util';
import { stripBOM } from '../../shared/Util';
import { uuid } from '../uuid';
import { parseCurationMeta, ParsedCurationMeta } from './parse';
import { getCurationFolder } from './util';
const fsReadFile = promisify(fs.readFile);
const fsReaddir = promisify(fs.readdir);
const fsStat = promisify(fs.stat);

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
};

/** Finished a curation index given its existance in its unique folder */
function indexCuration(curation: CurationIndex): Promise<CurationIndex> {
  return new Promise((resolve, reject) => {
    const curationFolder = getCurationFolder(curation);
    return Promise.all([
      // Find root dir
      // Index content files and folders
      new Promise((resolve, reject) => {
        const contentPath = path.join(curationFolder, 'content');
        fsStat(contentPath)
        .then(() => { // (Content file found)
          // Index the cotent file (and its content recursively)
          return indexContentFolder(contentPath, contentPath, curation)
          .then(() => { resolve(); })
          .catch(error => { reject(error); });
        }, (error) => { // (Failed to find content folder)
          if (error.code === 'ENOENT') { // No content folder found
            console.warn(`Skipped indexing of content. No content folder found in:\n"${curationFolder}"`);
            resolve();
          } else { reject(error); } // Unexpected error
        });
      }),
      // Check if the image files exist
      (async () => {
        const filenames = await fs.readdir(curationFolder);
        for (let filename of filenames) {
          const lowerFilename = filename.toLowerCase();
          let image: CurationIndexImage | undefined = undefined;
          // Check which image the file is (if any)
          if (lowerFilename.startsWith('logo.')) {
            image = curation.thumbnail;
          } else if (lowerFilename.startsWith('ss.')) {
            image = curation.screenshot;
          }
          // Check if it was an image file
          if (image) {
            image.exists = true;
            image.fileName = filename;
            image.filePath = fixSlashes(path.join(curationFolder, filename));
          }
        }
      })(),
      // Read and parse the meta
      (async () => {
        const metaFileData = await fs.readFile(path.join(curationFolder, 'meta.txt'));
        curation.meta = parseCurationMeta(stripBOM(metaFileData.toString()));
      })(),
    ])
    .then(() => { 
      console.log(curation);
      resolve(curation); })
    .catch(error => { reject(error); });
  });
}

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
  })
  .then((curation) => {
    return indexCuration(curation);
  });
}

/**
 * Index a curation archive (index all content files, load and parse meta etc.)
 * @param filepath Path of the archive to index.
 */
export function indexCurationArchive(filepath: string): Promise<CurationIndex> {
  return new Promise<CurationIndex>((resolve, reject) => {
    const curation = createCurationIndex();

    const curationFolder = getCurationFolder(curation);
    fs.mkdirsSync(curationFolder);
    // Extract to Curation folder
    extract(filepath, {dir: curationFolder}, (error) => {
      if (error) {
        console.error('Error unpacking curation - ' + error.message);
        reject();  
      }
      // Move folder down to meta.txt
      const rootPath = getRootPath(curationFolder);
      console.log(rootPath);
      if (rootPath && rootPath != curationFolder) {
        fs.copySync(rootPath, curationFolder);
        fs.removeSync(rootPath);
      } else if (!rootPath) {
        curation.errors.push({
          message: 'No meta.txt found in imported curation.'
        });
      }
      resolve(curation);
    });
  })
  .then((curation) => {
    return indexCuration(curation);
  });
}

function getRootPath(dir: string): string|undefined {
  const files = fs.readdirSync(dir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(dir, file);
    console.log(fullPath);
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
function fixSlashes(str: string): string {
  return str.replace(/\\/g, '/');
}
