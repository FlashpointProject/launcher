import axios from 'axios';
import * as TagManager from '@back/game/TagManager';
import { GameMetadataSource } from 'flashpoint-launcher';
import { chunkArray } from '@shared/utils/misc';
import { TagAlias } from '@database/entity/TagAlias';
import { EntityManager, In, Not } from 'typeorm';
import { Tag } from '@database/entity/Tag';
import { Game } from '@database/entity/Game';
import { AdditionalApp } from '@database/entity/AdditionalApp';
import { GameData } from '@database/entity/GameData';
import { TagCategory } from '@database/entity/TagCategory';
import { PlatformAlias } from '@database/entity/PlatformAlias';
import { Platform } from '@database/entity/Platform';
import { num } from '@shared/utils/Coerce';
import * as fs from 'fs-extra';
import * as path from 'path';

export async function syncTags(tx: EntityManager, source: GameMetadataSource, categories: TagCategory[]): Promise<Date> {
  const tagsUrl = `${source.baseUrl}/api/tags?after=${source.tags.latestUpdateTime}`;
  const tagAliasRepo = tx.getRepository(TagAlias);
  const tagRepo = tx.getRepository(Tag);
  const tagCategoryRepo = tx.getRepository(TagCategory);
  const nextLatestDate = new Date(source.tags.latestUpdateTime);

  const res = await axios.get(tagsUrl)
  .catch((err) => {
    throw 'Failed to search tags';
  });

  const tagsRaw = res.data.tags as RemoteTagRaw[];
  const lastDate = tagsRaw.reduce((prev, cur) => {
    const nextDate = new Date(cur.date_modified);
    if (prev < nextDate) {
      return nextDate;
    } else {
      return prev;
    }
  }, nextLatestDate);
  const categoriesRaw = res.data.categories as RemoteCategory[];

  // Insert any missing tag categories
  for (const rawCat of categoriesRaw) {
    if (categories.findIndex(c => c.name === rawCat.name) === -1) {
      const newCat = tagCategoryRepo.create({
        name: rawCat.name,
        color: rawCat.color,
        description: rawCat.description
      });
      categories.push(await tagCategoryRepo.save(newCat));
    }
  }

  const tags = tagsRaw.map((t) => {
    return {
      ...t,
      aliases: t.aliases.split(';').map(s => {
        return {
          tagId: t.id,
          name: s.trim()
        };
      })
    };
  }) as RemoteTagParsed[];

  const changedAliases = tags.reduce<Alias[]>((prev, cur) => prev.concat(cur.aliases), []);
  const existingTags = await TagManager.findTags();

  console.log('clear');
  // Remove all changed aliases
  for (const chunk of chunkArray(changedAliases, 150)) {
    await tagAliasRepo.delete({ name: In(chunk.map(c => c.name)) });
  }
  // Reassign them to the correct tag
  for (const chunk of chunkArray(changedAliases, 100)) {
    await tagAliasRepo.createQueryBuilder().insert().values(chunk).execute();
  }

  console.log('changed');
  // Update any changed tags
  for (const changedTag of tags.filter(t => existingTags.findIndex(et => et.id === t.id) !== -1)) {
    // Remove all aliases that aren't on the changed tag anymore
    await tagAliasRepo.createQueryBuilder().delete()
    .where({ name: Not(In(changedTag.aliases.map(c => c.name)))})
    .andWhere({ tagId: changedTag.id }).execute();
    // Find correct category and primary alias IDs to use
    const category = categories.find(c => c.name === changedTag.category);
    if (!category) {
      // Create the missing tag category
      throw 'Invalid tag category';
    }
    const pAlias = await tagAliasRepo.findOne({ where: { name: changedTag.name }});
    if (!pAlias) {
      throw 'Invalid primary alias? How?';
    }
    await tagRepo.createQueryBuilder().update({
      dateModified: changedTag.date_modified,
      categoryId: category.id,
      description: changedTag.description,
      primaryAliasId: pAlias.id
    }).where({ id: changedTag.id }).execute();
  }

  console.log('new');
  // Add any new tags
  for (const newTag of tags.filter(t => existingTags.findIndex(et => et.id === t.id) === -1)) {
    await tx.query(`INSERT INTO tag ("id", "dateModified", "primaryAliasId", "categoryId", "description") VALUES (
        ?,
        ?,
        (SELECT ta.id FROM tag_alias ta WHERE ta.tagId = ?),
        (SELECT tc.id FROM tag_category tc WHERE tc.name = ?),
        ?
      )`, [
      newTag.id,
      newTag.date_modified,
      newTag.id,
      newTag.category,
      newTag.description || ''
    ]);
  }

  return lastDate;
}

export async function syncPlatforms(tx: EntityManager, source: GameMetadataSource): Promise<Date> {
  const platformsUrl = `${source.baseUrl}/api/platforms?after=${source.tags.latestUpdateTime}`;

  const res = await axios.get(platformsUrl)
  .catch((err) => {
    throw 'Failed to search platforms';
  });

  const platforms = res.data.map((p: RemotePlatformRaw) => {
    return {
      ...p,
      aliases: p.aliases.split(';').map(s => {
        return {
          platformId: p.id,
          name: s.trim()
        };
      })
    };
  }) as RemotePlatformParsed[];

  const nextLatestDate = new Date(source.tags.latestUpdateTime);
  const lastDate = platforms.reduce((prev, cur) => {
    const nextDate = new Date(cur.date_modified);
    if (prev < nextDate) {
      return nextDate;
    } else {
      return prev;
    }
  }, nextLatestDate);

  const platformAliasRepo = tx.getRepository(PlatformAlias);
  const platformRepo = tx.getRepository(Platform);
  const changedAliases = platforms.reduce<AliasPlatform[]>((prev, cur) => prev.concat(cur.aliases), []);
  const existingPlatforms = await TagManager.dumpPlatforms();

  // Remove all changed aliases
  for (const chunk of chunkArray(changedAliases, 150)) {
    await platformAliasRepo.delete({ name: In(chunk.map(c => c.name)) });
  }
  console.log('removed');
  // Reassign them to the correct platform
  for (const chunk of chunkArray(changedAliases, 100)) {
    await platformAliasRepo.createQueryBuilder().insert().values(chunk).execute();
  }
  console.log('reassigned');

  // Update any changed platforms
  for (const changedPlatform of platforms.filter(t => existingPlatforms.findIndex(et => et.id === t.id) !== -1)) {
    // Remove all aliases that aren't on the changed platform anymore
    await platformAliasRepo.createQueryBuilder().delete()
    .where({ name: Not(In(changedPlatform.aliases.map(c => c.name)))})
    .andWhere({ platformId: changedPlatform.id }).execute();
    // Find correct category and primary alias IDs to use
    const pAlias = await platformAliasRepo.findOne({ where: { name: changedPlatform.name }});
    if (!pAlias) {
      throw 'Invalid primary alias? How?';
    }
    await platformRepo.createQueryBuilder().update({
      dateModified: changedPlatform.date_modified,
      description: changedPlatform.description,
      primaryAliasId: pAlias.id
    }).where({ id: changedPlatform.id }).execute();
  }
  console.log('updated');

  // Add any new platforms
  for (const newPlatform of platforms.filter(t => existingPlatforms.findIndex(et => et.id === t.id) === -1)) {
    await platformRepo.query(`INSERT INTO platform ("id", "dateModified", "primaryAliasId", "description") VALUES (
        ?,
        ?,
        (SELECT pa.id FROM platform_alias pa WHERE pa.platformId = ?),
        ?
      )`, [
      newPlatform.id,
      newPlatform.date_modified,
      newPlatform.id,
      newPlatform.description || ''
    ]);
  }

  return lastDate;
}

export async function syncGames(tx: EntityManager, source: GameMetadataSource, dataPacksFolder: string, beforeChunk?: () => void): Promise<Date> {
  const capUpdateTime = new Date();
  const gamesUrl = `${source.baseUrl}/api/games`;
  const deletedUrl = `${source.baseUrl}/api/games/deleted`;
  const gamesRepo = tx.getRepository(Game);
  const addAppRepo = tx.getRepository(AdditionalApp);
  const gameDataRepo = tx.getRepository(GameData);

  // -- New and Updated Games -- //

  // Fetch until none remain
  let lastDate = new Date(source.games.latestUpdateTime);
  let nextId = '';
  while (true) {
    const reqUrl = `${gamesUrl}?after=${source.games.latestUpdateTime}&before=${capUpdateTime.toISOString()}&broad=true&afterId=${nextId}`;
    const res = await axios.get(reqUrl)
    .catch((err) => {
      throw 'Failed to search games';
    });
    const data = res.data as RemoteGamesRes;
    const tagRelations = data.tag_relations.map(t => {
      return {
        gameId: t[0],
        tagId: num(t[1])
      };
    });
    const platformRelations = data.platform_relations.map(p => {
      return {
        gameId: p[0],
        platformId: num(p[1])
      };
    });
    const games = data.games;

    if (beforeChunk && games.length > 0) {
      beforeChunk();
    }

    // Store latest date
    lastDate = games.reduce((prev, cur) => {
      const nextDate = new Date(cur.date_modified);
      if (prev < nextDate) {
        return nextDate;
      } else {
        return prev;
      }
    }, lastDate);

    // Update loop params
    if (data.games.length === 0) {
      break;
    } else {
      nextId = data.games[data.games.length - 1].id;
    }

    const changedGameIds = games.map(game => game.id);
    const changedAddApps = data.add_apps.map(d => {
      return {
        applicationPath: d.application_path,
        launchCommand: d.launch_command,
        name: d.name,
        waitForExit: !!d.wait_for_exit,
        autoRunBefore: !!d.auto_run_before,
        parentGameId: d.parent_game_id
      };
    });
    const changedGameData = data.game_data.map(d => {
      const dataPath = `${d.game_id}-${(new Date(d.date_added)).getTime()}.zip`;
      const fullPath = path.join(dataPacksFolder, dataPath);
      const presentOnDisk = fs.existsSync(fullPath);
      return {
        gameId: d.game_id,
        title: d.title,
        dateAdded: d.date_added,
        sha256: d.sha_256,
        crc32: d.crc_32,
        size: d.size,
        path: dataPath,
        presentOnDisk,
        parameters: d.parameters,
        applicationPath: d.application_path,
        launchCommand: d.launch_command
      };
    });

    // Reassign all add apps
    for (const chunk of chunkArray(changedGameIds, 150)) {
      await addAppRepo.createQueryBuilder().delete().where({ parentGameId: In(chunk) }).execute();
      await gameDataRepo.createQueryBuilder().delete().where({ gameId: In(chunk) }).execute();
      await tx.createQueryBuilder()
      .delete()
      .from('game_tags_tag', 'gtt')
      .where('game_tags_tag.gameId IN (:...changed)', { changed: chunk })
      .execute();
      await tx.createQueryBuilder()
      .delete()
      .from('game_platforms_platform', 'gpp')
      .where('game_platforms_platform.gameId IN (:...changed)', { changed: chunk })
      .execute();
    }
    for (const chunk of chunkArray(changedAddApps, 50)) {
      await tx.createQueryBuilder()
      .insert()
      .into(AdditionalApp)
      .values(chunk)
      .execute();
    }
    // Reassign all game data
    for (const chunk of chunkArray(changedGameData, 50)) {
      await tx.createQueryBuilder()
      .insert()
      .into(GameData)
      .values(chunk)
      .execute();
    }

    const existingGameIds = (await gamesRepo.createQueryBuilder('game').select('game.id').getMany()).map(e => e.id);
    // Update changed games
    for (const changedGame of games.filter(g => existingGameIds.includes(g.id))) {
      await gamesRepo.createQueryBuilder().update({
        title: changedGame.title,
        alternateTitles: changedGame.alternate_titles,
        series: changedGame.series,
        developer: changedGame.developer,
        publisher: changedGame.publisher,
        dateAdded: changedGame.date_added,
        dateModified: changedGame.date_modified,
        broken: false,
        extreme: false,
        playMode: changedGame.play_mode,
        status: changedGame.status,
        notes: changedGame.notes,
        tagsStr: changedGame.tags_str,
        platformsStr: changedGame.platforms_str,
        source: changedGame.source,
        version: changedGame.version,
        legacyApplicationPath: changedGame.application_path,
        legacyLaunchCommand: changedGame.launch_command,
        releaseDate: changedGame.release_date,
        originalDescription: changedGame.original_description,
        language: changedGame.language,
        library: changedGame.library,
        activeDataId: -1,
        platformName: changedGame.platform_name
      }).where({ id: changedGame.id }).execute();
    }

    // Add new games
    for (const newGame of games.filter(g => !existingGameIds.includes(g.id))) {
      const g = gamesRepo.create({
        id: newGame.id,
        title: newGame.title,
        alternateTitles: newGame.alternate_titles,
        series: newGame.series,
        developer: newGame.developer,
        publisher: newGame.publisher,
        dateAdded: newGame.date_added,
        dateModified: newGame.date_modified,
        broken: false,
        extreme: false,
        playMode: newGame.play_mode,
        status: newGame.status,
        notes: newGame.notes,
        tagsStr: newGame.tags_str,
        platformsStr: newGame.platforms_str,
        source: newGame.source,
        version: newGame.version,
        legacyApplicationPath: newGame.application_path,
        legacyLaunchCommand: newGame.launch_command,
        releaseDate: newGame.release_date,
        originalDescription: newGame.original_description,
        language: newGame.language,
        library: newGame.library,
        orderTitle: '',
        activeDataId: -1,
        activeDataOnDisk: false,
        platformName: newGame.platform_name,
      });
      await gamesRepo.save(g);
    }

    // Update Active Data IDs to most recent Game Data
    await tx.query(`UPDATE game 
      SET activeDataId = (SELECT game_data.id FROM game_data WHERE game.id = game_data.gameId ORDER BY game_data.dateAdded DESC LIMIT 1)
      WHERE game.activeDataId = -1`);

    // Remove existing relations
    for (const chunk of chunkArray(changedGameIds, 150)) {
      await tx.query(`DELETE FROM game_tags_tag WHERE gameId IN (${chunk.map(c => '?').join(',')})`, chunk);
    }

    // Add new relations
    for (const chunk of chunkArray(tagRelations, 100)) {
      await tx.createQueryBuilder()
      .insert()
      .into('game_tags_tag', ['gameId', 'tagId'])
      .values(chunk)
      .orIgnore()
      .execute();
    }

    // Rebuild platform relations
    for (const chunk of chunkArray(changedGameIds, 150)) {
      await tx.query(`DELETE FROM game_platforms_platform WHERE gameId IN (${chunk.map(c => '?').join(',')})`, chunk);
    }

    for (const chunk of chunkArray(platformRelations, 100)) {
      await tx.createQueryBuilder()
      .insert()
      .into('game_platforms_platform', ['gameId', 'platformId'])
      .values(chunk)
      .orIgnore()
      .execute();
    }

  }

  // -- Deleted Games -- //
  const reqUrl = `${deletedUrl}?after=${source.games.latestUpdateTime}`;
  const res = await axios.get(reqUrl)
  .catch((err) => {
    throw 'Failed to search deleted games';
  });
  const data = res.data as RemoteDeletedGamesRes;

  // Make configurable later
  const selfDeleteReasons = ['Duplicate', 'Blacklisted Content'];

  for (const game of data.games) {
    if (selfDeleteReasons.includes(game.reason)) {
      // Delete own game
      const existingGame = await gamesRepo.findOne({ where: { id: game.id }});
      if (existingGame) {
        // Remove games add apps (just to be safe)
        await addAppRepo.delete({ parentGameId: game.id });
        // Remove game (tags etc should follow)
        await gamesRepo.remove(existingGame);
      }
    }
  }

  return lastDate;
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

type RemoteDeletedGamesRes = {
  games: RemoteDeletedGame[];
}

type RemoteDeletedGame = {
  id: string;
  date_modified: string;
  reason: string;
}

type RemoteGamesRes = {
  games: RemoteGame[];
  add_apps: RemoteAddApp[];
  game_data: RemoteGameData[];
  tag_relations: string[][];
  platform_relations: string[][];
}

type RemoteGameData = {
  id: string;
  game_id: string;
  title: string;
  date_added: string;
  sha_256: string;
  crc_32: number;
  size: number;
  parameters?: string;
  application_path: string;
  launch_command: string;
}

type RemoteAddApp = {
  name: string;
  application_path: string;
  launch_command: string;
  wait_for_exit: boolean;
  auto_run_before: boolean;
  parent_game_id: string;
}

type RemoteGame = {
  id: string;
  title: string;
  alternate_titles: string;
  series: string;
  developer: string;
  publisher: string;
  date_added: string;
  date_modified: string;
  play_mode: string;
  status: string;
  notes: string;
  tags_str: string;
  platforms_str: string;
  source: string;
  application_path: string;
  launch_command: string;
  release_date: string;
  version: string;
  original_description: string;
  language: string;
  library: string;
  platform_name: string;
}

type RemoteTagRaw = {
  id: number,
  name: string,
  description: string,
  category: string,
  date_modified: string,
  aliases: string,
  user_id: number
}

type RemotePlatformRaw = {
  id: number,
  name: string,
  description: string,
  date_modified: string,
  aliases: string,
  user_id: number
}

type RemoteTagParsed = {
  id: number,
  name: string,
  description: string,
  category: string,
  date_modified: string,
  aliases: Alias[],
  user_id: number
}

type RemotePlatformParsed = {
  id: number,
  name: string,
  description: string,
  date_modified: string,
  aliases: AliasPlatform[],
  user_id: number
}

type RemoteCategory = {
  id: number;
  name: string;
  color: string;
  description: string;
}

type Alias = {
  tagId: number;
  name: string;
}

type AliasPlatform = {
  platformId: number;
  name: string;
}
