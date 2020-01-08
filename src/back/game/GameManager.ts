import * as fastXmlParser from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { GameParser } from '../../shared/game/GameParser';
import { IAdditionalApplicationInfo, IGameCollection, IGameInfo, MetaUpdate } from '../../shared/game/interfaces';
import { GamePlatform, IRawPlatformFile } from '../../shared/platform/interfaces';
import { copyError } from '../util/misc';
import { GameManagerState, LoadPlatformError } from './types';

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const writeFile = promisify(fs.writeFile);

const LOG = false;

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
              if ((await stat(platformPath)).isFile() && platformFileExt.toLowerCase().endsWith('.xml')) {
                platforms.push({
                  name: path.basename(platformFile, platformFileExt),
                  filePath: platformPath,
                  library: libraryName,
                  data: { LaunchBox: {} },
                  collection: { games: [], additionalApplications: [] },
                });
              }
            }
          }
        } catch (e) { console.log(e); }
      }
    } catch (e) { console.log(e); }

    // Read and parse all platform files
    const errors: LoadPlatformError[] = [];
    await Promise.all(platforms.map(async (platform) => {
      try {
        const data = await readFile(platform.filePath);
        const platformData: IRawPlatformFile | undefined = fastXmlParser.parse(data.toString(), {
          ignoreAttributes: true,
          ignoreNameSpace: true,
          parseNodeValue: true,
          parseAttributeValue: false,
          parseTrueNumberOnly: true,
          // @TODO Look into which settings are most appropriate
        });
        if (!platformData) { throw new Error(`Failed to parse XML file: ${platform.filePath}`); }

        // Make sure the sub-object exists
        if (!platformData.LaunchBox) { platformData.LaunchBox = {}; }

        // Populate platform
        platform.data = platformData;
        platform.collection = GameParser.parse(platformData, platform.library);

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

  export function updateMetas(state: GameManagerState, request: MetaUpdate): Promise<void> {
    const edited: GamePlatform[] = []; // All platforms that were edited and need to be saved

    // Games
    gameUpdateLoop:
    for (let game of request.games) {
      // Make sure the library and platform exist, replacing with unknown defaults if not
      const newLibrary = game.library || UNKNOWN_LIBRARY;
      const newPlatform = game.platform || UNKNOWN_PLATFORM;

      // Find existing platform and library to update if exists
      const gamePlatform = state.platforms.find(p => p.name === newPlatform && p.library === newLibrary);
      if (gamePlatform) {
        // Attempt to update game in existing platform
        if (updateGame(game, gamePlatform)) {
          if (request.saveToDisk) { edited.push(gamePlatform); }
          if (LOG) { console.log('updated ' + game.id); }
          continue gameUpdateLoop;
        }
        // Game not found in platform, follow process assuming it's a new game, or moved to another platform.
      }

      // Game has moved or is new
      const oldAddApps: IAdditionalApplicationInfo[] = [];
      for (let platform of state.platforms) {
        if (removeGame(game.id, platform)) {
          if (request.saveToDisk) { edited.push(platform); }
          // Game removed from platform, store add apps to move later
          let addAppIndex = -1;
          while ((addAppIndex = platform.collection.additionalApplications.findIndex(a => a.gameId === game.id)) !== -1) {
            // Remove from platform and push to list to add later
            const oldAddApp = platform.collection.additionalApplications[addAppIndex];
            removeAddApp(oldAddApp.id, platform);
            oldAddApps.push(oldAddApp);
          }
        }
      }

      if (gamePlatform) {
        if (request.saveToDisk) { edited.push(gamePlatform); }
        // Platform matching found, add to it
        addGame(game, gamePlatform);
        // Add additional apps
        for (let addApp of oldAddApps) {
          addAddApp(addApp, gamePlatform);
        }
      } else {
        // No platform found, make a new one
        const newCollection: IGameCollection = {
          games: [game],
          additionalApplications: oldAddApps
        };
        const platform: GamePlatform = {
          filePath: path.join(state.platformsPath, newLibrary, newPlatform + '.xml'),
          name: newPlatform,
          library: newLibrary,
          collection: newCollection,
          data: createRawFromCollection(newCollection)
        };
        // Add to working array
        state.platforms.push(platform);
        if (request.saveToDisk) { edited.push(platform); }
      }
    }

    // AddApps
    addAppLoop:
    for (let addApp of request.addApps) {
      // Find platform of parent game
      for (let platform of state.platforms) {
        if (updateAddApp(addApp, platform)) {
          // App found and updated, move onto the next one
          if (request.saveToDisk) { edited.push(platform); }
          continue addAppLoop;
        }
      }

      // Add App not found, create new entry in games platform
      for (let platform of state.platforms) {
        // Find parent games platform
        const gameIndex = platform.collection.games.findIndex(g => g.id === addApp.gameId);
        if (gameIndex !== -1) {
          // Game platform found, add in here then continue
          addAddApp(addApp, platform);
          if (request.saveToDisk) { edited.push(platform); }
          continue addAppLoop;
        }
      }
      // No parent game found, and no add app entry found. This shouldn't be reachable.
    }

    // Save all edited platforms
    return serial(removeDupes(edited).map(p => () => savePlatformToFile(state, p)));
  }

  /** Remove an addapp in a platform */
  export function removeAddApp(id: string, platform: GamePlatform): boolean {
    // Find and remove from platform addApps if exists
    const appIndex = platform.collection.additionalApplications.findIndex(a => a.id === id);
    if (appIndex !== -1) {
      // Found Add App in platform, remove
      platform.collection.additionalApplications.splice(appIndex, 1);
      // Find and remove from raw platform if exists
      let addApps = platform.data.LaunchBox.AdditionalApplication;
      if (addApps) {
        // Convert to array if single Add App in platform
        if (!Array.isArray(addApps)) { addApps = [ addApps ]; }
        // Remove from raw Add App array if exists
        const rawIndex = addApps.findIndex(a => a.Id === id);
        if (rawIndex >= 0) {
          addApps.splice(rawIndex, 1);
          platform.data.LaunchBox.AdditionalApplication = addApps;
        }
      }
      return true;
    }
    return false;
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
    return state.saveQueue.push(
      mkdir(path.dirname(platform.filePath), { recursive: true })
      .then(() => writeFile(platform.filePath, parsedData))
    , true).catch(console.error);
  }

  /** Update a game in a platform */
  function updateGame(game: IGameInfo, platform: GamePlatform): boolean {
    // Find game in platform
    const gameIndex = platform.collection.games.findIndex(g => g.id === game.id);
    if (gameIndex !== -1) {
      // Game found, update collection
      platform.collection.games[gameIndex] = game;
      // Update raw
      let games = platform.data.LaunchBox.Game;
      if (games) {
        // Convert to array if single game present.
        if (!Array.isArray(games)) { games = [ games ]; }
        const rawIndex = games.findIndex(g => g.ID === game.id);
        if (rawIndex !== 1) {
          games[rawIndex] = GameParser.reverseParseGame(game);
          platform.data.LaunchBox.Game = games;
        }
      } else {
        // Games not defined. This shouldn't ever be reachable.
        platform.data.LaunchBox.Game = GameParser.reverseParseGame(game);
      }
      return true;
    }
    // No game found to update
    return false;
  }

  /** Update an add app in a platform */
  function updateAddApp(addApp: IAdditionalApplicationInfo, platform: GamePlatform): boolean {
    const addAppIndex = platform.collection.additionalApplications.findIndex(a => a.id === addApp.id);
    if (addAppIndex !== -1) {
      // Add app found, update collection
      platform.collection.additionalApplications[addAppIndex] = addApp;
      // Update raw
      let addApps = platform.data.LaunchBox.AdditionalApplication;
      if (addApps) {
        // Convert to array if single game present. This shouldn't ever be true but better safe than sorry
        if (!Array.isArray(addApps)) { addApps = [ addApps ]; }
        const rawIndex = addApps.findIndex(a => a.Id === addApp.id);
        if (rawIndex !== 1) {
          addApps[rawIndex] = GameParser.reverseParseAdditionalApplication(addApp);
          platform.data.LaunchBox.AdditionalApplication = addApps;
        }
      } else {
        // Add apps not defined. This shouldn't ever be reachable either.
        platform.data.LaunchBox.AdditionalApplication = GameParser.reverseParseAdditionalApplication(addApp);
      }
      return true;
    }
    // No add app found to update
    return false;
  }

  /** Add a game to a platform */
  function addGame(game: IGameInfo, platform: GamePlatform) {
    // Add collection entry
    platform.collection.games.push(game);
    // Add raw entry
    let games = platform.data.LaunchBox.Game;
      if (games) {
        // Convert to array if single game in platform
        if (!Array.isArray(games)) { games = [ games ]; }
        // Add game to array
        games.push(GameParser.reverseParseGame(game));
        platform.data.LaunchBox.Game = games;
      } else {
        // Games not defined, add on its own
        platform.data.LaunchBox.Game = GameParser.reverseParseGame(game);
      }
  }

  /** Add a game to a platform */
  function addAddApp(addApp: IAdditionalApplicationInfo, platform: GamePlatform) {
    // Add collection entry
    platform.collection.additionalApplications.push(addApp);
    // Add raw entry
    let addApps = platform.data.LaunchBox.AdditionalApplication;
      if (addApps) {
        // Convert to array if single game in platform
        if (!Array.isArray(addApps)) { addApps = [ addApps ]; }
        // Add game to array
        addApps.push(GameParser.reverseParseAdditionalApplication(addApp));
        platform.data.LaunchBox.AdditionalApplication = addApps;
      } else {
        // AddApps not defined, add on its own
        platform.data.LaunchBox.AdditionalApplication = GameParser.reverseParseAdditionalApplication(addApp);
      }
  }

  /** Remove a game in a platform */
  export function removeGame(id: string, platform: GamePlatform): IGameInfo | undefined {
    // Find and remove from platform games if exists
    if (LOG) { console.log('finding ' + id +  ' ' + id.length); }
    const gameIndex = platform.collection.games.findIndex(g => g.id === id);
    if (gameIndex !== -1) {
      // Found game in platform, store return and remove
      const returnGame = platform.collection.games.splice(gameIndex, 1)[0];
      // Find and remove from raw platform if exists
      let games = platform.data.LaunchBox.Game;
      if (games) {
        // Array of raw games, find game
        if (Array.isArray(games)) {
          for (let game of games) {
            if (LOG) { console.log('ID ' + game.ID + ' ' + game.ID.length); }
          }
          const rawIndex = games.findIndex(g => g.ID === id);
          if (LOG) { console.log(rawIndex); }
          if (rawIndex !== -1) {
            if (LOG) { console.log('found ' + id + ' at ' + rawIndex); }
            games.splice(rawIndex, 1);
          }
        } else {
          // Single game, check if matches and remove if does
          if (games.ID === id) { platform.data.LaunchBox.Game = undefined; }
        }
      }
      if (LOG) { console.log(`deleted ${id} from ${platform.name}`); }
      return returnGame;
    }
  }

  /** Create a new raw platform with the same data as a parsed platform */
  function createRawFromCollection(collection: IGameCollection) : IRawPlatformFile {
    return {
      LaunchBox: {
        Game: collection.games.map(game => GameParser.reverseParseGame(game)),
        AdditionalApplication: collection.additionalApplications.map(addApp => GameParser.reverseParseAdditionalApplication(addApp))
      }
    };
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
