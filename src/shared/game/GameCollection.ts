import { IAdditionalApplicationInfo, IGameCollection, IGameInfo } from './interfaces';

export class GameCollection implements IGameCollection {
  public games: IGameInfo[] = [];
  public additionalApplications: IAdditionalApplicationInfo[] = [];

  /**
   * Find the first game with a given id (returns undefined if not found)
   * @param gameId ID of game
   * @returns Game with given id (or undefined if not found)
   */
  public findGame(gameId: string): IGameInfo|undefined {
    return this.games[this.indexOfGame(gameId)];
  }

  /**
   * Find the first additional application with a given id (returns undefined if not found)
   * @param addAppId ID of additional application
   * @returns Additional application with given id (or undefined if not found)
   */
  public findAdditionalApplication(addAppId: string): IAdditionalApplicationInfo|undefined {
    return this.additionalApplications[this.indexOfAdditionalApplication(addAppId)];
  }

  /**
   * Find the index of the first game with a given id (-1 if not found)
   * @param gameId ID of game
   * @returns Index of game
   */
  public indexOfGame(gameId: string): number {
    const games = this.games;
    for (let i = games.length - 1; i >= 0; i--) {
      if (games[i].id === gameId) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Find the index of the first additional application with a given id (-1 if not found)
   * @param addAppId ID of additional application
   * @returns Index of additional application
   */
  public indexOfAdditionalApplication(addAppId: string): number {
    const addApps = this.additionalApplications;
    for (let i = addApps.length - 1; i >= 0; i--) {
      if (addApps[i].id === addAppId) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Push all data from another collection to this collection.
   * Objects are NOT copied, so both collections will have references to
   * shared objects (should probably only be used if the other collection
   * will be discarded after calling this)
   */
  public push(collection: IGameCollection): GameCollection {
    Array.prototype.push.apply(this.games, collection.games);
    Array.prototype.push.apply(this.additionalApplications, collection.additionalApplications);
    return this;
  }

  /** Empty the collection */
  public clear(): GameCollection {
    this.games.splice(0, this.games.length);
    this.additionalApplications.splice(0, this.additionalApplications.length);
    return this;
  }

  /**
   * Find all additional applications with a given gameId
   * @param collection Collection to get additional applications from
   * @param gameId gameId to find all additional applications with
   */
  public static findAdditionalApplicationsByGameId(collection: IGameCollection, gameId: string): IAdditionalApplicationInfo[] {
    const addApps: IAdditionalApplicationInfo[] = [];
    for (let i = collection.additionalApplications.length - 1; i >= 0; i--) {
      if (collection.additionalApplications[i].gameId === gameId) {
        addApps.push(collection.additionalApplications[i]);
      }
    }
    return addApps;
  }
}
