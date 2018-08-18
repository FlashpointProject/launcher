import { IMainWindowExternal } from '../src/shared/interfaces';

declare global {
  interface Window {
    External: IMainWindowExternal;
  }
}
