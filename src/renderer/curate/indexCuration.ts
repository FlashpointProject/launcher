import * as fs from 'fs-extra';
import { extractFull } from 'node-7z';
import * as path from 'path';
import { pathTo7z } from '../util/SevenZip';
import { uuid } from '../uuid';
import { ParsedCurationMeta } from './parse';
import { curationLog } from './util';

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
    curationLog('Error importing curation meta - ' + error.message);
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
    curationLog('Error importing curation folder - ' + error.message);
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
  try {
    await fs.ensureDir(extractPath);
    await extractFullPromise([filePath, extractPath, { $bin: pathTo7z }]);
    const rootPath = await getRootPath(extractPath);
    if (rootPath) {
      for (let file of await fs.readdir(rootPath)) {
        const fileSource = path.join(rootPath, file);
        const fileDest = path.join(curationPath, file);
        await fs.move(fileSource, fileDest);
      }
      await fs.remove(extractPath);
    } else {
      throw new Error('Meta.txt not found in extracted archive');
    }
  } catch (error) {
    curationLog('Error extracting archive - ' + error.message);
    console.error(error.message);
  }
  return key;
}

function extractFullPromise(args: Parameters<typeof extractFull>) : Promise<void> {
  return new Promise<void>((resolve) => {
    extractFull(...args)
    .on(('end'), async () => {
      resolve();
    })
  });
}

/**
 * Return the first path containing meta.txt (undefined if none found)
 * @param dir Path to search
 */
async function getRootPath(dir: string): Promise<string | undefined> {
  const files = await fs.readdir(dir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(dir, file);
    const stats = await fs.lstat(fullPath);
    // Found root, pass back
    if (stats.isFile() && file === 'meta.txt') {
      return dir;
    } else if (stats.isDirectory()) {
      const foundRoot = await getRootPath(fullPath);
      if (foundRoot) {
        return foundRoot;
      }
    }
  }
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
    curationLog('Error indexing curation - ' + error.message);
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