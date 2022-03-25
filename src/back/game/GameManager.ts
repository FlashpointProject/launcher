import { ApiEmitter } from '@back/extensions/ApiEmitter';
import { chunkArray } from '@back/util/misc';
import { validateSqlName, validateSqlOrder } from '@back/util/sql';
import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { Tag } from '@database/entity/Tag';
import { TagAlias } from '@database/entity/TagAlias';
import { PageKeyset, PageTuple, RequestGameRange, ResponseGameRange, ViewGame } from '@shared/back/types';
import { VIEW_PAGE_SIZE } from '@shared/constants';
import { FilterGameOpts } from '@shared/game/GameFilter';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { tagSort } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import * as fs from 'fs';
import * as path from 'path';
import * as TagManager from './TagManager';
import { Brackets, FindOneOptions, getManager, SelectQueryBuilder, IsNull } from 'typeorm';
import * as GameDataManager from './GameDataManager';
import { isNull, isNullOrUndefined } from 'util';

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
  const gameRepository = getManager().getRepository(Game);
  return gameRepository.count({ parentGameId: IsNull() });
}

/** Find the game with the specified ID. Ardil TODO find refs*/
export async function findGame(id?: string, filter?: FindOneOptions<Game>): Promise<Game | undefined> {
  if (id || filter) {
    const gameRepository = getManager().getRepository(Game);
    const game = await gameRepository.findOne(id, filter);
    if (game) {
      game.tags.sort(tagSort);
    }
    return game;
  }
}
/** Get the row number of an entry, specified by its gameId. */
export async function findGameRow(gameId: string, filterOpts?: FilterGameOpts, orderBy?: GameOrderBy, direction?: GameOrderReverse, index?: PageTuple): Promise<number> {
  if (orderBy) { validateSqlName(orderBy); }
  log.debug('GameManager', 'findGameRow');

  // const startTime = Date.now();
  const gameRepository = getManager().getRepository(Game);

  const subQ = gameRepository.createQueryBuilder('game')
  .select(`game.id, row_number() over (order by game.${orderBy}) row_num, game.parentGameId`)
  .where("game.parentGameId IS NULL");
  if (index) {
    if (!orderBy) { throw new Error('Failed to get game row. "index" is set but "orderBy" is missing.'); }
    subQ.andWhere(`(game.${orderBy}, game.id) > (:orderVal, :id)`, { orderVal: index.orderVal, id: index.id });
  }
  if (filterOpts) {
    // The "whereCount" param doesn't make much sense now, TODO change it.
    applyFlatGameFilters('game', subQ, filterOpts, index ? 2 : 1);
  }
  if (orderBy) { subQ.orderBy(`game.${orderBy}`, direction); }

  const query = getManager().createQueryBuilder()
  .setParameters(subQ.getParameters())
  .select('row_num')
  .from('(' + subQ.getQuery() + ')', 'g')
  .where('g.id = :gameId', { gameId: gameId })
  // Shouldn't be needed, but doing it anyway.
  .andWhere('g.parentGameId IS NULL');

  const raw = await query.getRawOne();
  // console.log(`${Date.now() - startTime}ms for row`);
  return raw ? Coerce.num(raw.row_num) : -1; // Coerce it, even though it is probably of type number or undefined
}
/**
 * Randomly selects a number of games from the database
 * @param count The number of games to find.
 * @param broken Whether to include broken games.
 * @param excludedLibraries A list of libraries to exclude.
 * @param flatFilters A set of filters on tags.
 * @returns A ViewGame[] representing the results.
 */
export async function findRandomGames(count: number, broken: boolean, excludedLibraries: string[], flatFilters: string[]): Promise<ViewGame[]> {
  const gameRepository = getManager().getRepository(Game);
  const query = gameRepository.createQueryBuilder('game');
  query.select('game.id, game.title, game.platform, game.developer, game.publisher, game.tagsStr');
  query.where("game.parentGameId IS NULL");
  if (!broken)  { query.andWhere('broken = false');  }
  if (excludedLibraries.length > 0) {
    query.andWhere('library NOT IN (:...libs)', { libs: excludedLibraries });
  }
  if (flatFilters.length > 0) {
    const tagIdQuery = TagManager.getFilterIDsQuery(flatFilters);
    const excludedGameIdQuery = getManager().createQueryBuilder()
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
  subQ.select(`sub.${orderBy}, sub.title, sub.id, sub.parentGameId, case row_number() over(order by sub.${orderBy} ${direction}, sub.title ${direction}, sub.id) % ${VIEW_PAGE_SIZE} when 0 then 1 else 0 end page_boundary`);
  subQ.orderBy(`sub.${orderBy} ${direction}, sub.title`, direction);

  let query = getManager().createQueryBuilder()
  .select(`g.${orderBy}, g.title, g.id, row_number() over(order by g.${orderBy} ${direction}, g.title ${direction}) + 1 page_number`)
  .from('(' + subQ.getQuery() + ')', 'g')
  .where('g.page_boundary = 1')
  .andWhere('g.parentGameId is null')
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
  query = getManager().createQueryBuilder()
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
  let i = 0;
  while (i < total) {
    if (keyset[i]) {
      // @ts-ignore
      log.debug('GameManager', keyset[i].title);
      i = total;
    }
    i++;
  }

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
  const gameRepository = getManager().getRepository(Game);
  return gameRepository.find({parentGameId: IsNull()});
}

/** Search the database for games. */
export async function findGames<T extends boolean>(opts: FindGamesOpts, shallow: T): Promise<Array<ResponseGameRange<T>>> {
  const ranges = opts.ranges || [{ start: 0, length: undefined }];
  const rangesOut: ResponseGameRange<T>[] = [];

  console.log('FindGames:');

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

export async function findPlatformAppPaths(platform: string): Promise<string[]> {
  const gameRepository = getManager().getRepository(Game);
  const values = await gameRepository.createQueryBuilder('game')
  .select('game.applicationPath')
  .distinct()
  .where('game.platform = :platform', {platform: platform})
  .andWhere("game.parentGameId IS NULL")
  .groupBy('game.applicationPath')
  .orderBy('COUNT(*)', 'DESC')
  .getRawMany();
  return Coerce.strArray(values.map(v => v['game_applicationPath']));
}

export async function findUniqueValues(entity: any, column: string): Promise<string[]> {
  validateSqlName(column);

  const repository = getManager().getRepository(entity);
  const values = await repository.createQueryBuilder('entity')
  .select(`entity.${column}`)
  .distinct()
  .getRawMany();
  return Coerce.strArray(values.map(v => v[`entity_${column}`]));
}

export async function findUniqueValuesInOrder(entity: any, column: string): Promise<string[]> {
  validateSqlName(column);

  const repository = getManager().getRepository(entity);
  const values = await repository.createQueryBuilder('entity')
  .select(`entity.${column}`)
  .distinct()
  .getRawMany();
  return Coerce.strArray(values.map(v => v[`entity_${column}`]));
}

export async function findPlatforms(library: string): Promise<string[]> {
  const gameRepository = getManager().getRepository(Game);
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
    await getManager().transaction(async transEntityManager => {
      for (const game of chunk) {
        await transEntityManager.save(Game, game);
      }
    });
  }
}

export async function save(game: Game): Promise<Game> {
  const gameRepository = getManager().getRepository(Game);
  log.debug('Launcher', 'Saving game...');
  const savedGame = await gameRepository.save(game);
  if (savedGame) { onDidUpdateGame.fire({oldGame: game, newGame: savedGame}); }
  return savedGame;
}

// Ardil TODO fix this.
export async function removeGameAndChildren(gameId: string, dataPacksFolderPath: string): Promise<Game | undefined> {
  const gameRepository = getManager().getRepository(Game);
  //const addAppRepository = getManager().getRepository(AdditionalApp);
  const game = await findGame(gameId);
  if (game) {
    // Delete GameData
    for (const gameData of (await GameDataManager.findGameData(game.id))) {
      if (gameData.presentOnDisk && gameData.path) {
        await fs.promises.unlink(path.join(dataPacksFolderPath, gameData.path));
      }
      await GameDataManager.remove(gameData.id);
    }
    // Delete children
    // Ardil TODO do Seirade's suggestion.
    for (const child of game.children) {
      await gameRepository.remove(child);
    }
    // Delete Game
    await gameRepository.remove(game);
    onDidRemoveGame.fire(game);
  }
  return game;
}

export async function findPlaylist(playlistId: string, join?: boolean): Promise<Playlist | undefined> {
  const opts: FindOneOptions<Playlist> = join ? { relations: ['games'] } : {};
  const playlistRepository = getManager().getRepository(Playlist);
  return playlistRepository.findOne(playlistId, opts);
}

export async function findPlaylistByName(playlistName: string, join?: boolean): Promise<Playlist | undefined> {
  const opts: FindOneOptions<Playlist> = join ? {
    relations: ['games'],
    where: {
      title: playlistName
    }
  } : {};
  const playlistRepository = getManager().getRepository(Playlist);
  return playlistRepository.findOne(opts);
}

/** Find playlists given a filter. @TODO filter */
export async function findPlaylists(showExtreme: boolean): Promise<Playlist[]> {
  const playlistRepository = getManager().getRepository(Playlist);
  if (showExtreme) {
    return await playlistRepository.find();
  } else {
    return await playlistRepository.find({ where: { extreme: false }});
  }
}

/** Removes a playlist */
export async function removePlaylist(playlistId: string): Promise<Playlist | undefined> {
  const playlistRepository = getManager().getRepository(Playlist);
  const playlistGameRepository = getManager().getRepository(PlaylistGame);
  const playlist = await findPlaylist(playlistId);
  if (playlist) {
    await playlistGameRepository.delete({ playlistId: playlist.id });
    return playlistRepository.remove(playlist);
  }
}
/** Updates a playlist */
export async function updatePlaylist(playlist: Playlist): Promise<Playlist> {
  const playlistRepository = getManager().getRepository(Playlist);
  const savedPlaylist = await playlistRepository.save(playlist);
  if (savedPlaylist) { onDidUpdatePlaylist.fire({oldPlaylist: playlist, newPlaylist: savedPlaylist}); }
  return savedPlaylist;
}

/** Finds a Playlist Game */
export async function findPlaylistGame(playlistId: string, gameId: string): Promise<PlaylistGame | undefined> {
  const playlistGameRepository = getManager().getRepository(PlaylistGame);
  return await playlistGameRepository.findOne({
    where: {
      gameId: gameId,
      playlistId: playlistId
    }
  });
}

/** Removes a Playlist Game */
export async function removePlaylistGame(playlistId: string, gameId: string): Promise<PlaylistGame | undefined> {
  const playlistGameRepository = getManager().getRepository(PlaylistGame);
  const playlistGame = await findPlaylistGame(playlistId, gameId);
  if (playlistGame) {
    onDidRemovePlaylistGame.fire(playlistGame);
    return playlistGameRepository.remove(playlistGame);
  }
}

/** Adds a new Playlist Game (to the end of the playlist). */
export async function addPlaylistGame(playlistId: string, gameId: string): Promise<void> {
  const repository = getManager().getRepository(PlaylistGame);

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

  await repository.save<PlaylistGame>({
    gameId: gameId,
    playlistId: playlistId,
    order: highestOrder ? highestOrder.order + 1 : 0,
    notes: '',
  });
}

/** Updates a Playlist Game */
export async function updatePlaylistGame(playlistGame: PlaylistGame): Promise<PlaylistGame> {
  const playlistGameRepository = getManager().getRepository(PlaylistGame);
  const savedPlaylistGame = await playlistGameRepository.save(playlistGame);
  if (savedPlaylistGame) { onDidUpdatePlaylistGame.fire({oldGame: playlistGame, newGame: savedPlaylistGame }); }
  return savedPlaylistGame;
}

/** Updates a collection of Playlist Games */
export async function updatePlaylistGames(playlistGames: PlaylistGame[]): Promise<void> {
  return getManager().transaction(async transEntityManager => {
    for (const game of playlistGames) {
      await transEntityManager.save(PlaylistGame, game);
    }
  });
}

export async function findGamesWithTag(tag: Tag): Promise<Game[]> {
  const gameIds = (await getManager().createQueryBuilder()
  .select('game_tag.gameId as gameId')
  .distinct()
  .from('game_tags_tag', 'game_tag')
  .where('game_tag.tagId = :id', { id: tag.id })
  .getRawMany()).map(g => g['gameId']);

  return chunkedFindByIds(gameIds);
}

async function chunkedFindByIds(gameIds: string[]): Promise<Game[]> {
  const gameRepository = getManager().getRepository(Game);

  const chunks = chunkArray(gameIds, 100);
  let gamesFound: Game[] = [];
  for (const chunk of chunks) {
    gamesFound = gamesFound.concat(await gameRepository.findByIds(chunk, {parentGameId: IsNull()}));
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
        log.debug("GameManager", `Whitelist title string: ${phrase}`);
        whereCount++;
      }
      for (const phrase of searchQuery.genericBlacklist) {
        doWhereTitle(alias, query, phrase, whereCount, false);
        log.debug("GameManager", `Blacklist title string: ${phrase}`);
        whereCount++;
      }
    }
  }
  return whereCount;
}

/**
 * Add a position-independent search term (whitelist or blacklist) in or'd WHERE clauses on title, alternateTitles,
 * developer, and publisher.
 */
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

/**
 * Add a search term in a WHERE clause on the given field to a selectquerybuilder.
 * @param alias The name of the table.
 * @param query The query to add to.
 * @param field The field (column) to search on.
 * @param value The value to search for. If it's a string, it will be interpreted as position-independent 
 * if the field is not on the exactFields list.
 * @param count How many conditions we've already filtered. Determines whether we use .where() or .andWhere().
 * @param whitelist Whether this is a whitelist or a blacklist search.
 */
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

  const tagAliasRepository = getManager().getRepository(TagAlias);
  const comparator = whitelist ? 'IN' : 'NOT IN';
  const aliasKey = `${whitelist ? 'whitelist_' : 'blacklist_'}${whereCount}`;

  const tagIdQuery = tagAliasRepository.createQueryBuilder('tag_alias')
  .where(`tag_alias.name IN (:...${aliasKey})`, { [aliasKey]: aliases })
  .select('tag_alias.tagId')
  .distinct();

  const subQuery = getManager().createQueryBuilder()
  .select('game_tag.gameId')
  .distinct()
  .from('game_tags_tag', 'game_tag')
  .where(`game_tag.tagId IN (${tagIdQuery.getQuery()})`);

  query.andWhere(`${alias}.id ${comparator} (${subQuery.getQuery()})`);
  query.setParameters(subQuery.getParameters());
  query.setParameters(tagIdQuery.getParameters());
}

async function getGameQuery(
  alias: string, filterOpts?: FilterGameOpts, orderBy?: GameOrderBy, direction?: GameOrderReverse, offset?: number, limit?: number, index?: PageTuple
): Promise<SelectQueryBuilder<Game>> {
  validateSqlName(alias);
  log.debug('GameManager', 'getGameQuery');
  if (orderBy) { validateSqlName(orderBy); }
  if (direction) { validateSqlOrder(direction); }

  let whereCount = 0;

  const query = getManager().getRepository(Game).createQueryBuilder(alias);

  // Use Page Index if available (ignored for Playlists)
  if ((!filterOpts || !filterOpts.playlistId) && index) {
    const comparator = direction === 'ASC' ? '>' : '<';
    if (!orderBy) { throw new Error('Failed to get game query. "index" is set but "orderBy" is missing.'); }
    query.where(`(${alias}.${orderBy}, ${alias}.title, ${alias}.id) ${comparator} (:orderVal, :title, :id)`, { orderVal: index.orderVal, title: index.title, id: index.id });
    whereCount++;
  }
  if (whereCount === 0) {
    query.where('parentGameId IS NULL');
  } else {
    query.andWhere('parentGameId IS NULL');
  }
  whereCount++;
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
    whereCount++;
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
