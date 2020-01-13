import { GameManager } from '@back/game/GameManager';
import { GameManagerState } from '@back/game/types';
import { EventQueue } from '@back/util/EventQueue';
import { uuid } from '@back/util/uuid';
import { GameParser } from '@shared/game/GameParser';
import { IAdditionalApplicationInfo, IGameInfo } from '@shared/game/interfaces';
import { GamePlatform } from '@shared/platform/interfaces';
import { deepCopy } from '@shared/Util';
import { RESULT_PATH, STATIC_PATH } from '@tests/setup';
import { copy, remove } from 'fs-extra';
import * as path from 'path';

const STATIC_PLATFORMS_PATH = path.join(STATIC_PATH, 'GameManager/platforms');
const RESULT_PLATFORMS_PATH = path.join(RESULT_PATH, 'GameManager/platforms');

describe('GameManager Fetching', () => {
  beforeAll(async () => {
    // Setup testing folder
    await remove(RESULT_PLATFORMS_PATH);
    await copy(STATIC_PLATFORMS_PATH, RESULT_PLATFORMS_PATH);
  });

  afterAll(async () => {
    // ...
  });

  test('Load Platforms', async () => {
    const state = createState();
    const errors = await GameManager.loadPlatforms(state);
    expect(state.platforms.length).toBe(3); // Total number of platforms loaded
    expect(errors.length).toBe(0); // No platforms should fail to load
  });

  test('Add Game (to existing platform)', async () => {
    // Setup
    const state = createState();
    const platform = createPlatform('test_platform', 'test_library');
    state.platforms.push(platform);
    // Add Game
    const before = deepCopy(platform);
    const game = createGame(before.name, before.library);
    await GameManager.updateMetas(state, {
      game: game,
      addApps: [],
      saveToDisk: false,
    });
    // Compare
    expect(platform).not.toEqual(before); // Platform has been changed
    expect(platform).toEqual({ // Game has been added to the platform
      ...before,
      data: {
        LaunchBox: {
          Game: [ GameParser.reverseParseGame(game) ],
          AdditionalApplication: [],
        },
      },
      collection: {
        games: [ game ],
        additionalApplications: [],
      },
    });
  });

  test('Add Game (to new platform)', async () => {
    // Setup
    const state = createState();
    // Add Game
    const game = createGame('some_platform', 'some_library');
    await GameManager.updateMetas(state, {
      game: game,
      addApps: [],
      saveToDisk: false,
    });
    // Compare
    const platform = state.platforms.find(p => (p.name === game.platform) && (p.library === game.library));
    expect(platform).toEqual({
      filePath: path.join(state.platformsPath, game.library, game.platform + '.xml'),
      name: game.platform,
      library: game.library,
      data: {
        LaunchBox: {
          Game: [ GameParser.reverseParseGame(game) ],
          AdditionalApplication: [],
        },
      },
      collection: {
        games: [ game ],
        additionalApplications: [],
      },
    });
  });

  test('Move Game (between existing platforms)', async () => {
    // Setup
    const state = createState();
    const fromPlatform = createPlatform('from_platform', 'some_library');
    const toPlatform = createPlatform('to_platform', 'another_library');
    state.platforms.push(fromPlatform, toPlatform);
    // Add Game
    const game = createGame(fromPlatform.name, fromPlatform.library);
    await GameManager.updateMetas(state, {
      game: game,
      addApps: [],
      saveToDisk: false,
    });
    // Move Game
    const sameGame: IGameInfo = {
      ...game,
      platform: toPlatform.name,
      library: toPlatform.library
    };
    await GameManager.updateMetas(state, {
      game: sameGame,
      addApps: [],
      saveToDisk: false,
    });
    // Compare
    expect(fromPlatform).toEqual({ // First platform is empty
      ...fromPlatform,
      data: {
        LaunchBox: {
          Game: [],
          AdditionalApplication: [],
        },
      },
      collection: {
        games: [],
        additionalApplications: [],
      },
    });
    expect(toPlatform).toEqual({ // Second platform has the game
      ...toPlatform,
      data: {
        LaunchBox: {
          Game: [ GameParser.reverseParseGame(sameGame) ],
          AdditionalApplication: [],
        },
      },
      collection: {
        games: [ sameGame ],
        additionalApplications: [],
      },
    });
  });

  test('Update Game', async () => {
    // Setup
    const state = createState();
    const platform = createPlatform('test_platform', 'test_library');
    state.platforms.push(platform);
    // Add Game
    const game = createGame(platform.name, platform.library);
    await GameManager.updateMetas(state, {
      game: game,
      addApps: [],
      saveToDisk: false,
    });
    // Update Game
    const before = deepCopy(platform);
    const updatedGame: IGameInfo = {
      ...game,
      title: 'New Title',
    };
    await GameManager.updateMetas(state, {
      game: updatedGame,
      addApps: [],
      saveToDisk: false,
    });
    // Compare
    expect(platform).not.toEqual(before); // Platform has been changed
    expect(platform).toEqual({ // Game has been added to the platform
      ...before,
      data: {
        LaunchBox: {
          Game: [ GameParser.reverseParseGame(updatedGame) ],
          AdditionalApplication: [],
        },
      },
      collection: {
        games: [ updatedGame ],
        additionalApplications: [],
      },
    });
  });

  // @TODO Add tests for adding, moving and removing add-apps
  // @TODO Test that edited games and add-apps retain their position in the arrays
  // @TODO Test that added games and add-apps get pushed to the end of the arrays

  // @TODO Test "GameManager.findGame"
  // @TODO Test "GameManager.removeGameAndAddApps"
  // @TODO Test "GameManager.savePlatformToFile"
  // @TODO Test functions in the "LaunchBox" namespace?
});

function createState(): GameManagerState {
  return {
    platforms: [],
    platformsPath: RESULT_PLATFORMS_PATH,
    saveQueue: new EventQueue(),
    log: () => {}, // Don't log
  };
}

function createPlatform(name: string, library: string): GamePlatform {
  return {
    filePath: '',
    name: name,
    library: library,
    data: {
      LaunchBox: {
        Game: [],
        AdditionalApplication: [],
      },
    },
    collection: {
      games: [],
      additionalApplications: [],
    },
  };
}

function createGame(platform: string, library: string): IGameInfo {
  return {
    library: library,
    orderTitle: '',
    placeholder: false,
    title: '',
    alternateTitles: '',
    id: uuid(),
    series: '',
    developer: '',
    publisher: '',
    dateAdded: '',
    platform: platform,
    broken: false,
    extreme: false,
    playMode: '',
    status: '',
    notes: '',
    tags: '',
    source: '',
    originalDescription: '',
    applicationPath: '',
    language: '',
    launchCommand: '',
    releaseDate: '',
    version: '',
  };
}

function createAddApp(gameId: string): IAdditionalApplicationInfo {
  return {
    id: uuid(),
    name: '',
    gameId: gameId,
    applicationPath: '',
    launchCommand: '',
    autoRunBefore: false,
    waitForExit: false,
  };
}
