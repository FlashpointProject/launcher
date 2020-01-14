import { GameManager } from '@back/game/GameManager';
import { GameManagerState } from '@back/game/types';
import { EventQueue } from '@back/util/EventQueue';
import { uuid } from '@back/util/uuid';
import { GameParser } from '@shared/game/GameParser';
import { IAdditionalApplicationInfo, IGameInfo } from '@shared/game/interfaces';
import { GamePlatform } from '@shared/platform/interfaces';
import { deepCopy } from '@shared/Util';
import { RESULT_PATH, STATIC_PATH } from '@tests/setup';
import * as path from 'path';

const STATIC_PLATFORMS_PATH = path.join(STATIC_PATH, 'GameManager/platforms');
const RESULT_PLATFORMS_PATH = path.join(RESULT_PATH, 'GameManager/platforms');

describe('GameManager', () => {
  test('Load Platforms', async () => {
    const state = createState();
    state.platformsPath = STATIC_PLATFORMS_PATH;
    const errors = await GameManager.loadPlatforms(state);
    expect(state.platforms.length).toBe(3); // Total number of platforms loaded
    expect(errors.length).toBe(0); // No platforms should fail to load
    // @TODO Compare that parsed content to a "snapshot" to verify that it was parsed correctly
  });

  test('Add Games & AddApps (to the same and already existing platform)', async () => {
    // Setup
    const state = createState();
    const platform = createPlatform('test_platform', 'test_library', state.platformsPath);
    state.platforms.push(platform);
    for (let i = 0; i < 10; i++) {
      const before = deepCopy(platform);
      // Add Game & AddApps
      const game = createGame(before.name, before.library);
      const addApps = createAddApps(game.id, i % 3); // Try different numbers of add-apps
      await GameManager.updateMetas(state, {
        game: game,
        addApps: addApps,
        saveToDisk: false,
      });
      // Compare
      expect(platform).toEqual({ // Game & AddApps have been added to the end of the collections in the correct order
        ...before,
        data: {
          LaunchBox: {
            Game: [
              ...before.data.LaunchBox.Game,
              GameParser.reverseParseGame(game),
            ],
            AdditionalApplication: [
              ...before.data.LaunchBox.AdditionalApplication,
              ...addApps.map(GameParser.reverseParseAdditionalApplication),
            ],
          },
        },
        collection: {
          games: [ ...before.collection.games, game, ],
          additionalApplications: [ ...before.collection.additionalApplications, ...addApps ],
        },
      });
    }
  });

  test('Add Games & AddApps (to differnt and non-existing platforms)', async () => {
    // Setup
    const state = createState();
    for (let i = 0; i < 10; i++) {
      // Add Game
      const game = createGame(`platform_${i}`, 'some_library');
      const addApps = createAddApps(game.id, i % 3); // Try different numbers of add-apps
      await GameManager.updateMetas(state, {
        game: game,
        addApps: addApps,
        saveToDisk: false,
      });
      // Compare
      const platform = state.platforms.find(p => (p.name === game.platform) && (p.library === game.library));
      expect(platform).toEqual({ // Platform has been created and contains the game and add-apps
        filePath: path.join(state.platformsPath, game.library, game.platform + '.xml'),
        name: game.platform,
        library: game.library,
        data: {
          LaunchBox: {
            Game: [ GameParser.reverseParseGame(game) ],
            AdditionalApplication: addApps.map(GameParser.reverseParseAdditionalApplication),
          },
        },
        collection: {
          games: [ game ],
          additionalApplications: addApps,
        },
      });
    }
  });

  test('Move Game & AddApps (between existing platforms)', async () => {
    // Setup
    const state = createState();
    const fromPlatform = createPlatform('from_platform', 'some_library', state.platformsPath);
    const toPlatform = createPlatform('to_platform', 'another_library', state.platformsPath);
    state.platforms.push(fromPlatform, toPlatform);
    // Add Game
    const game = createGame(fromPlatform.name, fromPlatform.library);
    const addApps = createAddApps(game.id, 5);
    await GameManager.updateMetas(state, {
      game: game,
      addApps: addApps,
      saveToDisk: false,
    });
    // Move Game
    const sameGame: IGameInfo = {
      ...game,
      platform: toPlatform.name,
      library: toPlatform.library,
    };
    await GameManager.updateMetas(state, {
      game: sameGame,
      addApps: addApps,
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
    expect(toPlatform).toEqual({ // Second platform has the game and add-apps
      ...toPlatform,
      data: {
        LaunchBox: {
          Game: [ GameParser.reverseParseGame(sameGame) ],
          AdditionalApplication: addApps.map(GameParser.reverseParseAdditionalApplication),
        },
      },
      collection: {
        games: [ sameGame ],
        additionalApplications: addApps,
      },
    });
  });

  test('Update Game (update the value of a field)', async () => {
    // Setup
    const state = createState();
    const platform = createPlatform('test_platform', 'test_library', state.platformsPath);
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

  test('Remove Games & AddApps (from one platform)', async () => {
    // Setup
    const state = createState();
    const platform = createPlatform('test_platform', 'test_library', state.platformsPath);
    state.platforms.push(platform);
    // Add Games & AddApps
    for (let i = 0; i < 10; i++) {
      const game = createGame(platform.name, platform.library);
      const addApp = createAddApp(game.id);
      await GameManager.updateMetas(state, {
        game: game,
        addApps: [ addApp ],
        saveToDisk: false,
      });
    }
    // Remove Games & AddApps
    for (let i = platform.collection.games.length - 1; i >= 0; i--) {
      const before = deepCopy(platform);
      const index = ((i + 7) ** 3) % platform.collection.games.length; // Pick a "random" index
      const gameId = platform.collection.games[index].id;
      // Remove Game & AddApps
      GameManager.removeGameAndAddApps(state, {
        gameId: gameId,
        saveToDisk: false,
      });
      // Compare
      expect(platform).toEqual({ // Game & AddApps have been removed
        ...before,
        data: {
          LaunchBox: {
            Game: before.data.LaunchBox.Game.filter(g => g.ID !== gameId),
            AdditionalApplication: before.data.LaunchBox.AdditionalApplication.filter(a => a.GameID !== gameId),
          }
        },
        collection: {
          games: before.collection.games.filter(g => g.id !== gameId),
          additionalApplications: before.collection.additionalApplications.filter(a => a.gameId !== gameId),
        },
      });
    }
  });

  test('Save Games & AddApps to file (multiple times)', async () => {
    // Setup
    const state = createState();
    const platform = createPlatform('test_platform', 'test_library', state.platformsPath);
    state.platforms.push(platform);
    // Add content to platform
    for (let i = 0; i < 10; i++) {
      const game = createGame(platform.name, platform.library);
      await GameManager.updateMetas(state, {
        game: game,
        addApps: createAddApps(game.id, i % 3), // Try different numbers of add-apps
        saveToDisk: false,
      });
    }
    // Save file multiple times
    const saves: Promise<any>[] = [];
    for (let i = 0; i < 5; i++) {
      saves.push(expect(GameManager.savePlatformToFile(state, platform)).resolves.toBe(undefined));
    }
    await Promise.all(saves);
  });

  // @TODO Add tests for adding, moving and removing add-apps
  // @TODO Test that edited games and add-apps retain their position in the arrays
  // @TODO Test that added games and add-apps get pushed to the end of the arrays

  // @TODO Test "GameManager.findGame"
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

function createPlatform(name: string, library: string, folderPath: string): GamePlatform {
  return {
    filePath: path.join(folderPath, library, name + '.xml'),
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
function createAddApps(gameId: string, length: number): IAdditionalApplicationInfo[] {
  const result: IAdditionalApplicationInfo[] = [];
  for (let i = 0; i < length; i++) {
    result.push(createAddApp(gameId));
  }
  return result;
}