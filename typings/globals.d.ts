import { IMainWindowExternal } from '../src/shared/interfaces';

/** Custom modifications made by this project */

declare global {
  type ElectronAPI = {
    openExternal: (url: string, opts?: Electron.OpenExternalOptions) => void;
    showItemInFolder: (path: string) => void;
  };

  interface Window {
    Shared: IMainWindowExternal;
    electronAPI?: ElectronAPI;
  }
}
