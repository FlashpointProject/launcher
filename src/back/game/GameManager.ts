import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { FilterGameOpts } from '@shared/game/GameFilter';
import { Coerce } from '@shared/utils/Coerce';
import { FindOneOptions, getManager } from 'typeorm';

export namespace GameManager {

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

  /** Find the game with the specified ID. */
  export async function findGames(filterOpts?: FilterGameOpts): Promise<Game[]> {
    // Skips opts when returning a playlist
    // @TODO Properly select from playlists
    const gameRepository = getManager().getRepository(Game);
    if (filterOpts) {
      if (filterOpts.playlistId) {
        const playlistGames = await getManager().getRepository(PlaylistGame).find({ where: { playlistId: filterOpts.playlistId }});
        return gameRepository.findByIds(playlistGames.map(g => g.gameId));
      }
    }
    // Filter games out to return
    const query = gameRepository.createQueryBuilder('game');
    if (filterOpts) {
      if (!filterOpts.extreme) { query.where('game.extreme = :extreme', {extreme: filterOpts.extreme}); }
      if (!filterOpts.broken)  { query.where('game.broken = :broken',   {broken: filterOpts.broken});   }
      if (filterOpts.library)  { query.where('game.library = :library', {library: filterOpts.library}); }
    }
    return query.getMany();
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

  export async function findPlaylist(playlistId: string): Promise<Playlist | undefined> {
    const playlistRepository = getManager().getRepository(Playlist);
    return playlistRepository.findOne(playlistId);
  }

  /** Find playlists given a filter. @TODO filter */
  export async function findPlaylists(): Promise<Playlist[]> {
    const playlistRepository = getManager().getRepository(Playlist);
    return await playlistRepository.find();
  }

  /** Removes a playlist */
  export async function removePlaylist(playlistId: string): Promise<Playlist | undefined> {
    const playlistRepository = getManager().getRepository(Playlist);
    const playlist = await GameManager.findPlaylist(playlistId);
    if (playlist) {
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