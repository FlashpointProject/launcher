import * as GameManager from '@back/game/GameManager';
import { createTestGame, GameFactory, GameImportFactory } from '@tests/util/factories/game';
import { cleanMemoryDb } from '@back/index';

describe('Game', () => {
  beforeAll(async () => {
    await cleanMemoryDb();
    await (new GameImportFactory()).runMany(25);
  });

  test('Save and fetch many games', async () => {
    let games = await GameManager.findAllGames();
    expect(games.length).toEqual(25);

    const newGames = await (new GameFactory()).runMany(10);
    await GameManager.updateGames(newGames);
    games = await GameManager.findAllGames();
    expect(games.length).toEqual(35);
  });

  test('Save and fetch game', async () => {
    const id = 'test-game';
    const game = createTestGame({ id });
    await GameManager.save(game);
    const foundGame = await GameManager.findGame(id);
    expect(foundGame).not.toBeNull();
    expect(foundGame?.id).toEqual(id);
  });
});
