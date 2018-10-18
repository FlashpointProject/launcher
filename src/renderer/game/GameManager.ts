import * as fs from 'fs';
import * as path from 'path';
import * as fastXmlParser from 'fast-xml-parser';
import { LaunchboxData } from '../LaunchboxData';
import { IRawLaunchBoxPlatformRoot, IRawLaunchBoxGame } from '../../shared/launchbox/interfaces';
import { IGameCollection, IGameInfo } from '../../shared/game/interfaces';
import { GameParser } from '../../shared/game/GameParser';
import { GameCollection } from '../../shared/game/GameCollection';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);

interface IGameManagerPlatform {
  /** Filename of the platform XML file */
  filename: string;
  /** Raw data object (object tree representation of the xml document) */
  data?: IRawLaunchBoxPlatformRoot;
  /** Parsed object of the data */
  collection?: IGameCollection;
}

export class GameManager {
  /** All individual platforms */
  private platforms: IGameManagerPlatform[] = [];
  /**  */
  public collection: GameCollection = new GameCollection();
  
  /** Fetch file filenames of all platform XMLs in the platforms folder */
  public async findPlatforms(): Promise<string[]> {
    const flashpointPath = window.External.config.fullFlashpointPath;
    const filenames = await LaunchboxData.fetchPlatformFilenames(flashpointPath);
    for (let i = filenames.length - 1; i >= 0; i--) {
      this.platforms[i] = {
        filename: filenames[i],
      };
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
  
  public async saveGame(gameId: string): Promise<boolean> {
    // Find the platform the game belongs to
    let [ oldRawGame, platform ] = this.findRawGame(gameId);
    let [ gameInfo ] = this.findGameInfo(gameId);
    if (!oldRawGame || !gameInfo || !platform) { return false; }
    // Update the raw game data object
    Object.assign(oldRawGame, GameParser.reverseParseGame(gameInfo));
    // Save the platform to its file
    const flashpointPath = window.External.config.fullFlashpointPath;
    const parser = new fastXmlParser.j2xParser({});
    await writeFile(
      path.join(flashpointPath, LaunchboxData.platformsPath, platform.filename), 
      parser.parse(platform.data));
    // Success
    return true;
  }
  
  private findGameInfo(gameId: string): [IGameInfo?, IGameManagerPlatform?] {
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const platform = this.platforms[i];
      if (platform.collection) {
        let games = platform.collection.games;
        for (let j = games.length - 1; j >= 0; j--) {
          if (games[j].id === gameId) {
            return [games[j], platform];
          }
        }
      }
    }
    return [];
  }
  
  private findRawGame(gameId: string): [IRawLaunchBoxGame?, IGameManagerPlatform?] {
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const platform = this.platforms[i];
      if (platform.data && platform.data.LaunchBox && platform.data.LaunchBox.Game) {
        let games = platform.data.LaunchBox.Game;
        if (!Array.isArray(games)) { games = [ games ]; }
        for (let j = games.length - 1; j >= 0; j--) {
          if (games[j].ID === gameId) {
            return [games[j], platform];
          }
        }
      }
    }
    return [];
  }
}
