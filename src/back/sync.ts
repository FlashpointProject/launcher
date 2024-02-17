import { RemoteCategory, RemoteDeletedGamesRes, RemoteGamesRes, RemotePlatform, RemoteTag } from '@fparchive/flashpoint-archive';
import axios from 'axios';
import { GameMetadataSource } from 'flashpoint-launcher';
import { camelCase, transform } from 'lodash';
import { fpDatabase } from '.';

export async function syncTags(source: GameMetadataSource): Promise<Date> {
  const tagsUrl = `${source.baseUrl}/api/tags?after=${source.tags.latestUpdateTime}`;
  const nextLatestDate = source.tags.latestUpdateTime;

  const res = await axios.get(tagsUrl)
  .catch((err) => {
    throw 'Failed to search tags';
  });

  const tags = (res.data.tags as RemoteTagRaw[]).map((t) => {
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      dateModified: t.date_modified,
      aliases: t.aliases.split(';').map(s => s.trim()),
      deleted: t.Deleted
    };
  }) as RemoteTag[];

  const lastDate = tags.reduce((prev, cur) => {
    const nextDate = cur.dateModified;
    if ((new Date(prev)) < (new Date(nextDate))) {
      return nextDate;
    } else {
      return prev;
    }
  }, nextLatestDate);
  const categories = res.data.categories as RemoteCategory[];

  await fpDatabase.updateApplyCategories(categories);
  await fpDatabase.updateApplyTags(tags);

  return new Date(lastDate);
}

export async function syncPlatforms(source: GameMetadataSource): Promise<Date> {
  const platformsUrl = `${source.baseUrl}/api/platforms?after=${source.tags.latestUpdateTime}`;

  const res = await axios.get(platformsUrl)
  .catch((err) => {
    throw 'Failed to search platforms';
  });

  const platforms = (res.data as RemotePlatformRaw[]).map<RemotePlatform>((v) => {
    return {
      id: v.id,
      name: v.name,
      description: v.description,
      dateModified: v.date_modified,
      aliases: v.aliases.split(';').map(s => s.trim()),
      deleted: v.Deleted
    };
  });
  const nextLatestDate = source.tags.latestUpdateTime;
  const lastDate = platforms.reduce((prev, cur) => {
    const nextDate = cur.dateModified;
    if ((new Date(prev)) < (new Date(nextDate))) {
      return nextDate;
    } else {
      return prev;
    }
  }, nextLatestDate);

  await fpDatabase.updateApplyPlatforms(platforms);

  return new Date(lastDate);
}

export async function syncGames(source: GameMetadataSource, dataPacksFolder: string, beforeChunk?: () => void): Promise<Date> {
  const capUpdateTime = new Date();
  const gamesUrl = `${source.baseUrl}/api/games`;
  const deletedUrl = `${source.baseUrl}/api/games/deleted`;

  // -- New and Updated Games -- //

  // Fetch until none remain
  let lastDate = source.games.latestUpdateTime;
  let nextId = '';
  while (true) {
    const reqUrl = `${gamesUrl}?after=${source.games.latestUpdateTime}&before=${capUpdateTime.toISOString()}&broad=true&afterId=${nextId}`;
    console.log(reqUrl);
    const res = await axios.get(reqUrl)
    .catch((err) => {
      throw 'Failed to search games';
    });
    const data = camelify(res.data) as any as RemoteGamesRes;

    if (data.games.length === 0) {
      break;
    }
    nextId = data.games[data.games.length - 1].id;

    if (beforeChunk) {
      beforeChunk();
    }

    // Store latest date
    lastDate = data.games.reduce((prev, cur) => {
      const nextDate = cur.dateModified;
      if (new Date(prev) < new Date(nextDate)) {
        return nextDate;
      } else {
        return prev;
      }
    }, lastDate);

    console.log(`${lastDate} - ${nextId}`);
    console.log('applying game update batch');
    await fpDatabase.updateApplyGames(data);
    console.log('batch complete, looping');
  }

  // -- Deleted Games -- //
  const reqUrl = `${deletedUrl}?after=${source.games.latestUpdateTime}`;
  const res = await axios.get(reqUrl)
  .catch((err) => {
    throw 'Failed to search deleted games';
  });
  const data = camelify(res.data) as any as RemoteDeletedGamesRes;

  console.log('applying game delete batch');
  await fpDatabase.updateDeleteGames(data);

  return new Date(lastDate);
}

export async function getMetaUpdateInfo(source: GameMetadataSource, accurate?: boolean, fromScratch?: boolean): Promise<number> {
  // Add 1 second to update time to prevent rounding down errors
  const d = new Date(source.games.latestUpdateTime);
  if (!accurate) {
    d.setSeconds(d.getSeconds() + 2);
  }
  const countUrl = `${source.baseUrl}/api/games/updates?after=${fromScratch ? '1970-01-01' : d.toISOString()}`;
  try {
    const res = await axios.get(countUrl);
    return res.data.total;
  } catch (err) {
    log.error('Launcher', 'Error fetching update info for ' + countUrl + ' - ' + err);
    return -1;
  }
}

type RemoteTagRaw = {
  id: number,
  name: string,
  description: string,
  category: string,
  date_modified: string,
  aliases: string,
  user_id: number,
  Deleted: boolean
}

type RemotePlatformRaw = {
  id: number,
  name: string,
  description: string,
  date_modified: string,
  aliases: string,
  user_id: number,
  Deleted: boolean
}

const camelify = (obj: Record<string, unknown>) => {
  return transform(obj, (result: Record<string, unknown>, value: unknown, key: string, target) => {
    const camelKey = Array.isArray(target) ? key : camelCase(key);
    result[camelKey] = (value !== null && typeof value === 'object') ? camelify(value as Record<string, unknown>) : value;
  });
};
