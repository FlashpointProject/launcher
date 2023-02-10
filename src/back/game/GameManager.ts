import { ApiEmitter } from '@back/extensions/ApiEmitter';
import { validateSqlName, validateSqlOrder } from '@back/util/sql';
import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { PageKeyset, PageTuple, RequestGameRange, ResponseGameRange, ViewGame } from '@shared/back/types';
import { VIEW_PAGE_SIZE } from '@shared/constants';
import { FilterGameOpts } from '@shared/game/GameFilter';
import { tagSort } from '@shared/Util';
import * as Coerce from '@shared/utils/Coerce';
import { chunkArray } from '@shared/utils/misc';
import { GameOrderBy, GameOrderReverse } from 'flashpoint-launcher';
import * as fs from 'fs';
import * as path from 'path';
import { Brackets, FindOneOptions, In, SelectQueryBuilder } from 'typeorm';
import { AppDataSource } from '..';
import * as GameDataManager from './GameDataManager';
import * as TagManager from './TagManager';

const exactFields = [ 'broken', 'library', 'activeDataOnDisk' ];
enum flatGameFields {
  'id', 'title', 'alternateTitles', 'developer', 'publisher', 'dateAdded', 'dateModified', 'series',
  'platform', 'broken', 'playMode', 'status', 'notes', 'source', 'applicationPath', 'launchCommand', 'releaseDate',
  'version', 'originalDescription', 'language', 'library', 'activeDataOnDisk'
}

// Events
export const onDidUpdateGame = new ApiEmitter<{oldGame: Game, newGame: Game}>();
export const onDidRemoveGame = new ApiEmitter<Game>();

export const onDidUpdatePlaylist = new ApiEmitter<{oldPlaylist: Playlist, newPlaylist: Playlist}>();
export const onDidUpdatePlaylistGame = new ApiEmitter<{oldGame: PlaylistGame, newGame: PlaylistGame}>();
export const onDidRemovePlaylistGame = new ApiEmitter<PlaylistGame>();

export async function countGames(): Promise<number> {
  const gameRepository = AppDataSource.getRepository(Game);
  return gameRepository.count();
}

/**
 * Find the game with the specified ID.
 *
 * @param id ID of game to find
 * @param filter Filters to append (Can be used to find first match if ID is undefined)
 */
export async function findGame(id?: string, filter?: FindOneOptions<Game>): Promise<Game | null> {
  if (!filter) {
    filter = {};
  }
  if (id) {
    filter.where = {
      id
    };
  }
  const gameRepository = AppDataSource.getRepository(Game);
  const game = await gameRepository.findOne(filter);
  if (game) {
    game.tags.sort(tagSort);
  }
  return game;
}

export async function findGameRow(gameId: string, filterOpts?: FilterGameOpts, orderBy?: GameOrderBy, direction?: GameOrderReverse, index?: PageTuple): Promise<number> {
  if (orderBy) { validateSqlName(orderBy); }

  // const startTime = Date.now();
  const gameRepository = AppDataSource.getRepository(Game);

  const subQ = gameRepository.createQueryBuilder('game')
  .select(`game.id, row_number() over (order by game.${orderBy}) row_num`);
  if (index) {
    if (!orderBy) { throw new Error('Failed to get game row. "index" is set but "orderBy" is missing.'); }
    subQ.where(`(game.${orderBy}, game.id) > (:orderVal, :id)`, { orderVal: index.orderVal, id: index.id });
  }
  if (filterOpts) {
    applyFlatGameFilters('game', subQ, filterOpts, index ? 1 : 0);
  }
  if (orderBy) { subQ.orderBy(`game.${orderBy}`, direction); }

  const query = AppDataSource.createQueryBuilder()
  .setParameters(subQ.getParameters())
  .select('row_num')
  .from('(' + subQ.getQuery() + ')', 'g')
  .where('g.id = :gameId', { gameId: gameId });

  const raw = await query.getRawOne();
  // console.log(`${Date.now() - startTime}ms for row`);
  return raw ? Coerce.num(raw.row_num) : -1; // Coerce it, even though it is probably of type number or undefined
}

export async function findRandomGames(count: number, broken: boolean, excludedLibraries: string[], flatFilters: string[]): Promise<ViewGame[]> {
  const gameRepository = AppDataSource.getRepository(Game);
  const query = gameRepository.createQueryBuilder('game');
  query.select('game.id, game.title, game.platform, game.developer, game.publisher, game.tagsStr');
  if (!broken)  { query.andWhere('broken = false');  }
  if (excludedLibraries.length > 0) {
    query.andWhere('library NOT IN (:...libs)', { libs: excludedLibraries });
  }
  if (flatFilters.length > 0) {
    const tagIdQuery = TagManager.getFilterIDsQuery(flatFilters);
    const excludedGameIdQuery = AppDataSource.createQueryBuilder()
    .select('game_tag.gameId')
    .from('game_tags_tag', 'game_tag')
    .where(`game_tag.tagId IN (${tagIdQuery.getQuery()})`);
    query.andWhere(`game.id NOT IN (${excludedGameIdQuery.getQuery()})`)
    .setParameters(tagIdQuery.getParameters());
  }
  query.orderBy('RANDOM()').take(count);
  return (await query.getRawMany()) as ViewGame[];
}

export type GetPageKeysetResult = {
  keyset: PageKeyset;
  total: number;
}

export async function findGamePageKeyset(filterOpts: FilterGameOpts, orderBy: GameOrderBy, direction: GameOrderReverse, searchLimit?: number): Promise<GetPageKeysetResult> {
  // let startTime = Date.now();

  validateSqlName(orderBy);
  validateSqlOrder(direction);

  // console.log('FindGamePageKeyset:');

  const subQ = await getGameQuery('sub', filterOpts, orderBy, direction);
  subQ.select(`sub.${orderBy}, sub.title, sub.id, case row_number() over(order by sub.${orderBy} ${direction}, sub.title ${direction}, sub.id) % ${VIEW_PAGE_SIZE} when 0 then 1 else 0 end page_boundary`);
  subQ.orderBy(`sub.${orderBy} ${direction}, sub.title`, direction);

  let query = AppDataSource.createQueryBuilder()
  .select(`g.${orderBy}, g.title, g.id, row_number() over(order by g.${orderBy} ${direction}, g.title ${direction}) + 1 page_number`)
  .from('(' + subQ.getQuery() + ')', 'g')
  .where('g.page_boundary = 1')
  .setParameters(subQ.getParameters());

  if (searchLimit) {
    query = query.limit(searchLimit);
  }

  const raw = await query.getRawMany();
  const keyset: PageKeyset = {};
  for (const r of raw) {
    keyset[r['page_number']] = {orderVal: Coerce.str(r[orderBy]), title: Coerce.str(r['title']), id: Coerce.str(r['id'])};
  }

  // console.log(`  Keyset: ${Date.now() - startTime}ms`);

  // Count games
  let total = -1;
  // startTime = Date.now();
  const subGameQuery = await getGameQuery('sub', filterOpts, orderBy, direction, 0, searchLimit ? searchLimit : undefined, undefined);
  query = AppDataSource.createQueryBuilder()
  .select('COUNT(*)')
  .from('(' + subGameQuery.getQuery() + ')', 'g')
  .setParameters(subGameQuery.getParameters())
  .skip(0);
  if (searchLimit) { query = query.limit(searchLimit); }

  const result = await query.getRawOne();
  if (result) {
    total = Coerce.num(result['COUNT(*)']); // Coerce it, even though it is probably of type number or undefined
  } else {
    console.error(`Failed to get total number of games. No result from query (Query: "${query.getQuery()}").`);
  }

  // console.log(`  Count: ${Date.now() - startTime}ms`);

  return {
    keyset,
    total,
  };
}

export type FindGamesOpts = {
  /** Ranges of games to fetch (all games are fetched if undefined). */
  ranges?: RequestGameRange[];
  filter?: FilterGameOpts;
  orderBy?: GameOrderBy;
  direction?: GameOrderReverse;
  getTotal?: boolean;
}

export async function findAllGames(): Promise<Game[]> {
  const gameRepository = AppDataSource.getRepository(Game);
  return gameRepository.find();
}

/**
 * Search the database for games.
 *
 * @param opts Search Options
 * @param shallow Limit columns in result to those in ViewGame
 */
export async function findGames<T extends boolean>(opts: FindGamesOpts, shallow: T): Promise<Array<ResponseGameRange<T>>> {
  const ranges = opts.ranges || [{ start: 0, length: undefined }];
  const rangesOut: ResponseGameRange<T>[] = [];

  // console.log('FindGames:');

  let query: SelectQueryBuilder<Game> | undefined;
  for (let i = 0; i < ranges.length; i++) {
    // const startTime = Date.now();

    const range = ranges[i];
    query = await getGameQuery('game', opts.filter, opts.orderBy, opts.direction, range.start, range.length, range.index);

    // Select games
    // @TODO Make it infer the type of T from the value of "shallow", and then use that to make "games" get the correct type, somehow?
    // @PERF When multiple pages are requested as individual ranges, select all of them with a single query then split them up
    const games = (shallow)
      ? (await query.select('game.id, game.title, game.platform, game.developer, game.publisher, game.extreme, game.tagsStr').getRawMany()) as ViewGame[]
      : await query.getMany();
    rangesOut.push({
      start: range.start,
      length: range.length,
      games: ((opts.filter && opts.filter.playlistId)
        ? games.slice(range.start, range.start + (range.length || games.length - range.start))
        : games
      ) as (T extends true ? ViewGame[] : Game[]),
    });

    // console.log(`  Query: ${Date.now() - startTime}ms (start: ${range.start}, length: ${range.length}${range.index ? ', with index' : ''})`);
  }

  return rangesOut;
}

/**
 * Find an add apps with the specified ID.
 *
 * @param id ID to find
 * @param filter Filters to append (Useful to find first match if ID is undefined)
 */
export async function findAddApp(id?: string, filter?: FindOneOptions<AdditionalApp>): Promise<AdditionalApp | null> {
  if (!filter) {
    filter = {
      relations: ['parentGame']
    };
  }
  if (id) {
    filter.where = {
      id
    };
  }
  const addAppRepository = AppDataSource.getRepository(AdditionalApp);
  return addAppRepository.findOne(filter);
}

export async function findPlatformAppPaths(platform: string): Promise<string[]> {
  const gameRepository = AppDataSource.getRepository(Game);
  const values = await gameRepository.createQueryBuilder('game')
  .select('game.applicationPath')
  .distinct()
  .where('game.platform = :platform', {platform: platform})
  .groupBy('game.applicationPath')
  .orderBy('COUNT(*)', 'DESC')
  .getRawMany();
  return Coerce.strArray(values.map(v => v['game_applicationPath']));
}

export async function findUniqueValues(entity: any, column: string, commaSeperated?: boolean): Promise<string[]> {
  validateSqlName(column);

  const repository = AppDataSource.getRepository(entity);
  const rawValues = await repository.createQueryBuilder('entity')
  .select(`entity.${column}`)
  .distinct()
  .getRawMany();
  const values = Coerce.strArray(rawValues.map(v => v[`entity_${column}`]));
  if (commaSeperated) {
    const set = new Set(values.reduce<string[]>((prev, cur) => {
      return prev.concat(cur.split(';').map(c => c.trim()));
    }, []));
    return Array.from(set);
  } else {
    return values;
  }
}

export async function findPlatforms(library: string): Promise<string[]> {
  const gameRepository = AppDataSource.getRepository(Game);
  const libraries = await gameRepository.createQueryBuilder('game')
  .where('game.library = :library', {library: library})
  .select('game.platform')
  .distinct()
  .getRawMany();
  return Coerce.strArray(libraries.map(l => l.game_platform));
}

export async function updateGames(games: Game[]): Promise<void> {
  const chunks = chunkArray(games, 2000);
  for (const chunk of chunks) {
    await AppDataSource.transaction(async transEntityManager => {
      for (const game of chunk) {
        await transEntityManager.save(Game, game);
      }
    });
  }
}

export async function save(game: Game): Promise<Game> {
  const gameRepository = AppDataSource.getRepository(Game);
  log.debug('Launcher', 'Saving game...');
  const savedGame = await gameRepository.save(game);
  if (savedGame) { onDidUpdateGame.fire({oldGame: game, newGame: savedGame}); }
  return savedGame;
}

export async function removeGameAndAddApps(gameId: string, dataPacksFolderPath: string): Promise<Game | null> {
  const gameRepository = AppDataSource.getRepository(Game);
  const addAppRepository = AppDataSource.getRepository(AdditionalApp);
  const game = await findGame(gameId);
  if (game) {
    // Delete GameData
    for (const gameData of (await GameDataManager.findGameData(game.id))) {
      if (gameData.presentOnDisk && gameData.path) {
        await fs.promises.unlink(path.join(dataPacksFolderPath, gameData.path));
      }
      await GameDataManager.remove(gameData.id);
    }
    // Delete Add Apps
    for (const addApp of game.addApps) {
      await addAppRepository.remove(addApp);
    }
    // Delete Game
    await gameRepository.remove(game);
    onDidRemoveGame.fire(game);
  }
  return game;
}

export async function findPlaylist(playlistId: string, join?: boolean): Promise<Playlist | null> {
  const opts: FindOneOptions<Playlist> = join ? { relations: ['games'] } : {};
  const playlistRepository = AppDataSource.getRepository(Playlist);
  return playlistRepository.findOne({
    ...opts,
    where: {
      id: playlistId
    }
  });
}

export async function findPlaylistByName(playlistName: string, join?: boolean): Promise<Playlist | null> {
  const opts: FindOneOptions<Playlist> = join ? {
    relations: ['games'],
    where: {
      title: playlistName
    }
  } : {
    where: {
      title: playlistName
    }
  };
  const playlistRepository = AppDataSource.getRepository(Playlist);
  return playlistRepository.findOne(opts);
}

/**
 * Returns all playlists
 *
 * @param showExtreme Include playlists marked as Extreme
 */
export async function findPlaylists(showExtreme: boolean): Promise<Playlist[]> {
  const playlistRepository = AppDataSource.getRepository(Playlist);
  if (showExtreme) {
    return await playlistRepository.find();
  } else {
    return await playlistRepository.find({ where: { extreme: false }});
  }
}

/**
 * Removes a playlist
 *
 * @param playlistId ID of playlist to remove
 */
export async function removePlaylist(playlistId: string): Promise<Playlist | undefined> {
  const playlistRepository = AppDataSource.getRepository(Playlist);
  const playlistGameRepository = AppDataSource.getRepository(PlaylistGame);
  const playlist = await findPlaylist(playlistId);
  if (playlist) {
    await playlistGameRepository.delete({ playlistId: playlist.id });
    return playlistRepository.remove(playlist);
  }
}

/**
 * Updates a playlist
 *
 * @param playlist Playlist to update
 */
export async function updatePlaylist(playlist: Playlist): Promise<Playlist> {
  const playlistRepository = AppDataSource.getRepository(Playlist);
  const savedPlaylist = await playlistRepository.save(playlist);
  if (savedPlaylist) { onDidUpdatePlaylist.fire({oldPlaylist: playlist, newPlaylist: savedPlaylist}); }
  return savedPlaylist;
}

/**
 * Finds a Playlist Game. An object linked Games to Playlists.
 * Playlist Game also contains playlist specific info for games, like notes.
 *
 * @param playlistId Playlist to search
 * @param gameId Game ID to find in Playlist
 */
export async function findPlaylistGame(playlistId: string, gameId: string): Promise<PlaylistGame | null> {
  const playlistGameRepository = AppDataSource.getRepository(PlaylistGame);
  return await playlistGameRepository.findOneBy({ gameId, playlistId });
}

/**
 * Removes a Playlist Game
 *
 * @param playlistId Playlist ID to search
 * @param gameId Game ID to remove from Playlist
 */
export async function removePlaylistGame(playlistId: string, gameId: string): Promise<PlaylistGame | null> {
  const playlistGameRepository = AppDataSource.getRepository(PlaylistGame);
  const playlistGame = await findPlaylistGame(playlistId, gameId);
  if (playlistGame) {
    onDidRemovePlaylistGame.fire(playlistGame);
    await playlistGameRepository.remove(playlistGame);

    const playlistRepository = AppDataSource.getRepository(Playlist);
    const playlist = await playlistRepository.findOneBy({ id: playlistId });
    if (playlist) {
      onDidUpdatePlaylist.fire({ oldPlaylist: playlist, newPlaylist: playlist });
    }
  }
  return null;
}

/**
 * Adds a Game to the end of a Playlist
 *
 * @param playlistId Playlist ID to add to
 * @param gameId ID of Game to add
 */
export async function addPlaylistGame(playlistId: string, gameId: string): Promise<void> {
  const repository = AppDataSource.getRepository(PlaylistGame);

  const duplicate = await repository.createQueryBuilder()
  .where('playlistId = :playlistId', { playlistId })
  .andWhere('gameId = :gameId', { gameId })
  .getOne();

  if (duplicate) { return; }

  const highestOrder = await repository.createQueryBuilder('pg')
  .where('pg.playlistId = :playlistId', { playlistId })
  .orderBy('pg.order', 'DESC')
  .select('pg.order')
  .getOne();

  const pg = await repository.save<PlaylistGame>({
    gameId: gameId,
    playlistId: playlistId,
    order: highestOrder ? highestOrder.order + 1 : 0,
    notes: '',
  });

  onDidUpdatePlaylistGame.fire({oldGame: pg, newGame: pg});
  const playlistRepository = AppDataSource.getRepository(Playlist);
  const playlist = await playlistRepository.findOneBy({ id: playlistId });
  if (playlist) {
    onDidUpdatePlaylist.fire({ oldPlaylist: playlist, newPlaylist: playlist });
  }

}

/**
 * Updates a Game on a Playlist.
 *
 * @param playlistGame Data to update
 */
export async function updatePlaylistGame(playlistGame: PlaylistGame): Promise<PlaylistGame> {
  const playlistGameRepository = AppDataSource.getRepository(PlaylistGame);
  const savedPlaylistGame = await playlistGameRepository.save(playlistGame);
  onDidUpdatePlaylistGame.fire({oldGame: playlistGame, newGame: savedPlaylistGame });

  const playlistRepository = AppDataSource.getRepository(Playlist);
  const playlist = await playlistRepository.findOneBy({ id: savedPlaylistGame.playlistId });
  if (playlist) {
    onDidUpdatePlaylist.fire({ oldPlaylist: playlist, newPlaylist: playlist });
  }

  return savedPlaylistGame;
}

/**
 * Updates a collection of Games in Playlists
 *
 * @param playlistGames List of data to update
 */
export async function updatePlaylistGames(playlistGames: PlaylistGame[]): Promise<void> {
  return AppDataSource.transaction(async transEntityManager => {
    for (const game of playlistGames) {
      await transEntityManager.save(PlaylistGame, game);
    }
  });
}

export async function findGamesWithTag(tag: Tag): Promise<Game[]> {
  const gameIds = (await AppDataSource.createQueryBuilder()
  .select('game_tag.gameId as gameId')
  .distinct()
  .from('game_tags_tag', 'game_tag')
  .where('game_tag.tagId = :id', { id: tag.id })
  .getRawMany()).map(g => g['gameId']);

  return chunkedFindByIds(gameIds);
}

async function chunkedFindByIds(gameIds: string[]): Promise<Game[]> {
  const gameRepository = AppDataSource.getRepository(Game);

  const chunks = chunkArray(gameIds, 100);
  let gamesFound: Game[] = [];
  for (const chunk of chunks) {
    gamesFound = gamesFound.concat(await gameRepository.findBy({ id: In(chunk) }));
  }

  return gamesFound;
}

function applyFlatGameFilters(alias: string, query: SelectQueryBuilder<Game>, filterOpts: FilterGameOpts, whereCount: number): number {
  if (filterOpts) {
    // Search results
    if (filterOpts.searchQuery) {
      const searchQuery = filterOpts.searchQuery;
      const flatGameFieldObjs = Object.values(flatGameFields);
      // Whitelists are often more restrictive, do these first
      for (const filter of searchQuery.whitelist) {
        if (flatGameFieldObjs.includes(filter.field)) {
          doWhereField(alias, query, filter.field, filter.value, whereCount, true);
          whereCount++;
        }
      }
      for (const filter of searchQuery.blacklist) {
        if (flatGameFieldObjs.includes(filter.field)) {
          doWhereField(alias, query, filter.field, filter.value, whereCount, false);
          whereCount++;
        }
      }
      for (const phrase of searchQuery.genericWhitelist) {
        doWhereTitle(alias, query, phrase, whereCount, true);
        whereCount++;
      }
      for (const phrase of searchQuery.genericBlacklist) {
        doWhereTitle(alias, query, phrase, whereCount, false);
        whereCount++;
      }
    }
  }
  return whereCount;
}

function doWhereTitle(alias: string, query: SelectQueryBuilder<Game>, value: string, count: number, whitelist: boolean): void {
  validateSqlName(alias);

  const formedValue = '%' + value + '%';
  let comparator: string;
  if (whitelist) { comparator = 'like'; }
  else           { comparator = 'not like'; }

  // console.log(`W: ${count} - C: ${comparator} - F: GENERIC - V:${value}`);

  const and = (count !== 0);

  const where = new Brackets(qb => {
    const q = and ? qb : query;
    const ref = `generic_${count}`;
    q.where(  `${alias}.title ${comparator} :${ref}`,           { [ref]: formedValue });
    q.orWhere(`${alias}.alternateTitles ${comparator} :${ref}`, { [ref]: formedValue });
    q.orWhere(`${alias}.developer ${comparator} :${ref}`,       { [ref]: formedValue });
    q.orWhere(`${alias}.publisher ${comparator} :${ref}`,       { [ref]: formedValue });
  });

  if (and) {
    query.andWhere(where);
  } else {
    query.where(where);
  }
}

function doWhereField(alias: string, query: SelectQueryBuilder<Game>, field: string, value: any, count: number, whitelist: boolean) {
  // Create comparator
  const typing = typeof value;
  const exact = !(typing === 'string') || exactFields.includes(field);
  let comparator: string;
  if (!exact && value.length != '') {
    if (whitelist) { comparator = 'like'; }
    else           { comparator = 'not like'; }
  } else {
    if (whitelist) { comparator = '=';  }
    else           { comparator = '!='; }
  }

  // Create formed value
  let formedValue: any = value;
  if (!exact && value.length != '') {
    formedValue = '%' + value + '%';
  }

  // console.log(`W: ${count} - C: ${comparator} - F: ${field} - V:${value}`);
  // Do correct 'where' call
  const ref = `field_${count}`;
  if (count === 0) {
    query.where(`${alias}.${field} ${comparator} :${ref}`, { [ref]: formedValue });
  } else {
    query.andWhere(`${alias}.${field} ${comparator} :${ref}`, { [ref]: formedValue });
  }
}

async function applyTagFilters(aliases: string[], alias: string, query: SelectQueryBuilder<Game>, whereCount: number, whitelist: boolean) {
  validateSqlName(alias);

  const tagAliasRepository = AppDataSource.getRepository(TagAlias);
  const comparator = whitelist ? 'IN' : 'NOT IN';
  const aliasKey = `${whitelist ? 'whitelist_' : 'blacklist_'}${whereCount}`;

  const tagIdQuery = tagAliasRepository.createQueryBuilder('tag_alias')
  .where(`tag_alias.name IN (:...${aliasKey})`, { [aliasKey]: aliases })
  .select('tag_alias.tagId')
  .distinct();

  let subQueryTwo = undefined;
  if (whitelist) {
    subQueryTwo = AppDataSource.createQueryBuilder()
    .select('game_tag.gameId, COUNT(*) as count')
    .from('game_tags_tag', 'game_tag')
    .where(`game_tag.tagId IN (${tagIdQuery.getQuery()})`)
    .groupBy('game_tag.gameId');
  }

  let subQuery = AppDataSource.createQueryBuilder()
  .select('game_tag.gameId')
  .distinct();

  if (subQueryTwo) {
    subQuery = subQuery.from(`(${subQueryTwo.getQuery()})`, 'game_tag')
    .where(`game_tag.count == ${aliases.length}`);
  } else {
    subQuery = subQuery.from('game_tags_tag', 'game_tag')
    .where(`game_tag.tagId IN (${tagIdQuery.getQuery()})`);
  }

  query.andWhere(`${alias}.id ${comparator} (${subQuery.getQuery()})`);
  query.setParameters(subQuery.getParameters());
  query.setParameters(tagIdQuery.getParameters());
  if (subQueryTwo) {
    query.setParameters(subQueryTwo.getParameters());
  }
}

async function getGameQuery(
  alias: string, filterOpts?: FilterGameOpts, orderBy?: GameOrderBy, direction?: GameOrderReverse, offset?: number, limit?: number, index?: PageTuple
): Promise<SelectQueryBuilder<Game>> {
  validateSqlName(alias);
  if (orderBy) { validateSqlName(orderBy); }
  if (direction) { validateSqlOrder(direction); }

  let whereCount = 0;

  const query = AppDataSource.getRepository(Game).createQueryBuilder(alias);

  // Use Page Index if available (ignored for Playlists)
  if ((!filterOpts || !filterOpts.playlistId) && index) {
    const comparator = direction === 'ASC' ? '>' : '<';
    if (!orderBy) { throw new Error('Failed to get game query. "index" is set but "orderBy" is missing.'); }
    query.where(`(${alias}.${orderBy}, ${alias}.title, ${alias}.id) ${comparator} (:orderVal, :title, :id)`, { orderVal: index.orderVal, title: index.title, id: index.id });
    whereCount++;
  }
  // Apply all flat game filters
  if (filterOpts) {
    whereCount = applyFlatGameFilters(alias, query, filterOpts, whereCount);
  }

  // Order By + Limit
  if (orderBy) { query.orderBy(`${alias}.${orderBy} ${direction}, ${alias}.title`, direction); }
  if (!index && offset) { query.skip(offset); }
  if (limit) { query.take(limit); }
  // Playlist filtering
  if (filterOpts && filterOpts.playlistId) {
    query.innerJoin(PlaylistGame, 'pg', `pg.gameId = ${alias}.id`);
    query.orderBy('pg.order', 'ASC');
    if (whereCount === 0) { query.where('pg.playlistId = :playlistId', { playlistId: filterOpts.playlistId }); }
    else                  { query.andWhere('pg.playlistId = :playlistId', { playlistId: filterOpts.playlistId }); }
    query.skip(offset); // TODO: Why doesn't offset work here?
  }
  // Tag filtering
  if (filterOpts && filterOpts.searchQuery) {
    const aliasWhitelist = filterOpts.searchQuery.whitelist.filter(f => f.field === 'tag').map(f => f.value);
    const aliasBlacklist = filterOpts.searchQuery.blacklist.filter(f => f.field === 'tag').map(f => f.value);

    if (aliasWhitelist.length > 0) {
      await applyTagFilters(aliasWhitelist, alias, query, whereCount, true);
      whereCount++;
    }
    if (aliasBlacklist.length > 0) {
      await applyTagFilters(aliasBlacklist, alias, query, whereCount, false);
      whereCount++;
    }
  }

  return query;
}
