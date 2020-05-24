import { Tag } from '@database/entity/Tag';
import { BackIn, TagGetOrCreateData, TagGetOrCreateResponse } from '@shared/back/types';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { fixSlashes } from '../Util';
import { CurationIndex, EditCuration, IndexedContent } from './types';

const access = promisify(fs.access);
const lstat = promisify(fs.lstat);
const readdir = promisify(fs.readdir);

/** Full path to a Curation's folder
 * @param curation: Curation to fetch folder from
 */
export function getCurationFolder(curation: CurationIndex | EditCuration, fpPath: string): string {
  return path.join(fpPath, 'Curations', curation.key);
}

/** Full path to a Curation's content folder
 * @param key: Key to use
 */
export function getContentFolderByKey(key: string, fpPath: string): string {
  return path.join(fpPath, 'Curations', key, 'content');
}

/**
 * Recursively index the content folder
 * @param contentPath Folder to index
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
    .catch((error) => {
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
  for (let fileName of files) {
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
    const res = await window.Shared.back.sendP<TagGetOrCreateResponse, TagGetOrCreateData>(BackIn.GET_OR_CREATE_TAG, { tag: trimTag, tagCategory: trimTagCategory });
    if (res.data) {
      allTags.push(res.data);
    }
  }

  return allTags.filter((v,i) => allTags.findIndex(v2 => v2.id == v.id) == i); // remove dupes
}