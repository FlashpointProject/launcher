import { shallowStrictEquals } from '../Util';
import { IGameInfo } from './interfaces';

export class GameInfo {
  public static create(): IGameInfo {
    return {
      id: '',
      title: '',
      series: '',
      developer: '',
      publisher: '',
      platform: '',
      dateAdded: '',
      broken: false,
      extreme: false,
      playMode: '',
      status: '',
      notes: '',
      genre: '',
      source: '',
      applicationPath: '',
      launchCommand: '',
      releaseDate: '',
      version: '',
      originalDescription: '',
      language: '',
      filename: '',
      orderTitle: '',
      placeholder: false,
    };
  }

  /**
   * Override the properties of a game info object with those of another
   * @param target Object to override property values of
   * @param source Object to copy property values from
   */
  public static override(target: IGameInfo, source: Partial<IGameInfo>): void {
    Object.assign(target, source);
  }

  /** Create an copy of a game info object with identical properties */
  public static duplicate(game: IGameInfo): IGameInfo {
    return Object.assign({}, game);
  }

  /** If all properties of two game info objects are identical */
  public static equals(game: IGameInfo, otherGame: IGameInfo): boolean {
    return shallowStrictEquals(game, otherGame);
  }
}
