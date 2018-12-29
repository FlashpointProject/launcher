import { AppPreferencesApi } from './preferences/AppPreferencesApi';
import { AppConfigApi } from './config/AppConfigApi';
import { LogRendererApi } from './Log/LogRendererApi';

export interface IMainWindowExternal {
  /** Get the OS name */
  platform: NodeJS.Platform;

  /** Minimize the window */
  minimize(): void;

  /** Maximize the window (or un-maximize if already maximized) */
  maximize(): void;

  /** Close the window */
  close(): void;

  /** Restart the application (closes all windows) */
  restart(): void;

  /** Wrapper of Electron.dialog.showOpenDialog() */
  showOpenDialog(options: Electron.OpenDialogOptions, callback?: ElectronOpenDialogCallback): string[]|undefined;

  /** Open/Close the DevTools for this window */
  toggleDevtools(): void;

  /** Renderer's interface for the Preferences data */
  preferences: AppPreferencesApi;

  /** Renderer's interface for the Config data */
  config: AppConfigApi;

  /** Renderer's interface for the Log data */
  log: LogRendererApi;
}

/** Callback for Electron.dialog.showOpenDialog */
export type ElectronOpenDialogCallback = (filePaths?: string[], bookmarks?: string[]) => void;

/** Obtain the return type of a function */
export type ReturnTypeOf<T extends Function> = T extends (...args: ArgumentTypesOf<T>) => infer R ? R : any;

/** Obtain the argument types of a function */
export type ArgumentTypesOf<F extends Function> = F extends (...args: infer A) => any ? A : never;

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
