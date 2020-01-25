import { AdditionalApp } from '@database/entity/AdditionalApp';
import { Game } from '@database/entity/Game';
import { FilterGameOpts } from '@shared/game/GameFilter';
import { Coerce } from '@shared/utils/Coerce';
import { FindOneOptions, getManager } from 'typeorm';

export namespace GameManager {

  export async function countGames(): Promise<number> {
    const gameRepository = getManager().getRepository(Game);
    return await gameRepository.count();
  }

  /** Find the game with the specified ID. */
  export async function findGame(id?: string, filter?: FindOneOptions<Game>): Promise<Game | undefined> {
    if (id || filter) {
      const gameRepository = getManager().getRepository(Game);
      return await gameRepository.findOne(id, {relations: ['addApps']});
    }
  }

  /** Find the game with the specified ID. */
  export async function findGames(filterOpts?: FilterGameOpts): Promise<Game[]> {
    const gameRepository = getManager().getRepository(Game);
    const query = gameRepository.createQueryBuilder('game')
      .leftJoinAndSelect('game.addApps', 'addApps');
    if (filterOpts) {
      if (!filterOpts.extreme) { query.where('game.extreme = :extreme', {extreme: filterOpts.extreme}); }
      if (!filterOpts.broken)  { query.where('game.broken = :broken', {broken: filterOpts.broken}); }
      query
        .where('CONTAINS(game.title, :search)', {search: filterOpts.search})
        .orWhere('CONTAINS(game.alternativeTitles, :search)', {search: filterOpts.search})
        .orWhere('CONTAINS(game.developer, :search)', {search: filterOpts.search})
        .orWhere('CONTAINS(game.publisher, :search)', {search: filterOpts.search});
    }
    return await gameRepository.find({relations: ['addApps']});
  }

  /** Find an add apps with the specified ID. */
  export async function findAddApp(id?: string, filter?: FindOneOptions<AdditionalApp>): Promise<AdditionalApp | undefined> {
    if (id || filter) {
      const addAppRepository = getManager().getRepository(AdditionalApp);
      return await addAppRepository.findOne(id, filter);
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

  export async function updateGame(game: Game): Promise<void> {
    const gameRepository = getManager().getRepository(Game);
    await gameRepository.save(game);
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
}