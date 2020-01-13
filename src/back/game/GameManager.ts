import { GameParser } from '@shared/game/GameParser';
import { IGameCollection, IGameInfo } from '@shared/game/interfaces';
import { GamePlatform, IRawPlatformFile } from '@shared/platform/interfaces';
import * as fastXmlParser from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { copyError } from '../util/misc';
import { GameManagerState, LoadPlatformError, RemoveGameOptions, RemoveGameResult, UpdateMetaOptions } from './types';

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const writeFile = promisify(fs.writeFile);

const UNKNOWN_LIBRARY = 'unknown';
const UNKNOWN_PLATFORM = 'unknown';

export namespace GameManager {
  export async function loadPlatforms(state: GameManagerState): Promise<LoadPlatformError[]> {
    // Find the paths of all platform files
    const platforms: GamePlatform[] = [];
    try {
      const libraryNames = await readdir(state.platformsPath);
      for (let libraryName of libraryNames) {
        // Check each library for platforms
        try {
          const libraryPath = path.join(state.platformsPath, libraryName);
          if ((await stat(libraryPath)).isDirectory()) {
            // Library file was a directory, read files inside
            const platformFiles = await readdir(libraryPath);
            for (let platformFile of platformFiles) {
              // Find each platform file
              const platformPath = path.join(libraryPath, platformFile);
              const platformFileExt = path.extname(platformFile);
              if (platformFileExt.toLowerCase().endsWith('.xml') && (await stat(platformPath)).isFile()) {
                platforms.push({
                  name: path.basename(platformFile, platformFileExt),
                  filePath: platformPath,
                  library: libraryName,
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
              }
            }
          }
        } catch (e) { console.error(e); }
      }
    } catch (e) { console.error(e); }

    // Read and parse all platform files
    const errors: LoadPlatformError[] = [];
    await Promise.all(platforms.map(async (platform) => {
      try {
        const content = await readFile(platform.filePath);
        const data: any | undefined = fastXmlParser.parse(content.toString(), {
          ignoreAttributes: true,
          ignoreNameSpace: true,
          parseNodeValue: true,
          parseAttributeValue: false,
          parseTrueNumberOnly: true,
          // @TODO Look into which settings are most appropriate
        });
        if (!LaunchBox.formatPlatformFileData(data)) { throw new Error(`Failed to parse XML file: ${platform.filePath}`); }

        // Populate platform
        platform.data = data;
        platform.collection = GameParser.parse(data, platform.library);

        // Success!
        state.platforms.push(platform);
      } catch (e) {
        errors.push({
          ...copyError(e),
          filePath: platform.filePath,
        });
      }
    }));

    return errors;
  }

  /** (Similar to Array.find(), but it looks through all platforms) */
  export function findGame(platforms: GamePlatform[], predicate: (this: undefined, game: IGameInfo, index: number) => boolean): IGameInfo | undefined {
    for (let i = 0; i < platforms.length; i++) {
      const game = platforms[i].collection.games.find(predicate);
      if (game) { return game; }
    }
  }

  /**
   * Add or update a game and its add-apps.
   * Notes:
   * - The platform will be automatically selected or created
   * - All games and add-apps with duplicate IDs will be deleted (from all platforms)
   * - New games and add-apps will be pushed to the end of their platform
   * - Existing games and add-apps will retain their position in the platform file
   */
  export async function updateMetas(state: GameManagerState, opts: UpdateMetaOptions): Promise<void> {
    const edited: GamePlatform[] = []; // All platforms that were edited and need to be saved

    // Delete all games with the same ID and the add-apps that belongs to them
    const result = await removeGameAndAddApps(state, {
      gameId: opts.game.id,
      saveToDisk: false,
    });
    edited.push(...result.edited);

    // Add the game and add-apps to the platform they belong to (create one if it doesn't exist)
    const libraryName = opts.game.library || UNKNOWN_LIBRARY;
    const platformName = opts.game.platform || UNKNOWN_PLATFORM;

    const platformIndex = state.platforms.findIndex(p => p.name === platformName && p.library === libraryName);
    const platform = state.platforms[platformIndex];
    if (platform) {
      // Get game index
      let gameIndex = result.gameIndices[platformIndex][0];
      if (typeof gameIndex !== 'number') {
        gameIndex = platform.collection.games.length;
      }
      // Insert game
      state.log(`Insert Game (ID: "${opts.game.id}", index: ${gameIndex}, platform: "${platform.name}", library: "${platform.library}")`);
      platform.collection.games.splice(gameIndex, 0, opts.game);
      platform.data.LaunchBox.Game.splice(gameIndex, 0, GameParser.reverseParseGame(opts.game));

      // Insert app-apps
      for (let addApp of opts.addApps) {
        // Get app-app index
        let index = result.addAppIndices[platformIndex][addApp.id];
        if (typeof index !== 'number') {
          index = platform.collection.additionalApplications.length;
        }
        // Insert app-app
        state.log(`Insert AddApp (ID: "${addApp.id}", index: ${index}, platform: "${platform.name}", library: "${platform.library}")`);
        platform.collection.additionalApplications.splice(index, 0, addApp);
        platform.data.LaunchBox.AdditionalApplication.splice(index, 0, GameParser.reverseParseAdditionalApplication(addApp));
      }

      edited.push(platform);
    } else {
      const newCollection: IGameCollection = {
        games: [ opts.game ],
        additionalApplications: [ ...opts.addApps ],
      };
      const platform: GamePlatform = {
        filePath: path.join(state.platformsPath, libraryName, platformName + '.xml'),
        name: platformName,
        library: libraryName,
        collection: newCollection,
        data: createRawFromCollection(newCollection),
      };
      state.platforms.push(platform);
      edited.push(platform);
    }

    // Save changed platforms to disk
    if (opts.saveToDisk) {
      await serial(removeDupes(edited).map(p => () => savePlatformToFile(state, p)));
    }
  }


  /** Remove all games with a given ID and all add-apps that belongs to it. */
  export async function removeGameAndAddApps(state: GameManagerState, opts: RemoveGameOptions): Promise<RemoveGameResult> {
    const edited: GamePlatform[] = []; // All platforms that were edited and need to be saved
    const gameIndices: number[][] = [];
    const addAppIndices: Record<string, number>[] = [];

    // Delete all games with the same ID and the add-apps that belongs to them
    for (let platform of state.platforms) {
      let changed = false;

      const games = platform.collection.games;
      for (let i = games.length - 1; i >= 0; i--) {
        if (games[i].id === opts.gameId) {
          state.log(`Remove Game (ID: "${opts.gameId}", index: ${i}, platform: "${platform.name}", library: "${platform.library}")`);
          changed = true;
          games.splice(i, 1);
        }
      }

      const addApps = platform.collection.additionalApplications;
      for (let i = addApps.length - 1; i >= 0; i--) {
        if (addApps[i].gameId === opts.gameId) {
          state.log(`Remove AddApp (ID: "${addApps[i].id}", index: ${i}, platform: "${platform.name}", library: "${platform.library}")`);
          changed = true;
          addApps.splice(i, 1);
        }
      }

      const gameInd = LaunchBox.removeGame(platform.data, opts.gameId);
      gameIndices.push(gameInd);
      if (gameInd.length > 0) { changed = true; }

      const addAppInd = LaunchBox.removeAddAppsOfGame(platform.data, opts.gameId);
      addAppIndices.push(addAppInd);
      if (addAppInd.length > 0) { changed = true; }

      if (changed) { edited.push(platform); }
    }

    // Save changed platforms to disk
    if (opts.saveToDisk) {
      await serial(removeDupes(edited).map(p => () => savePlatformToFile(state, p)));
    }

    return {
      edited,
      gameIndices,
      addAppIndices,
    };
  }


  export async function savePlatformToFile(state: GameManagerState, platform: GamePlatform): Promise<void> {
    // Parse data into XML
    const parser = new fastXmlParser.j2xParser({
      ignoreAttributes: true, // Attributes are never used, this might increase performance?
      supressEmptyNode: true, // Empty tags are self closed ("<Tag />" instead of "<Tag></Tag>")
      format: true,           // Breaks XML into multiple lines and indents it
    });
    const parsedData = parser.parse(platform.data);
    // Save data to the platform's file
    return state.saveQueue.push(async () => {
      const extra = `(platform: "${platform.name}", library: "${platform.library}", file: "${platform.filePath}")`;
      try {
        state.log(`Saving platform to file ${extra}`);
        await mkdir(path.dirname(platform.filePath), { recursive: true });
        await writeFile(platform.filePath, parsedData);
        state.log(`Save successful ${extra}`);
      } catch (error) {
        state.log(`Save failed ${extra}\n${error}`);
      }
    }, true);
  }

  /** Create a new raw platform with the same data as a parsed platform */
  function createRawFromCollection(collection: IGameCollection): IRawPlatformFile {
    return {
      LaunchBox: {
        Game: collection.games.map(game => GameParser.reverseParseGame(game)),
        AdditionalApplication: collection.additionalApplications.map(addApp => GameParser.reverseParseAdditionalApplication(addApp)),
      },
    };
  }
}

export namespace LaunchBox {
  /**
   * Format the result of "fast-xml-parser" into a structured object.
   * This ensures that all types that will be used exists and is of the proper type.
   * @param data Object to format.
   */
  export function formatPlatformFileData(data: any): data is IRawPlatformFile {
    if (!isObject(data)) { return false; }

    // If there are multiple "LaunchBox" elements, remove all but the first (There should never be more than one!)
    if (Array.isArray(data.LaunchBox)) {
      data.LaunchBox = data.LaunchBox[0];
    }

    if (!isObject(data.LaunchBox)) {
      data.LaunchBox = {};
    }

    data.LaunchBox.Game                  = convertEntitiesToArray(data.LaunchBox.Game);
    data.LaunchBox.AdditionalApplication = convertEntitiesToArray(data.LaunchBox.AdditionalApplication);

    return true;

    function isObject(obj: any): boolean {
      return (typeof obj === 'object') && (data.LaunchBox !== null);
    }

    function convertEntitiesToArray(entries: any | any[] | undefined): any[] {
      if (Array.isArray(entries)) { // Multiple entries
        return entries;
      } else if (entries) { // One entry
        return [ entries ];
      } else { // No entries
        return [];
      }
    }
  }

  /**
   * Remove all games with the given ID.
   * @param data Data to remove games from.
   * @param gameId ID of the game(s) to remove.
   * @returns Indices of all removed games.
   */
  export function removeGame(data: IRawPlatformFile, gameId: string): number[] {
    const indices: number[] = [];
    const games = data.LaunchBox.Game;
    for (let i = games.length - 1; i >= 0; i--) {
      if (games[i].ID === gameId) {
        indices.push(i);
        games.splice(i, 1);
      }
    }
    return indices;
  }

  /**
   * Remove all add-apps that belongs to the game with the given ID.
   * @param data Data to remove add-apps from.
   * @param gameId ID of the game the add-apps belong to.
   * @returns Indices of all removed add-apps (result[addapp_id] = addapp_index).
   */
  export function removeAddAppsOfGame(data: IRawPlatformFile, gameId: string): Record<string, number> {
    const indices: Record<string, number> = {};
    const addApps = data.LaunchBox.AdditionalApplication;
    for (let i = addApps.length - 1; i >= 0; i--) {
      if (addApps[i].GameID === gameId) {
        indices[addApps[i].Id] = i;
        addApps.splice(i, 1);
      }
    }
    return indices;
  }
}

/**
 * Copy an array and remove all duplicates of values.
 * All values that are strictly equal to another value will be removed, except for the one with the lowest index.
 * Example: [1, 2, 3, 1] => [1, 2, 3]
 */
function removeDupes<T>(array: T[]): T[] {
  const result = array.slice();
  for (let i = 0; i < result.length; i++) {
    const a = result[i];
    let j = i + 1;
    while (j < result.length) {
      if (result[j] === a) { result.splice(j, 1); }
      else { j++; }
    }
  }
  return result;
}

/** Run a series of asynchronous functions one at a time. */
async function serial(funcs: Array<() => void>): Promise<void> {
  for (let i = 0; i < funcs.length; i++) {
    await funcs[i]();
  }
}
