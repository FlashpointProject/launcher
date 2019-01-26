import { EventEmitter } from 'events';
import * as path from 'path';
import { GameCollection } from '../../shared/game/GameCollection';
import { GameParser } from '../../shared/game/GameParser';
import { LaunchboxData } from '../LaunchboxData';
import GameManagerPlatform from './GameManagerPlatform';

declare interface GameManager {
  /** Fired when one or more games has been changed (added, removed, changed properties etc.) */
  on(event: 'change', handler: (manager: this) => void): this;
}

class GameManager extends EventEmitter {
  /** All platforms */
  private platforms: GameManagerPlatform[] = [];
  /** A collection of all games from all platforms */
  public collection: GameCollection = new GameCollection();

  constructor() {
    super();
  }
  
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
