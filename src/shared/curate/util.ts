import { BackIn } from '@shared/back/types';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { fixSlashes } from '../Util';
import { IndexedContent } from './OLD_types';
import { LoadedCuration } from './types';
import { Tag } from 'flashpoint-launcher';

const access = promisify(fs.access);
const lstat = promisify(fs.lstat);
const readdir = promisify(fs.readdir);

/**
 * Full path to a Curation's folder
 *
 * @param curation Curation to fetch folder from
 * @param fpPath Flashpoint Path
 */
export function getCurationFolder(curation: LoadedCuration, fpPath: string): string {
  return path.join(fpPath, 'Curations', 'Working', curation.folder);
}

/**
 * Full path to a Curation's content folder
 *
 * @param key Folder of the curation
 * @param fpPath Flashpoint Path
 */
export function getContentFolderByKey(key: string, fpPath: string): string {
  return path.join(fpPath, 'Curations', 'Working', key, 'content');
}

/**
 * Recursively index the content folder
 *
 * @param contentPath Folder to index
 * @param log Log function to use for errors
 */
export async function indexContentFolder(contentPath: string, log: (content: string) => void): Promise<IndexedContent[]> {
  const content: IndexedContent[] = [];
  await access(contentPath, fs.constants.F_OK)
  .then(() => {
    return recursiveFolderIndex(contentPath, contentPath, content)
    .catch((error) => {
      log('Error indexing folder - ' + error.message);
      console.error(error);
    });
  })
  .catch(() => {
    const msg = `Content folder given doesn't exist, skipping... (${contentPath})`;
    log(msg);
    console.log(msg);
  });
  return content;
}

export async function recursiveFolderIndex(folderPath: string, basePath: string, content: IndexedContent[]): Promise<void> {
  // List all sub-files (and folders)
  const files = await readdir(folderPath);
  // Run a promise on each file (and wait for all to finish)
  for (const fileName of files) {
    const filePath = path.join(folderPath, fileName);
    const stats = await lstat(filePath);
    const isDirectory = stats.isDirectory();
    // Is a folder, go deeper
    if (isDirectory) {
      await recursiveFolderIndex(filePath, basePath, content);
    // Is a file, add to index
    } else {
      content.push({
        filePath: fixSlashes(path.relative(basePath, filePath)), // Only have one type of slashes
        fileSize: stats.size,
      });
    }
  }
}

export async function getTagsFromStr(tagsStr: string, tagCategoriesStr: string): Promise<Tag[]> {
  const allTags: Tag[] = [];
  const splitTags = tagsStr.split(';');
  const splitCategories = tagCategoriesStr.split(';');

  for (let i = 0; i < splitTags.length; i++) {
    const trimTag = splitTags[i].trim();
    const trimTagCategory = splitCategories[i] ? splitCategories[i].trim() : undefined;
    const data = await window.Shared.back.request(BackIn.GET_OR_CREATE_TAG, trimTag, trimTagCategory);
    if (data) {
      allTags.push(data);
    }
  }

  return allTags.filter((v,i) => allTags.findIndex(v2 => v2.id == v.id) == i); // remove dupes
}
