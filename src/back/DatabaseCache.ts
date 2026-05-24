import { GameSearch } from '@fparchive/flashpoint-archive';
import { readJsonFile } from '@shared/Util';
import { Tag, TagFilterGroup } from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { databaseReady, fpDatabase } from '.';
import { BackState } from './types';
import { getTaggedSearch } from './util/search';

type TagCache = {
  tags: Tag[];
  filterKey: string;
  tagCount: number;
};

const cacheKeyList: string[] = [];
let gameSaveCount = 0;
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

type GameStringCache = {
  gameCount: number;
  filterKey: string;
  data: string[]
};

async function loadStringCache(key: string, cachePath: string): Promise<GameStringCache> {
  try {
    const cache = await readJsonFile(cachePath);
    if (typeof cache?.gameCount !== 'number' ||
      typeof cache?.filterKey !== 'string' ||
      typeof cache?.data !== 'object'
    ) {
      // Invalid cache data at a glance, wipe
      log.warn('Cache', `${key} cache data was invalid, ignoring...`);
      return {
        gameCount: 0,
        filterKey: '',
        data: []
      };
    }
    return cache;
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      log.error('Cache', `${key} cache data failed to load, ignoring...: ${err}`);
    } else {
      log.info('Cache', `No ${key} cache data found`);
    }

    // Set empty cache
    return {
      gameCount: 0,
      filterKey: '',
      data: []
    };
  }
}

export function markGameSave(fpPath: string) {
  gameSaveCount += 1;
  for (const key of cacheKeyList) {
    const cachePath = path.join(fpPath, 'Cache', `${key}.json`);
    try {
      fs.unlinkSync(cachePath);
    } catch {
      // Doesn't exist or being edited, ignore
    }
  }
}

async function saveStringCache(cachePath: string, gameCount: number, filterKey: string, data: string[]) {
  await fs.ensureDir(path.dirname(cachePath));
  await fs.promises.writeFile(cachePath, JSON.stringify({
    gameCount,
    filterKey,
    data
  }));
}

function getStringCachedDataFactory(
  key: string,
  doSearch: (search: GameSearch) => Promise<string[]>
): (state: BackState, tagFilters: TagFilterGroup[]) => Promise<string[]> {
  let cache: GameStringCache | null = null;
  let gameSaveCountLocal = gameSaveCount;
  cacheKeyList.push(key);

  return async (state, tagFilters) => {
    console.log('Loading cache for ' + key);
    const flatTagFilter = tagFilters.reduce<string[]>((prev, cur) => prev.concat(cur.tags.map(t => t.toLowerCase())), []);
    const flatKey = getFilterKey(flatTagFilter);
    const cachePath = path.join(state.config.flashpointPath, 'Cache', `${key}.json`);

    if (cache === null) {
      cache = await loadStringCache(key, cachePath);
    }

    return databaseReady()
    .then(async (db) => {
      const gameCount = await db.countGames();
      if (gameSaveCountLocal === gameSaveCount && cache!.gameCount === gameCount && cache!.filterKey === flatKey) {
        // No new games saved, same game count and filter key, pretty accurate cache
        return cache!.data;
      }
      gameSaveCountLocal = gameSaveCount;
      const search = getTaggedSearch(tagFilters);
      const data = await doSearch(search);
      await saveStringCache(cachePath, gameCount, flatKey, data);
      return data;
    });
  };
}

function getStringCachedDataTaglessFactory(
  key: string,
  doSearch: () => Promise<string[]>
): (state: BackState) => Promise<string[]> {
  let cache: GameStringCache | null = null;
  let gameSaveCountLocal = gameSaveCount;
  cacheKeyList.push(key);

  return async (state) => {
    console.log('Loading cache for ' + key);
    const cachePath = path.join(state.config.flashpointPath, 'Cache', `${key}.json`);

    if (cache === null) {
      cache = await loadStringCache(key, cachePath);
    }


    return databaseReady()
    .then(async (db) => {
      const gameCount = await db.countGames();
      if (gameSaveCountLocal === gameSaveCount && cache!.gameCount === gameCount) {
        // No new games saved and same game count, pretty accurate cache
        return cache!.data;
      }
      gameSaveCountLocal = gameSaveCount;
      const data = await doSearch();
      await saveStringCache(cachePath, gameCount, '', data);
      return data;
    });
  };
}

export const getAllDevelopers = getStringCachedDataFactory('developers', (search) => fpDatabase.findAllGameDevelopers(search));
export const getAllPublishers = getStringCachedDataFactory('publishers', (search) => fpDatabase.findAllGamePublishers(search));
export const getAllSeries = getStringCachedDataFactory('series', (search) => fpDatabase.findAllGameSeries(search));

export const getAllLibraries = getStringCachedDataTaglessFactory('libraries', () => fpDatabase.findAllGameLibraries());
export const getAllStatuses = getStringCachedDataTaglessFactory('statuses', () => fpDatabase.findAllGameStatuses());
export const getAllApplicationPaths = getStringCachedDataTaglessFactory('applicationPaths', () => fpDatabase.findAllGameApplicationPaths());
export const getAllPlayModes = getStringCachedDataTaglessFactory('playModes', () => fpDatabase.findAllGamePlayModes());
