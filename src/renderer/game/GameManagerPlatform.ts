import * as fs from 'fs';
import * as path from 'path';
import * as fastXmlParser from 'fast-xml-parser';
import { promisify } from 'util';
import { IRawLaunchBoxPlatformRoot, IRawLaunchBoxGame, IRawLaunchBoxAdditionalApplication } from 'src/shared/launchbox/interfaces';
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
      ignoreAttributes: true,  // Attributes are never used, this might increase performance?
      supressEmptyNode : true, // Empty tags are self closed ("<Tag />" instead of "<Tag></Tag>")
      format: true,            // Breaks XML into multiple lines and indents it
    });
    await writeFile(
      path.join(flashpointPath, LaunchboxData.platformsPath, this.filename), 
      parser.parse(this.data),
    );
  }

  /**
   * Find the first parsed game with a given id (if any)
   * @param gameId ID of game
   */
  public findGame(gameId: string): IGameInfo|undefined {
    return this.collection && this.collection.games[this.indexOfGame(gameId)];
  }

  /**
   * Find the first raw game with a given id (if any)
   * @param gameId ID of game
   */
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

  public findRawAdditionalApplication(addAppId: string): IRawLaunchBoxAdditionalApplication|undefined {
    if (this.data && this.data.LaunchBox && this.data.LaunchBox.AdditionalApplication) {
      let addApps = this.data.LaunchBox.AdditionalApplication;
      if (!Array.isArray(addApps)) { addApps = [ addApps ]; }
      for (let i = addApps.length - 1; i >= 0; i--) {
        if (addApps[i].Id === addAppId) {
          return addApps[i];
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
