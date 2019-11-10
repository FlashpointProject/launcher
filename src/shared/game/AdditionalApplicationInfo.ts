import { shallowStrictEquals } from '../Util';
import { IAdditionalApplicationInfo } from './interfaces';

export class AdditionalApplicationInfo {
  public static create(): IAdditionalApplicationInfo {
    return {
      id: '',
      gameId: '',
      applicationPath: '',
      autoRunBefore: false,
      launchCommand: '',
      name: '',
      waitForExit: false,
    };
  }

  /**
   * Override the properties of an additional application info object with those of another
   * @param target Object to override property values of
   * @param source Object to copy property values from
   */
  public static override(target: IAdditionalApplicationInfo, source: Partial<IAdditionalApplicationInfo>): void {
    Object.assign(target, source);
  }

  /** Create an copy of an additional application info object with identical properties */
  public static duplicate(addApp: IAdditionalApplicationInfo): IAdditionalApplicationInfo {
    return Object.assign({}, addApp);
  }

  /** If all properties of two game info objects are identical */
  public static equals(addApp: IAdditionalApplicationInfo, otherAddApp: IAdditionalApplicationInfo): boolean {
    return shallowStrictEquals(addApp, otherAddApp);
  }
}
