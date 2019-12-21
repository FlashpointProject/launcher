import * as fs from 'fs-extra';
import * as path from 'path';
import { GameManager } from '../../../../src/back/game/GameManager';
import { FetchGameRequest, FetchGameResponse, GameAppDeleteRequest, IAdditionalApplicationInfo, IGameInfo, MetaUpdate, SearchRequest, SearchResults } from '../../../../src/shared/game/interfaces';
import { PlatformInfo } from '../../../../src/shared/platform/interfaces';
import { defaultPreferencesData } from '../../../../src/shared/preferences/util';

const STATIC_PATH = './tests/static/back/game/'

describe('GameManager Fetching', () => {
  const manager: GameManager = new GameManager();

  beforeAll(async () => {
    // Copy across starting xmls
    deleteFolderRecursive(path.join(STATIC_PATH, 'platforms'));
    await fs.copy(path.join(STATIC_PATH, 'starting_platforms'), path.join(STATIC_PATH, 'platforms'));
    // Load test_platform.xml before starting tests
    await manager.loadPlatforms(path.join(STATIC_PATH, 'platforms'));
  });

  afterAll(async () => {
    await manager.saveAllPlatforms();
  })

  test('Get Platforms', () => {
    const res = manager.fetchPlatformInfo();
    expect(res.success).toBeTruthy();
    const data: PlatformInfo[] = res.result;
    expect(data.length).toEqual(1);
    const testPlatform = data[0];
    expect(testPlatform.name).toEqual('test_platform');
    expect(testPlatform.library).toEqual('test_library');
  })

  test('Find Game', () => {
    const req: FetchGameRequest = {
      id: 'Game_7'
    };
    const res = manager.findGame(req);
    expect(res.success).toBeTruthy();
    const data: FetchGameResponse = res.result;
    // ID 7 is Game "Test Game 7"
    expect(data.game.title).toEqual('Test Game 7');
    // Game 7 has an add app with its game id, verify it is given
    expect(data.addApps.length).toEqual(1);
    expect(data.addApps[0].id).toEqual('App_7')
  });

  test('Search Game Query', () => {
    const req: SearchRequest = {
      query: 'Test Game',
      offset: 0,
      limit: 100,
      orderOpts: {
        orderBy: 'title',
        orderReverse: 'ascending'
      }
    }
    const res = manager.searchGames(req, defaultPreferencesData);
    expect(res.success).toBeTruthy();
    const data: SearchResults = res.result;
    // 7 games contain 'Test Game' in their title, 3 do not.
    expect(data.total).toEqual(7);
  });

  test('Search Game Limit', () => {
    const req: SearchRequest = {
      query: 'Test Game',
      offset: 0,
      limit: 5,
      orderOpts: {
        orderBy: 'title',
        orderReverse: 'ascending'
      }
    }
    const res = manager.searchGames(req, defaultPreferencesData);
    expect(res.success).toBeTruthy();
    const data: SearchResults = res.result;
    // Limit of 5 results, should return 5 results, max 7
    expect(data.total).toEqual(7);
    expect(data.results.length).toEqual(5);
  });

  test('Search Game Offset', () => {
    const req: SearchRequest = {
      query: 'Test Game',
      offset: 2,
      limit: 5,
      orderOpts: {
        orderBy: 'title',
        orderReverse: 'ascending'
      }
    }
    const res = manager.searchGames(req, defaultPreferencesData);
    expect(res.success).toBeTruthy();
    const data: SearchResults = res.result;
    // Test Game [1-7] exist, offset of 2 should be 3
    expect(data.results[0].title).toEqual('Test Game 3');
  });

  test('Delete Game', () => {
    // Delete game
    const req: GameAppDeleteRequest = {
      id: 'Game_3'
    }
    const res = manager.deleteGameOrApp(req);
    expect(res.success).toBeTruthy();
    // Verify game is gone
    const req2: FetchGameRequest = {
      id: 'Game_3'
    }
    const res2 = manager.findGame(req2);
    expect(res2.success).toBeFalsy();
  });

  test('Delete AddApp', () => {
    // Delete game
    const req: GameAppDeleteRequest = {
      id: 'App_4'
    }
    const res = manager.deleteGameOrApp(req);
    expect(res.success).toBeTruthy();
    // Verify add app is gone by finding attached game
    const req2: FetchGameRequest = {
      id: 'Game_4'
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
          ...createGame(),
          id: 'Game_123',
          platform: 'test_platform',
          library: 'test_library',
          title: 'New Game'
        }
      ],
      addApps: [
        {
          ...createAddApp(),
          id: 'App_123',
          gameId: 'Game_123',
          applicationPath: 'New Path'
        }
      ],
      saveToDisk: false
    };
    const res = manager.updateMetas(req);
    expect(res.success).toBeTruthy();
    const req2: FetchGameRequest = {
      id: 'Game_123'
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

  test('New Platform and Library', () => {
    // Do meta update request
    const req: MetaUpdate = {
      games: [
        {
          ...createGame(),
          id: 'Game_7',
          platform: 'new_platform',
          library: 'new_library'
        }
      ],
      addApps: [],
      saveToDisk: false
    };
    // Submit request
    const res = manager.updateMetas(req);
    expect(res.success).toBeTruthy();
    // Verify new platform exists
    const res3 = manager.fetchPlatformInfo();
    expect(res3.success).toBeTruthy();
    const data3: PlatformInfo[] = res3.result;
    expect(data3.length).toEqual(2);
    // Verify platform info is correct
    expect(data3[1].name).toEqual('new_platform');
    expect(data3[1].library).toEqual('new_library');
  });

  test('Unknown Platform and Library', () => {
    // Do meta update request
    const req: MetaUpdate = {
      games: [
        {
          ...createGame(),
          id: 'Game_100',
          title: 'new game'
        }
      ],
      addApps: [
        {
          ...createAddApp(),
          id: 'App_100',
          gameId: '100'
        }
      ],
      saveToDisk: false
    };
    // Submit request
    const res = manager.updateMetas(req);
    expect(res.success).toBeTruthy();
    // Verify new unknown platform exists
    const res3 = manager.fetchPlatformInfo();
    expect(res3.success).toBeTruthy();
    const data3: PlatformInfo[] = res3.result;
    expect(data3.length).toEqual(3);
    // Verify platform info is correct
    expect(data3[2].name).toEqual('unknown');
    expect(data3[2].library).toEqual('unknown');
  })

  test('Update Meta', () => {
    // Do meta update request
    const req: MetaUpdate = {
      games: [
        {
          ...createGame(),
          id: 'Game_1',
          platform: 'test_platform',
          library: 'test_library',
          title: 'New Title',
          developer: 'New Developer',
          publisher: 'New Publisher'
        }
      ],
      addApps: [
        {
          ...createAddApp(),
          id: 'App_1',
          gameId: 'Game_1',
          applicationPath: 'New Path'
        }
      ],
      saveToDisk: false
    }
    const res = manager.updateMetas(req);
    expect(res.success).toBeTruthy();
    // Find changed game
    const req2: FetchGameRequest = {
      id: 'Game_1'
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

function createGame(): IGameInfo {
  return {
    library: '',
    orderTitle: '',
    placeholder: false,
    title: '',
    id: '',
    series: '',
    developer: '',
    publisher: '',
    dateAdded: '',
    platform: '',
    broken: false,
    extreme: false,
    playMode: '',
    status: '',
    notes: '',
    genre: '',
    source: '',
    originalDescription: '',
    applicationPath: '',
    language: '',
    launchCommand: '',
    releaseDate: '',
    version: ''
  }
}

function createAddApp(): IAdditionalApplicationInfo {
  return {
    id: '',
    name: '',
    gameId: '',
    applicationPath: '',
    launchCommand: '',
    autoRunBefore: false,
    waitForExit: false
  }
}


const deleteFolderRecursive = (folderPath: string) => {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file, index) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
};