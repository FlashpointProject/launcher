import * as path from 'path';
import { LaunchboxData } from '../LaunchboxData';
import { GameParser } from '../../shared/game/GameParser';
import { GameCollection } from '../../shared/game/GameCollection';
import GameManagerPlatform from './GameManagerPlatform';
import { EventEmitter } from 'events';

declare interface GameManager {
  /** Fired when one or more games has been changed (added, removed, changed properties etc.) */
  on(event: 'change', handler: (manager: this) => void): this;
}

class GameManager extends EventEmitter {
  /** All individual platforms */
  private platforms: GameManagerPlatform[] = [];
  /**  */
  public collection: GameCollection = new GameCollection();

  constructor() {
    super();
    this.onPlatformChange = this.onPlatformChange.bind(this);
  }
  
  /** Fetch file filenames of all platform XMLs in the platforms folder */
  public async findPlatforms(): Promise<string[]> {
    const flashpointPath = window.External.config.fullFlashpointPath;
    const filenames = await LaunchboxData.fetchPlatformFilenames(flashpointPath);
    for (let i = filenames.length - 1; i >= 0; i--) {
      let platform = new GameManagerPlatform(filenames[i]);
      this.platforms[i] = platform;
      platform.on('change', this.onPlatformChange);
    }
    return filenames;
  }

  /** Fetch and parse all platform XMLs and put them into this manager */
  public async loadPlatforms(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const flashpointPath = window.External.config.fullFlashpointPath;
      let done: number = 0;
      for (let i = this.platforms.length - 1; i >= 0; i--) {
        const platform = this.platforms[i];
        LaunchboxData.loadPlatform(path.join(flashpointPath, LaunchboxData.platformsPath, platform.filename))
        .then((data) => {
          platform.data = data;
          platform.collection = new GameCollection().push(GameParser.parse(data));
          this.collection.push(platform.collection);
          done++;
          if (done === this.platforms.length) {
            resolve();
          }
        })
        .catch(reject);
      }
    });
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

  private onPlatformChange(platform: GameManagerPlatform): void {
    this.refreshCollection();
  }
}

export default GameManager;
