import { chunkArray } from '@back/util/misc';
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
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { Coerce } from '@shared/utils/Coerce';
import { Brackets, FindOneOptions, getManager, SelectQueryBuilder } from 'typeorm';

const exactFields = [ 'broken', 'extreme', 'library' ];
enum flatGameFields {
  'id', 'title', 'alternateTitles', 'developer', 'publisher', 'dateAdded', 'dateModified', 'series',
  'platform', 'broken', 'extreme', 'playMode', 'status', 'notes', 'source', 'applicationPath', 'launchCommand', 'releaseDate',
  'version', 'originalDescription', 'language', 'library'
}

export namespace GameManager {
  export async function countGames(): Promise<number> {
    const gameRepository = getManager().getRepository(Game);
    return gameRepository.count();
  }

  /** Find the game with the specified ID. */
  export async function findGame(id?: string, filter?: FindOneOptions<Game>): Promise<Game | undefined> {
    if (id || filter) {
      const gameRepository = getManager().getRepository(Game);
      const game = await gameRepository.findOne(id, filter);
      if (game) {
        game.tags.sort((tagA, tagB) => {
          const catIdA = tagA.category ? tagA.category.id : tagA.categoryId;
          const catIdB = tagB.category ? tagB.category.id : tagB.categoryId;
          if (catIdA && catIdB) {
            if (catIdA > catIdB) { return 1;  }
            if (catIdB > catIdA) { return -1; }
          }
          if (tagA.primaryAlias.name > tagB.primaryAlias.name) { return 1;  }
          if (tagB.primaryAlias.name > tagA.primaryAlias.name) { return -1; }
          return 0;
        });
      }
      return game;
    }
  }

  export async function findGameRow(gameId: string, filterOpts?: FilterGameOpts, orderBy?: GameOrderBy, direction?: GameOrderReverse, index?: PageTuple): Promise<number> {
    if (orderBy) { validateSqlName(orderBy); }

    const startTime = Date.now();
    const gameRepository = getManager().getRepository(Game);

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

    const query = getManager().createQueryBuilder()
      .setParameters(subQ.getParameters())
      .select('row_num')
      .from('(' + subQ.getQuery() + ')', 'g')
      .where('g.id = :gameId', { gameId: gameId });

    const raw = await query.getRawOne();
    // console.log(`${Date.now() - startTime}ms for row`);
    return raw ? Coerce.num(raw.row_num) : -1; // Coerce it, even though it is probably of type number or undefined
  }

  export async function findRandomGames(count: number, extreme: boolean, broken: boolean): Promise<Game[]> {
    const gameRepository = getManager().getRepository(Game);
    const query = gameRepository.createQueryBuilder('game');
    if (!extreme) { query.andWhere('extreme = false'); }
    if (!broken)  { query.andWhere('broken = false');  }
    query.orderBy('RANDOM()').take(count);
    return query.getMany();
  }

  export type GetPageKeysetResult = {
    keyset: PageKeyset;
    total: number;
  }

  export async function findGamePageKeyset(filterOpts: FilterGameOpts, orderBy: GameOrderBy, direction: GameOrderReverse): Promise<GetPageKeysetResult> {
    let startTime = Date.now();

    validateSqlName(orderBy);
    validateSqlOrder(direction);

    // console.log('FindGamePageKeyset:');

    const subQ = await getGameQuery('sub', filterOpts, orderBy, direction);
    subQ.select(`sub.${orderBy}, sub.title, sub.id, case row_number() over(order by sub.${orderBy} ${direction}, sub.title ${direction}, sub.id) % ${VIEW_PAGE_SIZE} when 0 then 1 else 0 end page_boundary`);
    subQ.orderBy(`sub.${orderBy} ${direction}, sub.title`, direction);

    let query = getManager().createQueryBuilder()
      .select(`g.${orderBy}, g.title, g.id, row_number() over(order by g.${orderBy} ${direction}, g.title ${direction}) + 1 page_number`)
      .from('(' + subQ.getQuery() + ')', 'g')
      .where('g.page_boundary = 1')
      .setParameters(subQ.getParameters());

    const raw = await query.getRawMany();
    const keyset: PageKeyset = {};
    for (let r of raw) {
      keyset[r['page_number']] = {orderVal: Coerce.str(r[orderBy]), title: Coerce.str(r['title']), id: Coerce.str(r['id'])};
    }

    // console.log(`  Keyset: ${Date.now() - startTime}ms`);

    // Count games
    let total = -1;
    startTime = Date.now();
    query = await getGameQuery('sub', filterOpts, orderBy, direction, 0, undefined, undefined);

    query.skip(0);
    query.select('COUNT(*)');
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

  /** Search the database for games. */
  export async function findGames<T extends boolean>(opts: FindGamesOpts, shallow: T): Promise<ResponseGameRange<T>[]> {
    const ranges = opts.ranges || [{ start: 0, length: undefined }];
    const rangesOut: ResponseGameRange<T>[] = [];

    // console.log('FindGames:');

    let query: SelectQueryBuilder<Game> | undefined;
    for (let i = 0; i < ranges.length; i++) {
      const startTime = Date.now();

      const range = ranges[i];
      query = await getGameQuery('game', opts.filter, opts.orderBy, opts.direction, range.start, range.length, range.index);

      // Select games
      // @TODO Make it infer the type of T from the value of "shallow", and then use that to make "games" get the correct type, somehow?
      // @PERF When multiple pages are requested as individual ranges, select all of them with a single query then split them up
      rangesOut.push({
        start: range.start,
        length: range.length,
        games: ((shallow)
          ? (await query.select('game.id, game.title, game.platform, game.developer, game.publisher').getRawMany()) as ViewGame[]
          : await query.getMany()
        ) as (T extends true ? ViewGame[] : Game[]),
      });

      // console.log(`  Query: ${Date.now() - startTime}ms (start: ${range.start}, length: ${range.length}${range.index ? ', with index' : ''})`);
    }

    return rangesOut;
  }

  async function getGameQuery(
    alias: string, filterOpts?: FilterGameOpts, orderBy?: GameOrderBy, direction?: GameOrderReverse, offset?: number, limit?: number, index?: PageTuple
  ): Promise<SelectQueryBuilder<Game>> {
    validateSqlName(alias);
    if (orderBy) { validateSqlName(orderBy); }
    if (direction) { validateSqlOrder(direction); }

    let whereCount = 0;

    const query = getManager().getRepository(Game).createQueryBuilder(alias);

    // Use Page Index (If Given)
    if (index) {
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
      query.orderBy('pg.order');
      if (whereCount === 0) { query.where('pg.playlistId = :playlistId', { playlistId: filterOpts.playlistId }); }
      else                  { query.andWhere('pg.playlistId = :playlistId', { playlistId: filterOpts.playlistId }); }
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

  /** Find an add apps with the specified ID. */
  export async function findAddApp(id?: string, filter?: FindOneOptions<AdditionalApp>): Promise<AdditionalApp | undefined> {
    if (id || filter) {
      const addAppRepository = getManager().getRepository(AdditionalApp);
      return addAppRepository.findOne(id, filter);
    }
  }

  export async function findPlatformAppPaths(platform: string): Promise<string[]> {
    const gameRepository = getManager().getRepository(Game);
    const values = await gameRepository.createQueryBuilder('game')
      .select('game.applicationPath')
      .distinct()
      .where('game.platform = :platform', {platform: platform})
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
    for (let chunk of chunks) {
      await getManager().transaction(async transEntityManager => {
        for (let game of chunk) {
          await transEntityManager.save(Game, game);
        }
      });
    }
  }

  export async function updateGame(game: Game): Promise<Game> {
    const gameRepository = getManager().getRepository(Game);
    return gameRepository.save(game);
  }

  export async function removeGameAndAddApps(gameId: string): Promise<Game | undefined> {
    const gameRepository = getManager().getRepository(Game);
    const addAppRepository = getManager().getRepository(AdditionalApp);
    const game = await GameManager.findGame(gameId);
    if (game) {
      for (let addApp of game.addApps) {
        await addAppRepository.remove(addApp);
      }
      await gameRepository.remove(game);
    }
    return game;
  }

  export async function findPlaylist(playlistId: string, join?: boolean): Promise<Playlist | undefined> {
    const opts: FindOneOptions<Playlist> = join ? { relations: ['games'] } : {};
    const playlistRepository = getManager().getRepository(Playlist);
    return playlistRepository.findOne(playlistId, opts);
  }

  /** Find playlists given a filter. @TODO filter */
  export async function findPlaylists(): Promise<Playlist[]> {
    const playlistRepository = getManager().getRepository(Playlist);
    return await playlistRepository.find();
  }

  /** Removes a playlist */
  export async function removePlaylist(playlistId: string): Promise<Playlist | undefined> {
    const playlistRepository = getManager().getRepository(Playlist);
    const playlistGameRepository = getManager().getRepository(PlaylistGame);
    const playlist = await GameManager.findPlaylist(playlistId, true);
    if (playlist) {
      for (let game of playlist.games) {
        await playlistGameRepository.remove(game);
      }
      playlist.games = [];
      return playlistRepository.remove(playlist);
    }
  }

  /** Updates a playlist */
  export async function updatePlaylist(playlist: Playlist): Promise<Playlist> {
    const playlistRepository = getManager().getRepository(Playlist);
    return playlistRepository.save(playlist);
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
      return playlistGameRepository.remove(playlistGame);
    }
  }

  /** Updates a Playlist Game */
  export async function updatePlaylistGame(playlistGame: PlaylistGame): Promise<PlaylistGame> {
    const playlistGameRepository = getManager().getRepository(PlaylistGame);
    return playlistGameRepository.save(playlistGame);
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
}

async function chunkedFindByIds(gameIds: string[]): Promise<Game[]> {
  const gameRepository = getManager().getRepository(Game);

  const chunks = chunkArray(gameIds, 100);
  const gamesFound: Game[] = [];
  for (const chunk of chunks) {
    gamesFound.concat(await gameRepository.findByIds(chunk));
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
      for (let filter of searchQuery.whitelist) {
        if (flatGameFieldObjs.includes(filter.field)) {
          doWhereField(alias, query, filter.field, filter.value, whereCount, true);
          whereCount++;
        }
      }
      for (let filter of searchQuery.blacklist) {
        if (flatGameFieldObjs.includes(filter.field)) {
          doWhereField(alias, query, filter.field, filter.value, whereCount, false);
          whereCount++;
        }
      }
      for (let phrase of searchQuery.genericWhitelist) {
        doWhereTitle(alias, query, phrase, whereCount, true);
        whereCount++;
      }
      for (let phrase of searchQuery.genericBlacklist) {
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
    const ref = `generic-${count}`;
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
  const ref = `field-${count}`;
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

  const tagIds = (await tagAliasRepository.createQueryBuilder('tag_alias')
    .where('tag_alias.name IN (:...aliases)', { aliases: aliases })
    .select('tag_alias.tagId')
    .distinct()
    .getRawMany()).map(r => r['tag_alias_tagId']);

  for (let i = 0; i < tagIds.length; i++) {
    const filterName = `tag_filter_${whereCount}_${i}`;

    const tagId = tagIds[i];
    const subQuery = getManager().createQueryBuilder()
      .select('game_tag.gameId')
      .distinct()
      .from('game_tags_tag', 'game_tag')
      .where(`game_tag.tagId = :${filterName}`, { [filterName]: tagId });
    if (whereCount == 0 && i == 0) {
      query.where(`${alias}.id ${comparator} (${subQuery.getQuery()})`);
      query.setParameters(subQuery.getParameters());
    } else {
      query.andWhere(`${alias}.id ${comparator} (${subQuery.getQuery()})`);
      query.setParameters(subQuery.getParameters());
    }
  }
}
