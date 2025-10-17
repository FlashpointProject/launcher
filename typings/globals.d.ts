import { OpenDialogOptions } from 'electron';
import { IMainWindowExternal } from '../src/shared/interfaces';

/** Custom modifications made by this project */

declare global {
  type ElectronAPI = {
    fileExists: (path: string) => Promise<boolean>;
    openExternal: (url: string, opts?: Electron.OpenExternalOptions) => void;
    showItemInFolder: (path: string) => void;
    showOpenDialog: (opts: OpenDialogOptions) => Promise<string[] | undefined>;
    restart: () => void;
    protocolReady: () => void;
    registerProtocol: (enabled: boolean) => Promise<void>;
    toggleDevTools: () => void;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    ipcRenderer: Electron.IpcRenderer;
  };

  interface Window {
    Shared: IMainWindowExternal;
    electronAPI?: ElectronAPI;
  }
}

declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;
    webkitdirectory?: string;
  }
}
