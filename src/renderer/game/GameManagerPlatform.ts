import * as fs from 'fs';
import * as path from 'path';
import * as fastXmlParser from 'fast-xml-parser';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { IRawLaunchBoxPlatformRoot, IRawLaunchBoxGame, IRawLaunchBoxAdditionalApplication } from 'src/shared/launchbox/interfaces';
import { IAdditionalApplicationInfo, IGameInfo } from 'src/shared/game/interfaces';
import { LaunchboxData } from '../LaunchboxData';
import { GameCollection } from '../../shared/game/GameCollection';
import { GameInfo } from '../../shared/game/GameInfo';
import { GameParser } from '../../shared/game/GameParser';

const writeFile = promisify(fs.writeFile);

declare interface GameManagerPlatform {
  /** Fired when one or more games has been changed (added, removed, changed properties etc.) */
  on(event: 'change', handler: (platform: this) => void): this;
}

class GameManagerPlatform extends EventEmitter {
  /** Filename of the platform XML file */
  public filename: string;
  /** Raw data object (object tree representation of the xml document) */
  public data?: IRawLaunchBoxPlatformRoot;
  /** Parsed object of the data */
  public collection?: GameCollection;

  constructor(filename: string) {
    super();
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
   * Find all additional applications that belong to a given game
   * @param gameId ID of game
   * @returns Array of additional applications for that game (empty if none)
   */
  public findAdditionalApplicationsOfGame(gameId: string): IAdditionalApplicationInfo[] {
    if (!this.collection) { return []; }
    const addApps = this.collection.additionalApplications;
    const ret: IAdditionalApplicationInfo[] = [];
    for (let i = addApps.length - 1; i >= 0; i--) {
      if (addApps[i].gameId === gameId) {
        ret.push(addApps[i]);
      }
    }
    return ret;
  }

  /**
   * Add an additional application
   * @param addApp Additional Application to add
   */
  public addAdditionalApplication(addApp: IAdditionalApplicationInfo): void {
    if (!this.collection) { throw new Error('Cant add additional application because collection is missing.'); }
    this.collection.additionalApplications.push(addApp);
  }

  /**
   * Add a raw additional application
   * @param rawAddApp Raw Additional Application to add
   */
  public addRawAdditionalApplication(rawAddApp: IRawLaunchBoxAdditionalApplication): void {
    if (!this.data || !this.data.LaunchBox) {
      throw new Error('Cant add raw additional application because raw launchbox data structure is missing or broken.');
    }
    let addApps = this.data.LaunchBox.AdditionalApplication;
    if (Array.isArray(addApps)) { // (2 or more entries - is already an array)
      addApps.push(rawAddApp);
    } else if (addApps) { // (1 entry)
      addApps = this.data.LaunchBox.AdditionalApplication = [ addApps ];
      addApps.push(rawAddApp);
    } else { // (0 entries)
      this.data.LaunchBox.AdditionalApplication = rawAddApp;
    }
  }

  /**
   * Add a raw game
   * @param rawGame Raw game to add
   */
  public addRawGame(rawGame: IRawLaunchBoxGame): void {
    if (!this.data || !this.data.LaunchBox) {
      throw new Error('Cant add raw game because raw launchbox data structure is missing or broken.');
    }
    let games = this.data.LaunchBox.Game;
    if (Array.isArray(games)) { // (2 or more entries - is already an array)
      games.push(rawGame);
    } else if (games) { // (1 entry)
      games = this.data.LaunchBox.Game = [ games ];
      games.push(rawGame);
    } else { // (0 entries)
      this.data.LaunchBox.Game = rawGame;
    }
  }

  /**
   * Add a game (or update the props of a game if they share IDs)
   * @param game Game to add, or copy props from
   */
  public addOrUpdateGame(game: IGameInfo): void {
    if (!this.collection) { return; }
    // Add or overwrite the parsed game to the collection
    const orgGame = this.collection.findGame(game.id);
    if (orgGame) {
      GameInfo.override(orgGame, game);
    } else {
      let newGame = GameInfo.create();
      GameInfo.override(newGame, game);
      this.collection.games.push(newGame);
    }
    // Add or overwrite the raw game to the collection
    const rawGame = this.findRawGame(game.id);
    if (rawGame) {
      Object.assign(rawGame, GameParser.reverseParseGame(game));
    } else {
      this.addRawGame(GameParser.reverseParseGame(game));
    }
  }

  /**
   * Remove a game
   * @param gameId ID of game
   */
  public removeGame(gameId: string): void {
    if (!this.collection) { return; }
    const index = this.collection.indexOfGame(gameId);
    if (index >= 0) {
      this.collection.games.splice(index, 1);
    } else { console.error(`Failed to remove parsed game from platform because it wasn't found (${gameId})`); }
    const rawIndex = this.indexOfRawGame(gameId);
    if (rawIndex >= 0) {
      if (this.data && this.data.LaunchBox && this.data.LaunchBox.Game) {
        let games = this.data.LaunchBox.Game;
        if (Array.isArray(games)) {
          games.splice(rawIndex, 1);
        } else {
          this.data.LaunchBox.Game = undefined;
        }
      }
    } else { console.error(`Failed to remove raw game from platform because it wasn't found (${gameId})`); }
  }

  /**
   * Remove an additional application
   * @param addAppId ID of additional application
   */
  public removeAdditionalApplication(addAppId: string): void {
    if (!this.collection) { return; }
    const index = this.collection.indexOfAdditionalApplication(addAppId);
    if (index >= 0) {
      this.collection.additionalApplications.splice(index, 1);
    } else { console.error(`Failed to remove parsed add-app from platform because it wasn't found (${addAppId})`); }
    const rawIndex = this.indexOfRawAdditionalApplication(addAppId);
    if (rawIndex >= 0) {
      if (this.data && this.data.LaunchBox && this.data.LaunchBox.AdditionalApplication) {
        let addApps = this.data.LaunchBox.AdditionalApplication;
        if (Array.isArray(addApps)) {
          addApps.splice(rawIndex, 1);
        } else {
          this.data.LaunchBox.AdditionalApplication = undefined;
        }
      }
    } else { console.error(`Failed to remove raw add-app from platform because it wasn't found (${addAppId})`); }
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

  /**
   * Find the first raw additional application with a given id (if any)
   * @param addAppId ID of raw additional application
   */
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
  
  public indexOfRawAdditionalApplication(addAppId: string): number {
    if (this.data && this.data.LaunchBox && this.data.LaunchBox.AdditionalApplication) {
      let addApps = this.data.LaunchBox.AdditionalApplication;
      if (!Array.isArray(addApps)) { addApps = [ addApps ]; }
      for (let i = addApps.length - 1; i >= 0; i--) {
        if (addApps[i].Id === addAppId) {
          return i;
        }
      }
    }
    return -1;
  }
}

export default GameManagerPlatform;
