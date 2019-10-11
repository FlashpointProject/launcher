import * as fs from 'fs-extra';
import { extractFull } from 'node-7z';
import * as path from 'path';
import { pathTo7z } from '../util/SevenZip';
import { uuid } from '../uuid';
import { ParsedCurationMeta } from './parse';

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
 * Import a curation meta file (Copy meta.txt to unique folder)
 * @param filePath Path of the meta file to import
 * @return Curation key
 */
export async function importCurationMeta(filePath: string, key: string = uuid()): Promise<string> {
  const curationPath = path.join(window.External.config.fullFlashpointPath, 'Curations', key);
  const metaPath = path.join(curationPath, 'meta.txt');
  try {
    await fs.ensureDir(metaPath);
    await fs.copyFile(filePath, metaPath);
  } catch (error) {
    log('Error importing curation meta - ' + error.message);
    console.error(error);
  }
  return key;
}

/**
 * Import a curation folder (Copy all files to unique folder)
 * @param filePath Path of the folder to import
 * @return Curation key
 */
export async function importCurationFolder(filePath: string, key: string = uuid()): Promise<string> {
  const curationPath = path.join(window.External.config.fullFlashpointPath, 'Curations', key);
  try {
    await fs.copy(filePath, curationPath);
  } catch (error) {
    log('Error importing curation folder - ' + error.message);
    console.error(error);
  }
  return key;
}

/**
 * Import a curation archive (Extract all files to unique folder)
 * @param filePath Path of the archive to import
 * @return Curation key
 */
export async function importCurationArchive(filePath: string, key: string = uuid()): Promise<string> {
  const curationPath = path.join(window.External.config.fullFlashpointPath, 'Curations', key);
  const extractPath = path.join(curationPath, '.temp');
  await fs.ensureDir(extractPath);
  // Extract to temp folder inside curation folder
  await new Promise<void>((resolve, reject) => {
    extractFull(filePath, extractPath, { $bin: pathTo7z })
    .on(('end'), () => {
      // Find root folder (folder containing meta.txt) and move contents
      const rootPath = getRootPath(extractPath);
      if (rootPath) {
        console.log('extracted - ' + rootPath + '\n' + curationPath);
        fs.copy(rootPath, curationPath)
        .then(() => {
          fs.remove(extractPath)
          .then(() => {
            resolve();
          });
        })
        .catch((error) => {
          reject(error);
        });
        // Clean up temp folder
      }
    })
    .on('error', (error) => {
      reject(error);
    });
  })
  .catch((error) => {
    log('Error extracting archive - ' + error.message);
    console.error(error.message);
  });
  console.log('extracted');
  return key;
}

/**
 * Return the first path containing meta.txt (undefined if none found)
 * @param dir Path to search
 */
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

/** Create an "empty" curation index image. */
export function createCurationIndexImage(): CurationIndexImage {
  return {
    exists: false,
    version: 0,
  };
}

/**
 * Recursively index the content folder
 * @param contentPath Folder to index
 */
export async function indexContentFolder(contentPath: string) : Promise<CurationIndexContent[]> {
  const content: CurationIndexContent[] = [];
  try {
    await fs.access(contentPath, fs.constants.F_OK);
    await recursiveFolderIndex(contentPath, contentPath, content);
  } catch (error) {
    log('Error indexing curation - ' + error.message);
    console.error(error);
  }
  return content;
}

async function recursiveFolderIndex(folderPath: string, contentPath: string, content: CurationIndexContent[]): Promise<void> {
  // List all sub-files (and folders)
  const files = await fs.readdir(folderPath);
  // Run a promise on each file (and wait for all to finish)
  for (let fileName of files) {
    const filePath = path.join(folderPath, fileName);
    const stats = await fs.lstat(filePath);
    const isDirectory = stats.isDirectory();
    // Add content index
    content.push({
      fileName: fixSlashes(path.relative(contentPath, filePath)) + (isDirectory ? '/' : ''),
      fileSize: stats.size,
    });
    // Check if it should recurse
    if (isDirectory) {
      await recursiveFolderIndex(filePath, contentPath, content);
    }
  }
}

/** Replace all back-slashes with forward slashes. */
export function fixSlashes(str: string): string {
  return str.replace(/\\/g, '/');
}

function log(content: string): void {
  window.External.log.addEntry({
    source: 'Curation',
    content: content
  });
}