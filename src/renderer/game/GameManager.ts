import { EventEmitter } from 'events';
import * as path from 'path';
import { GameCollection } from '../../shared/game/GameCollection';
import { GameParser, generateGameOrderTitle } from '../../shared/game/GameParser';
import { LaunchboxData } from '../LaunchboxData';
import GameManagerPlatform from './GameManagerPlatform';
import { removeFileExtension } from '../../shared/Util';
import { IGameInfo, IAdditionalApplicationInfo } from '../../shared/game/interfaces';
import { formatUnknownPlatformName } from './util';
import { IGameLibraryFileItem } from '../../shared/library/interfaces';

declare interface GameManager {
  /** Fired when one or more games has been changed (added, removed, changed properties etc.) */
  on(event: 'change', handler: (manager: this) => void): this;
}

class GameManager extends EventEmitter {
  /** All platforms */
  private platforms: GameManagerPlatform[] = [];
  /** A collection of all games from all platforms */
  public collection: GameCollection = new GameCollection();
  
  /** Fetch file filenames of all platform XMLs in the platforms folder */
  public async findPlatforms(): Promise<string[]> {
    const flashpointPath = window.External.config.fullFlashpointPath;
    const filenames = await LaunchboxData.fetchPlatformFilenames(flashpointPath);
    for (let i = 0; i < filenames.length; i++) {
      this.addPlatform(new GameManagerPlatform(filenames[i]));
    }
    return filenames;
  }

  /** Fetch and parse all platform XMLs and put them into this manager */
  public async loadPlatforms(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const flashpointPath = window.External.config.fullFlashpointPath;
      if (this.platforms.length === 0) {
        resolve(); // No files found
      } else {
        let done: number = 0;
        for (let i = this.platforms.length - 1; i >= 0; i--) {
          const platform = this.platforms[i];
          LaunchboxData.loadPlatform(path.join(flashpointPath, LaunchboxData.platformsPath, platform.filename))
          .then((data) => {
            platform.data = data;
            platform.collection = new GameCollection().push(GameParser.parse(data, platform.filename));
            this.collection.push(platform.collection);
            done++;
            if (done === this.platforms.length) {
              resolve();
            }
          })
          .catch(reject);
        }
      }
    });
  }

  /**
   * Add a platform to this manager
   * @param platform Platform to add
   */
  public addPlatform(platform: GameManagerPlatform): void {
    this.platforms.push(platform);
    platform.on('change', this.onPlatformChange);
  }

  /**
   * Add a new game or update it if it already exists.
   * @param game Game to add or update.
   * @param addApps All additional applications of the game (if undefined, the add-apps will not be added or updated).
   * @param library Library the game belongs to.
   */
  public addOrUpdateGame(game: IGameInfo, addApps?: IAdditionalApplicationInfo[] | undefined, library?: IGameLibraryFileItem): Promise<void> {
    // Get the library prefix
    const libraryPrefix = (library && library.prefix) ? library.prefix : '';
    // Find the platform the game is in (or should be in, if it is not in one already)
    const platform = this.getPlatformOfGame(game, libraryPrefix) ||
                     this.createOrGetUnknownPlatform(libraryPrefix);
    // Update game's order title
    game.orderTitle = generateGameOrderTitle(game.title);
    // Update game's filename property
    game.filename = platform.filename;
    // Overwrite the game and additional applications with the changes made
    platform.addOrUpdateGame(game);
    // Override the additional applications
    if (addApps) {
      const currentAddApps = GameCollection.findAdditionalApplicationsByGameId(this.collection, game.id);
      this.updateAddApps(addApps, currentAddApps, platform);      
    }
    // Refresh games collection
    this.refreshCollection();
    // Save changes to file
    return platform.saveToFile();
  }

  /**
   * Update a set of additional applications.
   * All add-apps that are present in the current set but not the new set will be deleted.
   * All add-apps that are present in new set but not the current set will be added.
   * All add-apps that are present in both sets will be updated.
   * @param editApps All the additional applications the game should have.
   * @param currentAddApps All the current additional applications of a game.
   * @param platform Platform the additional applications are in.
   */
  private updateAddApps(editApps: IAdditionalApplicationInfo[], currentAddApps: IAdditionalApplicationInfo[], platform: GameManagerPlatform): void {
    // @TODO Clean this code up. It is horrific.
    if (!platform.collection) { throw new Error('Platform does not have a collection.'); }
    // 1. Save the changes made to add-apps
    // 2. Save any new add-apps
    // 3. Delete any removed add-apps
    if (!currentAddApps) { throw new Error('selectedAddApps is missing'); }
    // -- Categorize add-apps --
    // Put all new add-apps in an array
    const newAddApps: IAdditionalApplicationInfo[] = [];
    for (let i = editApps.length - 1; i >= 0; i--) {
      const editApp = editApps[i];
      let found = false;
      for (let j = currentAddApps.length - 1; j >= 0; j--) {
        const selApp = currentAddApps[j];
        if (editApp.id === selApp.id) {
          found = true;
          break;
        }
      }
      if (!found) { newAddApps.push(editApp); }
    }
    // Put all changed add-apps in an array
    const changedAddApps: IAdditionalApplicationInfo[] = [];
    for (let i = editApps.length - 1; i >= 0; i--) {
      const editApp = editApps[i];
      for (let j = currentAddApps.length - 1; j >= 0; j--) {
        const selApp = currentAddApps[j];
        if (editApp.id === selApp.id) {
          changedAddApps.push(editApp);
          break;
        }
      }
    }
    // Put all removes add-apps in an array
    const removedAddApps: IAdditionalApplicationInfo[] = [];
    for (let i = currentAddApps.length - 1; i >= 0; i--) {
      const selApp = currentAddApps[i];
      let found = false;
      for (let j = editApps.length - 1; j >= 0; j--) {
        const editApp = editApps[j];
        if (editApp.id === selApp.id) {
          found = true;
          break;
        }
      }
      if (!found) { removedAddApps.push(selApp); }
    }
    // -- Update --
    // Delete removed add-apps
    for (let i = removedAddApps.length - 1; i >= 0; i--) {
      const addApp = removedAddApps[i];
      platform.removeAdditionalApplication(addApp.id);
    }
    // Update changed add-apps
    for (let i = changedAddApps.length - 1; i >= 0; i--) {
      const addApp = changedAddApps[i];
      const oldAddApp = platform.collection.findAdditionalApplication(addApp.id);
      if (!oldAddApp) { throw new Error('???'); }
      const rawAddApp = platform.findRawAdditionalApplication(addApp.id);
      if (!rawAddApp) { throw new Error('???'); }
      Object.assign(oldAddApp, addApp);
      Object.assign(rawAddApp, GameParser.reverseParseAdditionalApplication(oldAddApp));
    }
    // Add new add-apps
    for (let i = newAddApps.length - 1; i >= 0; i--) {
      const addApp = newAddApps[i];
      platform.addAdditionalApplication(addApp);
      const newRawAddApp = Object.assign(
        {},
        GameParser.emptyRawAdditionalApplication, 
        GameParser.reverseParseAdditionalApplication(addApp)
      );
      platform.addRawAdditionalApplication(newRawAddApp);
    }
  }

  /**
   * Get the first platform that contains a game with the given id (if any)
   * @param gameId ID of game
   */
  public getPlatformOfGameId(gameId: string): GameManagerPlatform|undefined {
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const platform = this.platforms[i];
      if (platform.collection) {
        let games = platform.collection.games;
        for (let j = games.length - 1; j >= 0; j--) {
          if (games[j].id === gameId) {
            return platform;
          }
        }
      }
    }
  }

  /**
   * Get the first platform that contains an additional application with the given id (if any)
   * @param addAppId ID of Additional Application
   */
  public getPlatformOfAddAppId(addAppId: string): GameManagerPlatform|undefined {
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const platform = this.platforms[i];
      if (platform.collection) {
        let addApps = platform.collection.additionalApplications;
        for (let j = addApps.length - 1; j >= 0; j--) {
          if (addApps[j].id === addAppId) {
            return platform;
          }
        }
      }
    }
  }

  /**
   * Find the platform a game should be put in when saved (for a specific library).
   * @param game Game to find the platform of.
   * @param libraryPrefix Prefix of the library the game is in.
   * @returns The platform the game should be saved to.
   */
  public getPlatformOfGame(game: IGameInfo, libraryPrefix: string): GameManagerPlatform | undefined {
    // Look for the game in all of these platforms (return the first one it is found in)
    return (
      // Check the platform the game was loaded from
      this.getPlatformByName(removeFileExtension(game.filename)) ||
      // Check if any platform contains the game with the same id
      this.getPlatformOfGameId(game.id) ||
      // Check if there is a platform for the game's "platform" property (in the specified library)
      (game.platform && this.getPlatformByName(libraryPrefix + game.platform)) ||
      // Check if there is an "Unknown Platform" platform (in the specified library)
      this.getPlatformByName(formatUnknownPlatformName(libraryPrefix))
    );
  }
  
  /**
   * Create and add an unknown platform for a specific library (or get it if it already exists).
   * @param libraryPrefix Prefix of the library the platform is for.
   * @returns The newly created (or already existing) platform.
   */
  public createOrGetUnknownPlatform(libraryPrefix: string): GameManagerPlatform {
    const getPlatform = this.getPlatformByFilename(formatUnknownPlatformName(libraryPrefix));
    if (getPlatform) { // (Already exists)
      return getPlatform;
    } else { // (Create and add new platform)
      const platform = GameManagerPlatform.createUnknown(libraryPrefix);
      this.addPlatform(platform);
      return platform;
    }
  }
  
  public getPlatformByName(platformName: string): GameManagerPlatform|undefined {
    return this.getPlatformByFilename(platformName + '.xml');
  }
  
  public getPlatformByFilename(platformFilename: string): GameManagerPlatform|undefined {
    const targetName = platformFilename.toLowerCase();
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const platform = this.platforms[i];
      if (targetName === platform.filename.toLowerCase()) {
        return platform;
      }
    }
  }

  /** Get an array of all the platform names */
  public listPlatforms(): GameManagerPlatform[] {
    return this.platforms.slice();
  }

  public refreshCollection(): void {
    this.collection.clear();
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      let col = this.platforms[i].collection;
      if (col) {
        this.collection.push(col);
      }
    }
    this.emit('change', this);
  }

  private onPlatformChange = (platform: GameManagerPlatform): void => {
    this.refreshCollection();
  }
}

export default GameManager;
