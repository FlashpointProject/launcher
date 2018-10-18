import * as fs from 'fs';
import * as path from 'path';
import * as fastXmlParser from 'fast-xml-parser';
import { promisify } from 'util';
import { IRawLaunchBoxPlatformRoot, IRawLaunchBoxGame } from 'src/shared/launchbox/interfaces';
import { IGameCollection, IGameInfo } from 'src/shared/game/interfaces';
import { LaunchboxData } from '../LaunchboxData';

const writeFile = promisify(fs.writeFile);

export class GameManagerPlatform {
  /** Filename of the platform XML file */
  public filename: string;
  /** Raw data object (object tree representation of the xml document) */
  public data?: IRawLaunchBoxPlatformRoot;
  /** Parsed object of the data */
  public collection?: IGameCollection;

  constructor(filename: string) {
    this.filename = filename;
  }

  public async saveToFile(): Promise<void> {
    // Save the platform to its file
    const flashpointPath = window.External.config.fullFlashpointPath;
    const parser = new fastXmlParser.j2xParser({
      ignoreAttributes: true,
    });
    await writeFile(
      path.join(flashpointPath, LaunchboxData.platformsPath, this.filename), 
      parser.parse(this.data),
    );
  }

  public findGame(gameId: string): IGameInfo|undefined {
    return this.collection && this.collection.games[this.indexOfGame(gameId)];
  }

  public findRawGame(gameId: string): IRawLaunchBoxGame|undefined {
    if (this.data && this.data.LaunchBox && this.data.LaunchBox.Game) {
      let games = this.data.LaunchBox.Game;
      if (!Array.isArray(games)) { games = [ games ]; }
      for (let i = games.length - 1; i >= 0; i--) {
        if (games[i].ID === gameId) {
          return games[i];
        }
      }
    }
  }
  
  public indexOfGame(gameId: string): number {
    if (this.collection) {
      let games = this.collection.games;
      for (let i = games.length - 1; i >= 0; i--) {
        if (games[i].id === gameId) {
          return i;
        }
      }
    }
    return -1;
  }
  
  public indexOfRawGame(gameId: string): number {
    if (this.data && this.data.LaunchBox && this.data.LaunchBox.Game) {
      let games = this.data.LaunchBox.Game;
      if (!Array.isArray(games)) { games = [ games ]; }
      for (let i = games.length - 1; i >= 0; i--) {
        if (games[i].ID === gameId) {
          return i;
        }
      }
    }
    return -1;
  }
}
