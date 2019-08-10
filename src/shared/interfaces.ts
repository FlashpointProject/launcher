import { OpenDialogOptions } from 'electron';
import { AppConfigApi } from './config/AppConfigApi';
import { LogRendererApi } from './Log/LogRendererApi';
import { AppPreferencesApi } from './preferences/AppPreferencesApi';

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

  /** Wrapper for Electron's function with the same name. */
  showOpenDialogSync(options: OpenDialogOptions): string[] | undefined;

  /** Open/Close the DevTools for this window */
  toggleDevtools(): void;

  /** Renderers interface for the Preferences data */
  preferences: AppPreferencesApi;

  /** Renderers interface for the Config data */
  config: AppConfigApi;

  /** Renderers interface for the Log data */
  log: LogRendererApi;
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

/** IPC channels used to relay window events from main to renderer. */
export enum WindowIPC {
  /** Sent whenever the windows "maximize" status changes. (main -> renderer). */
  WINDOW_MAXIMIZE = 'window-maximize',
  /** Sent whenever the windows position changes. (main -> renderer). */
  WINDOW_MOVE     = 'window-move',
  /** Sent whenever the windows size changes. (main -> renderer). */
  WINDOW_RESIZE   = 'window-resize',
}
