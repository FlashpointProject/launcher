import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { FilterGameOpts } from '@shared/game/GameFilter';
import { ArgumentTypesOf } from '@shared/interfaces';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { Coerce } from '@shared/utils/Coerce';
import { Brackets, FindOneOptions, getManager, SelectQueryBuilder } from 'typeorm';

export namespace GameManager {
  export type GameResults = {
    games: Game[],
    total?: number
  }

  export async function countGames(): Promise<number> {
    const gameRepository = getManager().getRepository(Game);
    return gameRepository.count();
  }

  /** Find the game with the specified ID. */
  export async function findGame(id?: string, filter?: FindOneOptions<Game>): Promise<Game | undefined> {
    if (id || filter) {
      const gameRepository = getManager().getRepository(Game);
      return gameRepository.findOne(id);
    }
  }

  export async function findGameIndex(gameId: string, ...args: FindGameParams) {
    const result = await findGames(...args);
    return result.games.findIndex(g => g.id === gameId);
  }

  type FindGameParams = ArgumentTypesOf<typeof findGames>;
  /** Find the game with the specified ID. */
  export async function findGames(filterOpts?: FilterGameOpts, orderBy?: GameOrderBy, direction?: GameOrderReverse,
                                  offset?: number, limit?: number, shallow?: boolean, getTotal?: boolean): Promise<GameResults> {
    // Skips opts when returning a playlist
    // @TODO Properly select from playlists
    const gameRepository = getManager().getRepository(Game);
    const query = gameRepository.createQueryBuilder('game');

    if (filterOpts) {
      // Playlist results
      if (filterOpts.playlistId) {
        if (filterOpts.playlistId) {
          const playlistGames = await getManager().getRepository(PlaylistGame).find({ where: { playlistId: filterOpts.playlistId }});
          const games = await gameRepository.findByIds(playlistGames.map(g => g.gameId));
          return {games: games, total: games.length};
        }
      }
      // Search results
      if (filterOpts.searchQuery) {
        let whereCount = 0;
        const searchQuery = filterOpts.searchQuery;
        for (let filter of searchQuery.blacklist) {
          doWhereField(query, filter.field, filter.value, whereCount, false);
          whereCount++;
        }
        for (let filter of searchQuery.whitelist) {
          doWhereField(query, filter.field, filter.value, whereCount, true);
          whereCount++;
        }
        for (let phrase of searchQuery.genericBlacklist) {
          doWhereTitle(query, phrase, whereCount, false);
          whereCount++;
        }
        for (let phrase of searchQuery.genericWhitelist) {
          doWhereTitle(query, phrase, whereCount, true);
          whereCount++;
        }
      }
    }
    // Process rest of parameters
    if (orderBy) { query.orderBy(`game.${orderBy}`, direction); }
    if (offset)  { query.offset(offset); }
    if (limit)   { query.limit(limit); }
    // Subset of Game info, can be cast to ViewGame later
    // if (shallow) { query.select('game.id, game.title, game.platform, game.tags, game.developer, game.publisher'); }
    if (getTotal) {
      const results = await query.getManyAndCount();
      return { games: results[0], total: results[1] };
    } else {
      const games = await query.getMany();
      return { games };
    }
  }

  export type ViewGame = {
    id: string;
    title: string;
    platform: string;
    // List view only
    tags: string;
    developer: string;
    publisher: string;
  }

  /** Find an add apps with the specified ID. */
  export async function findAddApp(id?: string, filter?: FindOneOptions<AdditionalApp>): Promise<AdditionalApp | undefined> {
    if (id || filter) {
      const addAppRepository = getManager().getRepository(AdditionalApp);
      return addAppRepository.findOne(id, filter);
    }
  }

  export async function findLibraries(): Promise<string[]> {
    const gameRepository = getManager().getRepository(Game);
    const libraries = await gameRepository.createQueryBuilder('game')
      .select('game.library')
      .distinct()
      .getRawMany();
    return Coerce.strArray(libraries.map(l => l.game_library));
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
    const chunks = chunkArray(games, 1000);
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

  export async function removeGameAndAddApps(gameId: string): Promise<void> {
    const gameRepository = getManager().getRepository(Game);
    const addAppRepository = getManager().getRepository(AdditionalApp);
    const game = await GameManager.findGame(gameId);
    if (game) {
      for (let addApp of game.addApps) {
        await addAppRepository.remove(addApp);
      }
      await gameRepository.remove(game);
    }
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
}

function doWhereTitle(query: SelectQueryBuilder<Game>, value: string, count: number, whitelist: boolean) {
  const formedValue = '%' + value + '%';
  let comparator: string;
  if (whitelist) { comparator = 'like'; }
  else           { comparator = 'not like'; }

  console.log(`W: ${count} - F: generic - V: ${formedValue}`);

  const ref = `field-${count}`;
  if (count === 0) {
    query.where(`game.title ${comparator} :${ref}`,             { [ref]: formedValue });
    query.orWhere(`game.alternateTitles ${comparator} :${ref}`, { [ref]: formedValue });
    query.orWhere(`game.developer ${comparator} :${ref}`,       { [ref]: formedValue });
    query.orWhere(`game.publisher ${comparator} :${ref}`,       { [ref]: formedValue });
  } else {
    query.andWhere(new Brackets(qb => {
      qb.where(`game.title ${comparator} :${ref}`,             { [ref]: formedValue });
      qb.orWhere(`game.alternateTitles ${comparator} :${ref}`, { [ref]: formedValue });
      qb.orWhere(`game.developer ${comparator} :${ref}`,       { [ref]: formedValue });
      qb.orWhere(`game.publisher ${comparator} :${ref}`,       { [ref]: formedValue });
    }));
  }
}

function doWhereField(query: SelectQueryBuilder<Game>, field: keyof Game, value: any, count: number, whitelist: boolean) {
  // Create comparator
  const typing = typeof value;
  let comparator: string;
  if (typing === 'string' && value.length != '') {
    if (whitelist) { comparator = 'like'; }
    else           { comparator = 'not like'; }
  } else {
    if (whitelist) { comparator = '=';  }
    else           { comparator = '!='; }
  }

  // Create formed value
  let formedValue: any = value;
  if (typing === 'string' && value.length != '') {
    formedValue = '%' + value + '%';
  }

  console.log(`W: ${count} - F: ${field} - V: ${formedValue}`);
  // Do correct 'where' call
  const ref = `generic-${count}`;
  if (count === 0) {
    query.where(`game.${field} ${comparator} :${ref}`, { [ref]: formedValue });
  } else {
    query.andWhere(`game.${field} ${comparator} :${ref}`, { [ref]: formedValue });
  }
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  let chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}