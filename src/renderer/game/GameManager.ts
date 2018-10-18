import * as fs from 'fs';
import * as path from 'path';
import * as fastXmlParser from 'fast-xml-parser';
import { LaunchboxData } from '../LaunchboxData';
import { IRawLaunchBoxGame } from '../../shared/launchbox/interfaces';
import { IGameInfo } from '../../shared/game/interfaces';
import { GameParser } from '../../shared/game/GameParser';
import { GameCollection } from '../../shared/game/GameCollection';
import { promisify } from 'util';
import { GameManagerPlatform } from './GameManagerPlatform';

const writeFile = promisify(fs.writeFile);

export class GameManager {
  /** All individual platforms */
  private platforms: GameManagerPlatform[] = [];
  /**  */
  public collection: GameCollection = new GameCollection();
  
  /** Fetch file filenames of all platform XMLs in the platforms folder */
  public async findPlatforms(): Promise<string[]> {
    const flashpointPath = window.External.config.fullFlashpointPath;
    const filenames = await LaunchboxData.fetchPlatformFilenames(flashpointPath);
    for (let i = filenames.length - 1; i >= 0; i--) {
      this.platforms[i] = new GameManagerPlatform(filenames[i]);
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
          platform.collection = GameParser.parse(data);
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

  public getPlatfromOfGameId(gameId: string): GameManagerPlatform|undefined {
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
}
