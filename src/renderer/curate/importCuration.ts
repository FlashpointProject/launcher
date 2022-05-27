import { CurationIndexImage, IndexedContent } from '@shared/curate/types';
import { recursiveFolderIndex } from '@shared/curate/util';
import * as fs from 'fs-extra';
import { extractFull } from 'node-7z';
import * as path from 'path';
import { ProgressDispatch, ProgressHandle } from '../context/ProgressContext';
import { pathTo7z } from '../util/SevenZip';
import { uuid, validateSemiUUID } from '../util/uuid';
import { curationLog } from './util';

/**
 * Import a curation meta file (Copy meta to unique folder)
 * @param filePath Path of the meta file to import
 * @return Curation key
 */
export async function importCurationMeta(filePath: string, key: string = uuid()): Promise<string> {
  const curationPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations', 'Working', key);
  const metaPath = path.join(curationPath, 'meta' + path.extname(filePath));
  try {
    // Set up Curation folder
    await fs.ensureDir(curationPath);
    await fs.copyFile(filePath, metaPath);
    await fs.mkdir(path.join(curationPath, 'content'));
  } catch (error: any) {
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
export async function importCurationFolder(filePath: string, key: string = uuid(), progress: ProgressHandle): Promise<string> {
  ProgressDispatch.setText(progress, 'Importing Curation Folder');
  const curationPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations', 'Working', key);
  try {
    // Index the folder we're going to import
    const index: IndexedContent[] = [];
    await recursiveFolderIndex(filePath, filePath, index);
    ProgressDispatch.setTotalItems(progress, index.length);
    for (const file of index) {
      // Copy file from import folder to curation folder, increment progress (if available)
      const sourcePath = path.join(filePath, file.filePath);
      const destPath = path.join(curationPath, file.filePath);
      await fs.ensureDir(path.dirname(destPath));
      await fs.copyFile(sourcePath, destPath);
      ProgressDispatch.countItem(progress);
    }
  } catch (error: any) {
    curationLog('Error importing curation folder - ' + error.message);
    console.error(error);
  } finally {
    // Mark progress as finished
    ProgressDispatch.finished(progress);
  }
  return key;
}

/**
 * Import a curation archive (Extract all files to unique folder)
 * @param filePath Path of the archive to import
 * @return Curation key
 */
export async function importCurationArchive(filePath: string, preserveKey: boolean, progress: ProgressHandle): Promise<string> {
  ProgressDispatch.setText(progress, 'Extracting Curation Archive');
  let key = uuid();
  const extractPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations', key);
  try {
    // Extract curation to temp folder inside Curations folder
    await fs.ensureDir(extractPath);
    await extractFullPromise([filePath, extractPath, { $bin: pathTo7z, $progress: true }], progress);
    // Extract the existing key from the archive if needed
    if (preserveKey) {
      key = await getKeyFromPath(extractPath) || key;
    }
    // Find the absolute path to the folder containing meta.yaml
    const curationPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations', 'Working', key);
    const rootPath = await getRootPath(extractPath);
    if (rootPath) {
      // Move all files out of the root folder and into the curation folder
      await fs.ensureDir(curationPath);
      for (const file of await fs.readdir(rootPath)) {
        const fileSource = path.join(rootPath, file);
        const fileDest = path.join(curationPath, file);
        await fs.move(fileSource, fileDest);
      }
      // Clean up extraction path
      await fs.remove(extractPath);
    } else {
      throw new Error('Meta.yaml/yml/txt not found in extracted archive');
    }
    log.debug('Curate', `Import Success for ${filePath}`);
  } catch (error: any) {
    curationLog(`Error extracting archive ${filePath} - ${error.message}`);
    console.error(error.message);
    log.error('Curate', `Import Failure for ${filePath}`);
    alert(`Import Failure for ${filePath}`);
  } finally {
    // Mark progress as finished
    ProgressDispatch.finished(progress);
  }
  return key;
}

/**
 * Fully extracts an archive with optional progress events (include '$progress: true' in your extractFull options)
 * @param args Arguments to call extractFull
 * @param progress Progress handle to update, if any
 */
function extractFullPromise(args: Parameters<typeof extractFull>, progress?: ProgressHandle) : Promise<void> {
  return new Promise<void>((resolve, reject) => {
    extractFull(...args)
    .on(('progress'), async (event) => {
      if (progress) {
        // Update the text and percentage of a (possibly) given progress with 7z's progress
        ProgressDispatch.setPercentDone(progress, event.percent);
        ProgressDispatch.setText(progress, `Extracting Files - ${event.fileCount}`);
      }
    })
    .once(('end'), () => {
      resolve();
    })
    .once(('error'), (error) => {
      reject(error);
    });
  });
}

/**
 * Return the name of the only entry in a folder if it's a UUID (undefined otherwise)
 * @param dir Path to search
 */
async function getKeyFromPath(dir: string): Promise<string | undefined> {
  const files = await fs.readdir(dir);
  if (files.length !== 1) {
    return;
  }
  const possibleUUID = files[0];
  if (validateSemiUUID(possibleUUID)) {
    return possibleUUID;
  }
}

// Names valid as meta files
const validMetaNames = ['meta.txt', 'meta.yaml', 'meta.yml'];
/**
 * Return the first path containing any valid meta name (undefined if none found)
 * @param dir Path to search
 */
async function getRootPath(dir: string): Promise<string | undefined> {
  // Start off by initializing the queue to the contents of the root directory.
  const queue = await fs.readdir(dir);
  // As long as there are still queue items to read, we keep going.
  // Note: if we find the item, we will return before this completes.
  while (queue.length != 0) {
    // Pop the first element. We'll need to combine it with the root path to get
    // the full path.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const entry = queue.shift()!;
    const fullpath = path.join(dir, entry);
    // Call lstat() to check if it's a file or directory (or something else, I guess?)
    const stats = await fs.lstat(fullpath);
    // If it's a file, check whether it's what we're looking for.
    if (stats.isFile()) {
      // Convert it to lower-case, because the extensions we're matching against
      // are lower-case.
      if (endsWithList(fullpath.toLowerCase(), validMetaNames)) {
        return path.dirname(fullpath);
      }
    } else if (stats.isDirectory()) {
      const contents: string[] = await fs.readdir(fullpath);
      // We have a directory. Push all of the directory's contents onto the end of the queue.
      for (const k of contents) {
        queue.push(path.join(entry, k));
      }
    }
  }
}

function endsWithList(str: string, list: string[]): boolean {
  for (const s of list) {
    if (str.endsWith(s)) {
      return true;
    }
  }
  return false;
}

/** Create an "empty" curation index image. */
export function createCurationIndexImage(): CurationIndexImage {
  return {
    exists: false,
    version: 0,
  };
}
