import { Tag, TagFilterGroup } from 'flashpoint-launcher';
import { databaseReady } from '.';
import { BackState } from './types';
import * as path from 'path';
import * as fs from 'fs-extra';
import { readJsonFile } from '@shared/Util';

type TagCache = {
  tags: Tag[];
  filterKey: string;
  tagCount: number;
};

let tagCache: TagCache | null = null;

async function loadTagCache(cachePath: string): Promise<void> {
  log.info('Cache', 'Loading tag cache from ' + cachePath);
  try {
    tagCache = await readJsonFile(cachePath);
    if (typeof tagCache?.filterKey !== 'string' ||
      typeof tagCache?.tagCount !== 'number' ||
      typeof tagCache?.tags !== 'object'
    ) {
      // Invalid cache data at a glance, wipe
      log.warn('Cache', 'Tag cache data was invalid, ignoring...');
      tagCache = {
        tagCount: 0,
        filterKey: 'none',
        tags: []
      };
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      log.error('Cache', `Tag cache data failed to load, ignoring...: ${err}`);
    } else {
      log.info('Cache', 'No tag cache data found');
    }

    // Set empty cache
    tagCache = {
      tagCount: 0,
      filterKey: 'none',
      tags: []
    };
  }
}

async function saveTagCache(cachePath: string, newCache: TagCache) {
  tagCache = newCache;
  await fs.ensureDir(path.dirname(cachePath));
  await fs.promises.writeFile(cachePath, JSON.stringify(newCache));
}

export async function getTags(state: BackState, tagFilters: TagFilterGroup[]): Promise<Tag[]> {
  const flatTagFilter = tagFilters.reduce<string[]>((prev, cur) => prev.concat(cur.tags.map(t => t.toLowerCase())), []);
  const flatKey = getFilterKey(flatTagFilter);
  const cachePath = path.join(state.config.flashpointPath, 'Cache', 'tags.json');

  if (tagCache === null) {
    await loadTagCache(cachePath);
  }

  return databaseReady()
  .then(async (db) => {
    const tagCount = await db.countTags();
    if (tagCache!.tagCount === tagCount && tagCache!.filterKey === flatKey) {
      // Same tag count and filter key, pretty accurate cache
      return tagCache!.tags;
    }
    const tags = (await db.findAllTags()).filter(t => !t.aliases.some(a => flatTagFilter.includes(a)));
    await saveTagCache(cachePath, {
      tags,
      filterKey: flatKey,
      tagCount
    });
    return tags;
  });
}

function getFilterKey(tagFilters: string[]) {
  return tagFilters.sort().join(';');
}
