import { IGameCollection, IGameInfo, IAdditionalApplicationInfo } from './interfaces';

export class GameCollection implements IGameCollection {
  public games: IGameInfo[] = [];
  public additionalApplications: IAdditionalApplicationInfo[] = [];

  /**
   * Push all data from another collection to this collection.
   * Objects are NOT copied, so both collections will have references to 
   * shared objects (should probably only be used if the other collection
   * will be discarded after calling this)
   */
  public push(collection: IGameCollection): void {
    // Add games
    Array.prototype.push.apply(this.games, collection.games);
    // Add additional applications
    Array.prototype.push.apply(this.additionalApplications, collection.additionalApplications);
  }
}
