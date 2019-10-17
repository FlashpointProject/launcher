import { OpenDialogOptions } from 'electron';
import { AppConfigApi } from './config/AppConfigApi';
import { LogRendererApi } from './Log/LogRendererApi';
import { AppPreferencesApi } from './preferences/AppPreferencesApi';
import { ServicesApi } from './service/ServicesApi';

/** Subtract the properties of U from T. */
export type Subtract<T extends U, U extends object> = Pick<T, Exclude<keyof T, keyof U>>;

export interface IMainWindowExternal {
  /** Miscellaneous data. */
  misc: IMiscData;

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

  /** Wrapper for Electron's function with the same name. */
  showOpenDialogSync(options: OpenDialogOptions): string[] | undefined;

  /** Open/Close the DevTools for this window */
  toggleDevtools(): void;

  /** Renderers interface for the Preferences data */
  preferences: AppPreferencesApi;

  /** Renderers interface for the Config data */
  config: AppConfigApi;

  /** Renderers interface for Service data */
  services: ServicesApi;

  /** Renderers interface for the Log data */
  log: LogRendererApi;

  /** If the launcher is running in development mode (using something like "npm run start"). */
  isDev: boolean;
}

/** Callback for Electron.dialog.showOpenDialog */
export type ElectronOpenDialogCallback = (filePaths?: string[], bookmarks?: string[]) => void;

/** Obtain the return type of a function */
export type ReturnTypeOf<T extends AnyFunction> = T extends (...args: ArgumentTypesOf<T>) => infer R ? R : any;

/** Obtain the argument types of a function */
export type ArgumentTypesOf<F extends AnyFunction> = F extends (...args: infer A) => any ? A : never;

/** Any function. */
export type AnyFunction = (...args: any[]) => any;

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export interface IObjectMap<T> { [key: string]: T|undefined; }

/** Make all properties optional recursively. */
export type RecursivePartial<T> = {
  [key in keyof T]?: RecursivePartial<T[key]>;
};

/** From T, pick a set of properties whose values are assignable to U. */
export type PickType<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never
}[keyof T];

/** IPC channels used to relay window events from main to renderer. */
export enum WindowIPC {
  /** Sent whenever the windows "maximize" status changes. (main -> renderer). */
  WINDOW_MAXIMIZE = 'window-maximize',
  /** Sent whenever the windows position changes. (main -> renderer). */
  WINDOW_MOVE     = 'window-move',
  /** Sent whenever the windows size changes. (main -> renderer). */
  WINDOW_RESIZE   = 'window-resize',
}

/** Object of miscellaneous data to send from main to renderer on startup. */
export type IMiscData = {
  /** If the launcher is installed (instead of being portable). */
  installed: boolean;
  /** Version of the current launcher build. */
  version: number;
};

/** Miscellaneous IPC channels used between the main and renderer processes. */
export enum MiscIPC {
  /** Request misc data synchronously (renderer -> main). */
  REQUEST_MISC_SYNC = 'misc-request-data',
}
