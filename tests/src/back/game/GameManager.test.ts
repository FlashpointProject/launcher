import * as path from 'path';
import { GameManager } from '../../../../src/back/game/GameManager';
import { FetchGameRequest, SearchQuery, FetchGameResponse, SearchResults, MetaUpdate, GameAppDeleteRequest } from '../../../../src/shared/game/interfaces';

const STATIC_PATH = './tests/static/back/game/'

describe('GameManager Fetching', () => {
  const manager: GameManager = new GameManager();

  beforeAll(() => {
    // Load test_platform.xml before starting tests
    manager.loadPlatforms(path.resolve(STATIC_PATH));
  });

  test('Find Game', () => {
    const req: FetchGameRequest = {
      id: '7'
    };
    const res = manager.findGame(req);
    expect(res.success).toBeTruthy();
    const data: FetchGameResponse = res.result;
    // ID 7 is Game "Test Game 7"
    expect(data.game.title).toEqual('Test Game 3');
    // Game 7 has an add app with its game id, verify it is given
    expect(data.addApps.length).toEqual(1);
    expect(data.addApps[0].id).toEqual('App_7')
  });

  test('Search Game Query', () => {
    const req: SearchQuery = {
      query: 'Test Game',
      offset: 0,
      limit: 100,
      orderBy: 'title'
    }
    const res = manager.searchGames(req);
    expect(res.success).toBeTruthy();
    const data: SearchResults = res.result;
    // 8 games contain Test in their title, 2 do not.
    expect(data.total).toEqual(8);
  });

  test('Search Game Limit', () => {
    const req: SearchQuery = {
      query: 'Test Game',
      offset: 0,
      limit: 5,
      orderBy: 'title'
    }
    const res = manager.searchGames(req);
    expect(res.success).toBeTruthy();
    const data: SearchResults = res.result;
    // Limit of 5 results, should return 5 results
    expect(data.total).toEqual(5);
  });

  test('Search Game Offset', () => {
    const req: SearchQuery = {
      query: 'Test Game',
      offset: 2,
      limit: 5,
      orderBy: 'title'
    }
    const res = manager.searchGames(req);
    expect(res.success).toBeTruthy();
    const data: SearchResults = res.result;
    // Test Game [1-7] exist, offset of 2 should be 3
    expect(data.results[0].title).toEqual('Test Game 3');
  });

  test('Delete Game', () => {
    // Delete game
    const req: GameAppDeleteRequest = {
      id: '1'
    }
    const res = manager.deleteGameOrApp(req);
    expect(res.success).toBeTruthy();
    // Verify game is gone
    const req2: FetchGameRequest = {
      id: '1'
    }
    const res2 = manager.findGame(req2);
    expect(res2.success).toBeFalsy();
  });

  test('Delete AddApp', () => {
    // Delete game
    const req: GameAppDeleteRequest = {
      id: 'App_01'
    }
    const res = manager.deleteGameOrApp(req);
    expect(res.success).toBeTruthy();
    // Verify add app is gone by finding attached game
    const req2: FetchGameRequest = {
      id: '1'
    }
    const res2 = manager.findGame(req2);
    expect(res2.success).toBeTruthy();
    const data: FetchGameResponse = res2.result;
    expect(data.addApps.length).toEqual(0);
  });

  test('New Meta', () => {
    // Do new meta request
    const req: MetaUpdate = {
      games: [
        {
          id: '123',
          title: 'New Game'
        }
      ],
      addApps: [
        {
          id: 'App_123',
          gameId: '123',
          applicationPath: 'New Path'
        }
      ],
      saveToDisk: false
    };
    const res = manager.updateMetas(req);
    expect(res.success).toBeTruthy();
    const req2: FetchGameRequest = {
      id: '123'
    }
    const res2 = manager.findGame(req2);
    expect(res2.success).toBeTruthy();
    // Verify game was added
    const data: FetchGameResponse = res2.result;
    expect(data.game.title).toEqual('New Game');
    // Verify add apps were added
    expect(data.addApps.length).toEqual(1);
    expect(data.addApps[0].id).toEqual('App_123');
  });

  test('Update Meta', () => {
    // Do meta update request
    const req: MetaUpdate = {
      games: [
        {
          id: '7',
          title: 'New Title',
          developer: 'New Developer',
          publisher: 'New Publisher'
        }
      ],
      addApps: [
        {
          id: 'App_7',
          applicationPath: 'New Path'
        }
      ],
      saveToDisk: false
    }
    const res = manager.updateMetas(req);
    expect(res.success).toBeTruthy();
    // Find changed game
    const req2: FetchGameRequest = {
      id: '7'
    };
    const res2 = manager.findGame(req2);
    expect(res2.success).toBeTruthy();
    const data: FetchGameResponse = res2.result;
    // Verify game changes were applied
    expect(data.game.title).toEqual('New Title');
    expect(data.game.developer).toEqual('New Developer');
    expect(data.game.publisher).toEqual('New Publisher');
    // Verify add app changes were applied
    expect(data.addApps.length).toEqual(1);
    expect(data.addApps[0].applicationPath).toEqual('New Path');
  });
})