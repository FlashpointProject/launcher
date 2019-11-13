import * as fastXmlParser from 'fast-xml-parser';
import * as fs from 'fs-extra';
import * as path from 'path';
import { EventQueue } from '../../renderer/util/EventQueue';
import { FilterGameOpts, filterGames, orderGames } from '../../shared/game/GameFilter';
import { GameParser } from '../../shared/game/GameParser';
import { FetchGameRequest, FetchGameResponse, GameAppDeleteRequest, IAdditionalApplicationInfo, IGameCollection, IGameInfo, MetaUpdate, SearchRequest, SearchResults, ServerResponse } from '../../shared/game/interfaces';
import { GamePlatform, IRawPlatformFile, PlatformInfo } from '../../shared/platform/interfaces';
import { PlatformParser } from '../../shared/platform/PlatformParser';
import { IAppPreferencesData } from '../../shared/preferences/interfaces';
import { LoadPlatformError, SearchCache, SearchCacheQuery } from './interfaces';

const UNIMPLEMENTED_RESPONSE: ServerResponse = {
  success: false,
  error: new Error('Unimplemented Function'),
  result: undefined
};
const UNKNOWN_LIBRARY = 'unknown';
const UNKNOWN_PLATFORM = 'unknown';

export class GameManager {
  /** Whether the manager has loaded platforms yet */
  private loaded: boolean = false;
  /** All working platforms */
  platforms: GamePlatform[] = [];
  /** Platforms path, used to build new platforms later */
  private platformsPath: string = 'Data/Platforms';
  /** Cached previous searches */
  private searchCaches: SearchCache[] = [];
  /** Event queue for saving to file (used to avoid collisions with saving to file). */
  private saveQueue: EventQueue = new EventQueue();

  public async loadPlatforms(platformsPath: string): Promise<void> {
    // Already loaded, don't do it again
    if (this.loaded) { return; }
    // Update own platforms path to match given one
    this.platformsPath = platformsPath;
    this.platforms = await PlatformParser.fetchPlatforms(platformsPath);
    // Hold *all* platform loading errors, can check after they're all finished.
    const errors: LoadPlatformError[] = [];
    // Wait for all platforms to (try and) finish loading
    await Promise.all(this.platforms.map(platform => {
      return (async () => {
        try {
          await PlatformParser.loadPlatformFile(platform);
        } catch (error) {
          errors.push({ ...error, filePath: platform.filePath });
        }
      })();
    }));
    // Finished loading, mark as such
    this.loaded = true;
    // Throw platform loading errors (if there were any)
    if (errors.length > 0) {
      throw errors;
    }
  }

  public fetchPlatformInfo(): ServerResponse {
    // Create info array
    const res: PlatformInfo[] = this.platforms.map(p => {
      return {
        name: p.name,
        library: p.library,
        size: p.collection.games.length
      };
    });
    for (let platform of res) {
      console.log(platform);
    }
    // Return successfully
    return {
      success: true,
      result: res
    };
  }

  /**
   * Find and return a game with any owned additional application
   * @param request Fetch game request to complete
   * @returns ServerResponse with FetchGameResponse result if successful
   */
  public findGame(request: FetchGameRequest): ServerResponse {
    // Find the game requested
    for (let i = 0; i < this.platforms.length; i++) {
      const game = this.platforms[i].collection.games.find(game => game.id === request.id);
      if (game) {
        // Game found, find attached add apps
        const addApps = this.findAddAppsForGame(request.id);
        // Return a successful response
        const res: FetchGameResponse = {
          game: game,
          addApps: addApps
        };
        return {
          success: true,
          result: res
        };
      }
    }
    // No game found, return failure
    return createFailureResponse(new Error(`No game found with the id ${request.id}`));
  }

  public searchGames(request: SearchRequest, preferences: IAppPreferencesData): ServerResponse {
    // Find matching cached search if exists
    let searchCache: SearchCache|undefined = undefined;
    const query: SearchCacheQuery = {...request};
    for (let cache of this.searchCaches) {
      if (cache.query === query) {
        searchCache = cache;
      }
    }

    // Skip to limiting if search cache was found
    if (!searchCache) {
      // Build opts from preferences and query
      const filterOpts: FilterGameOpts = {
        search: request.query,
        extreme: preferences.browsePageShowExtreme,
        broken: false,
        playlist: request.playlist
      };

      // Filter games
      let foundGames: IGameInfo[] = [];
      for (let i = 0; i < this.platforms.length; i++) {
        // If library matches filter, or no library filter given, filter this platforms games
        if (!request.library || this.platforms[i].library === request.library) {
          foundGames = foundGames.concat(filterGames(this.platforms[i].collection.games, filterOpts));
        }
      }

      // Order games
      orderGames(foundGames, request.orderOpts);
      // Build cache
      searchCache = {
        query: query,
        total: foundGames.length,
        results: foundGames
      };
      // Add to cache array, remove oldest if max length
      if (this.searchCaches.length >= 10) { this.searchCaches.splice(0,1); }
      this.searchCaches.push(searchCache);
    }

    // Apply limit and offset
    if (request.offset < searchCache.total) {
      // Don't go past end of array
      const maxLimit = Math.min(request.offset + request.limit, searchCache.total);
      const resGames = searchCache.results.slice(request.offset, maxLimit);
      // Return results
      const res: SearchResults = {
        ...request,
        total: searchCache.total,
        results: resGames
      };
      return {
        success: true,
        result: res
      };
    } else {
      // Offset out of bounds, return failure
      return createFailureResponse(new Error(`Offset out of bounds => ${request.offset}`));
    }
  }

  public deleteGameOrApp(request: GameAppDeleteRequest): ServerResponse {
    // Meta will change, clear cache
    this.searchCaches = [];
    // Search games
    for (let i = 0; i < this.platforms.length; i++) {
      if (GameManager.removeGame(request.id, this.platforms[i])) {
        // Game was found and removed, search for addApps
        for (let j = 0; j < this.platforms.length; i++) {
          const addApps = this.platforms[j].collection.additionalApplications.filter(addApp => addApp.gameId === request.id);
          if (addApps.length > 0) {
            // Add apps found, remove all
            for (let addApp of addApps) {
              GameManager.removeAddApp(addApp.id, this.platforms[i]);
            }
          }
          return {
            success: true
          };
        }
      }
    }
    // Search addApps
    for (let i = 0; i < this.platforms.length; i++) {
      if (GameManager.removeAddApp(request.id, this.platforms[i])) {
        // Add App was found and removed
        return {
          success: true
        };
      }
    }
    return createFailureResponse(new Error('Requested ID did not match any games or additional applications'));
  }

  public updateMetas(request: MetaUpdate): ServerResponse {
    // Meta will change, clear cache
    this.searchCaches = [];
    gameUpdateLoop:
    for (let game of request.games) {
      // Make sure the library and platform exist, replacing with unknown defaults if not
      const newLibrary = game.library.length > 0 ? game.library : UNKNOWN_LIBRARY;
      const newPlatform = game.platform.length > 0 ? game.platform : UNKNOWN_PLATFORM;
      // Find existing platform and library to update if exists
      const gamePlatform = this.platforms.find(p => p.name === newPlatform && p.library === newLibrary);
      if (gamePlatform) {
        // Attempt to update game in existing platform
        if (this.updateGame(game, gamePlatform)) {
          console.log('updated ' + game.id);
          if (request.saveToDisk) { this.savePlatformToFile(gamePlatform); }
          continue gameUpdateLoop;
        }
        // Game not found in platform, follow process assuming it's a new game, or moved to another platform.
      }
      // Game has moved or is new
      const oldAddApps: IAdditionalApplicationInfo[] = [];
      for (let platform of this.platforms) {
        if (GameManager.removeGame(game.id, platform)) {
          // Game removed from platform, store add apps to move later
          let addAppIndex = -1;
          while ((addAppIndex = platform.collection.additionalApplications.findIndex(a => a.gameId === game.id)) !== -1) {
            // Remove from platform and push to list to add later
            const oldAddApp = platform.collection.additionalApplications[addAppIndex];
            GameManager.removeAddApp(oldAddApp.id, platform);
            oldAddApps.push(oldAddApp);
          }
        }
      }

      if (gamePlatform) {
        // Platform matching found, add to it
        this.addGame(game, gamePlatform);
        // Add additional apps
        for (let addApp of oldAddApps) {
          this.addAddApp(addApp, gamePlatform);
        }
        if (request.saveToDisk) { this.savePlatformToFile(gamePlatform); }
      } else {
        // No platform found, make a new one
        const newCollection: IGameCollection = {
          games: [game],
          additionalApplications: oldAddApps
        };
        const platform: GamePlatform = {
          filePath: path.join(this.platformsPath, newLibrary, newPlatform + '.xml'),
          name: newPlatform,
          library: newLibrary,
          collection: newCollection,
          data: createRawFromCollection(newCollection)
        };
        // Add to working array
        this.platforms.push(platform);
        if (request.saveToDisk) { this.savePlatformToFile(platform); }
      }
    }
    addAppLoop:
    for (let addApp of request.addApps) {
      // Find platform of parent game
      for (let platform of this.platforms) {
        if (this.updateAddApp(addApp, platform)) {
          // App found and updated, move onto the next one
          if (request.saveToDisk) { this.savePlatformToFile(platform); }
          continue addAppLoop;
        }
      }
      // Add App not found, create new entry in games platform
      for (let platform of this.platforms) {
        // Find parent games platform
        const gameIndex = platform.collection.games.findIndex(g => g.id === addApp.gameId);
        if (gameIndex !== -1) {
          // Game platform found, add in here then continue
          this.addAddApp(addApp, platform);
          if (request.saveToDisk) { this.savePlatformToFile(platform); }
          continue addAppLoop;
        }
      }
      // No parent game found, and no add app entry found. This shouldn't be reachable.
    }
    return {
      success: true
    };
  }

  /** Update a game in a platform */
  private updateGame(game: IGameInfo, platform: GamePlatform): boolean {
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
  private updateAddApp(addApp: IAdditionalApplicationInfo, platform: GamePlatform): boolean {
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
  private addGame(game: IGameInfo, platform: GamePlatform) {
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
  private addAddApp(addApp: IAdditionalApplicationInfo, platform: GamePlatform) {
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
  public static removeGame(id: string, platform: GamePlatform): IGameInfo | undefined {
    // Find and remove from platform games if exists
    console.log('finding ' + id +  ' ' + id.length);
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
            console.log('ID ' + game.ID + ' ' + game.ID.length);
          }
          const rawIndex = games.findIndex(g => g.ID === id);
          console.log(rawIndex);
          if (rawIndex !== -1) {
            console.log('found ' + id + ' at ' + rawIndex);
            games.splice(rawIndex, 1);
          }
        } else {
          // Single game, check if matches and remove if does
          if (games.ID === id) { platform.data.LaunchBox.Game = undefined; }
        }
      }
      console.log(`deleted ${id} from ${platform.name}`);
      return returnGame;
    }
  }

  /** Remove an addapp in a platform */
  public static removeAddApp(id: string, platform: GamePlatform): boolean {
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

  /**
   * Find all the additional applications owned by a game
   * @param id Game's unique ID
   */
  private findAddAppsForGame(id: string): IAdditionalApplicationInfo[] {
    for (let i = 0; i < this.platforms.length; i++) {
      const addApps = this.platforms[i].collection.additionalApplications.filter(addApp => addApp.gameId === id);
      if (addApps.length > 0) { return addApps; }
    }
    return [];
  }

  public async saveAllPlatforms(): Promise<void> {
    for (let platform of this.platforms) {
      await this.savePlatformToFile(platform);
    }
  }

  public async savePlatformToFile(platform: GamePlatform): Promise<void> {
    // Parse data into XML
    const parser = new fastXmlParser.j2xParser({
      ignoreAttributes: true, // Attributes are never used, this might increase performance?
      supressEmptyNode: true, // Empty tags are self closed ("<Tag />" instead of "<Tag></Tag>")
      format: true,           // Breaks XML into multiple lines and indents it
    });
    const parsedData = parser.parse(platform.data);
    // Add save to the queue
    return this.saveQueue.push(async () => {
      // Save data to the platform's file
      await fs.ensureDir(path.dirname(platform.filePath));
      await fs.writeFile(platform.filePath, parsedData);
    }, true);
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

function createFailureResponse(error: Error): ServerResponse {
  return {
    success: false,
    error: error,
    result: undefined
  };
}