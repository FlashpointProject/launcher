import { CurationIndexImage, IndexedContent } from '@shared/curate/types';
import { recursiveFolderIndex } from '@shared/curate/util';
import * as fs from 'fs-extra';
import { extractFull } from 'node-7z';
import * as path from 'path';
import { ProgressDispatch, ProgressHandle } from '../context/ProgressContext';
import { pathTo7z } from '../util/SevenZip';
import { uuid } from '../util/uuid';
import { curationLog } from './util';

/**
 * Import a curation meta file (Copy meta to unique folder)
 * @param filePath Path of the meta file to import
 * @return Curation key
 */
export async function importCurationMeta(filePath: string, key: string = uuid()): Promise<string> {
  const curationPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations', key);
  const metaPath = path.join(curationPath, 'meta' + path.extname(filePath));
  try {
    await fs.ensureDir(curationPath);
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
export async function importCurationFolder(filePath: string, key: string = uuid(), progress: ProgressHandle): Promise<string> {
  ProgressDispatch.setText(progress, 'Importing Curation Folder');
  const curationPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations', key);
  try {
    // Index the folder we're going to import
    const index: IndexedContent[] = [];
    await recursiveFolderIndex(filePath, filePath, index);
    ProgressDispatch.setTotalItems(progress, index.length);
    for (let file of index) {
      // Copy file from import folder to curation folder, increment progress (if available)
      const sourcePath = path.join(filePath, file.filePath);
      const destPath = path.join(curationPath, file.filePath);
      await fs.ensureDir(path.dirname(destPath));
      await fs.copyFile(sourcePath, destPath);
     ProgressDispatch.countItem(progress);
    }
  } catch (error) {
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
export async function importCurationArchive(filePath: string, key: string = uuid(), progress: ProgressHandle): Promise<string> {
  ProgressDispatch.setText(progress, 'Extracting Curation Archive');
  const curationPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations', key);
  const extractPath = path.join(curationPath, '.temp');
  try {
    // Extract curation to .temp folder inside curation folder
    await fs.ensureDir(extractPath);
    await extractFullPromise([filePath, extractPath, { $bin: pathTo7z, $progress: true }], progress);
    // Find the absolute path to the folder containing meta.yaml
    const rootPath = await getRootPath(extractPath);
    if (rootPath) {
      // Move all files out of the root folder and into the curation folder
      for (let file of await fs.readdir(rootPath)) {
        const fileSource = path.join(rootPath, file);
        const fileDest = path.join(curationPath, file);
        await fs.move(fileSource, fileDest);
      }
      // Clean up .temp
      await fs.remove(extractPath);
    } else {
      throw new Error('Meta.yaml/yml/txt not found in extracted archive');
    }
  } catch (error) {
    curationLog('Error extracting archive - ' + error.message);
    console.error(error.message);
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

// Names valid as meta files
const validMetaNames = ['meta.txt', 'meta.yaml', 'meta.yml'];
/**
 * Return the first path containing any valid meta name (undefined if none found)
 * @param dir Path to search
 */
async function getRootPath(dir: string): Promise<string | undefined> {
  const files = await fs.readdir(dir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(dir, file);
    const stats = await fs.lstat(fullPath);
    // Found root, pass back
    if (stats.isFile() && endsWithList(file.toLowerCase(), validMetaNames)) {
      return dir;
    } else if (stats.isDirectory()) {
      const foundRoot = await getRootPath(fullPath);
      if (foundRoot) {
        return foundRoot;
      }
    }
  }
}

function endsWithList(str: string, list: string[]): boolean {
  for (let s of list) {
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
