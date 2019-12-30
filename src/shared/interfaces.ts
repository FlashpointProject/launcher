import { OpenDialogOptions } from 'electron';
import { SharedSocket } from './back/SharedSocket';
import { IAppConfigData } from './config/interfaces';
import { LangContainer, LangFile } from './lang';
import { ILogEntry } from './Log/interface';
import { IAppPreferencesData } from './preferences/interfaces';
import { Theme } from './ThemeFile';

/** Recursively set all properties as optional. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
}

/** Subtract the properties of U from T. */
export type Subtract<T, U extends object> = Pick<T, Exclude<keyof T, keyof U>>;

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

  preferences: {
    /** Current preferences. */
    data: IAppPreferencesData;
    /** Emitter for preference related events. */
    onUpdate?: () => void;
  };

  /** Renderers interface for the Config data */
  config: {
    data: IAppConfigData;
    /** Full path of the Flashpoint folder. */
    fullFlashpointPath: string;
    /** Full path of the JSON folder. */
    fullJsonFolderPath: string;
  };

  /** Log entries fetched from the back process. */
  log: {
    entries: ILogEntry[];
    offset: number;
  }

  /** Current status of the services. */
  services: IService[];

  /** If the launcher is running in development mode (using something like "npm run start"). */
  isDev: boolean;

  /** Socket to the back API. */
  back: SharedSocket;

  /** Port of the back file server. */
  fileServerPort: number;

  initialLang: LangContainer;
  initialLangList: LangFile[];
  initialThemes: Theme[];
  initialPlaylists?: GamePlaylist[];
  initialPlatforms: Record<string, string[]>;
  initialLocaleCode: string;

  /**
   * Wait for the preload to initialize.
   * @returns A promise that resolves when initialization is complete, or nothing if already initialized.
   */
  waitUntilInitialized(): Promise<void> | void;
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

/** IPC channels used to relay game manager events from  */

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
export type IBackProcessInfo = {
  /** Path of the file (relative to the Flashpoint root) */
  path: string;
  /** Name of the file to execute */
  filename: string;
  /** Arguments to pass to the process */
  arguments: string[];
  /**
   * If the process should be "killed" when shutting down
   * (This does not do anything for "start" and "stop" processes)
   */
  kill: boolean;
};

/** State of a managed process. */
export enum ProcessState {
  /** The process is not running. */
  STOPPED,
  /** The process is running. */
  RUNNING,
  /** The process is being killed (it has been requested to terminate, but it hasn't been terminated yet). */
  KILLING
}

/** Actions that can be performed on a service. */
export enum ProcessAction {
  /** Start the process if it is stopped */
  START,
  /** Stop the process if it is running */
  STOP,
  /** Stop the process if it is running, then start the process */
  RESTART
}

/** Object describing the state of a service. */
export type IService = {
  id: string;
  name: string;
  state: ProcessState;
  pid: number;
  startTime: number;
  info: IBackProcessInfo;
}

export type GamePlaylist = GamePlaylistContent & {
  /** Filename of the playlist (unique for each playlist). */
  filename: string;
}

/** Data contained inside a Playlist file. */
export type GamePlaylistContent = {
  /** Game entries in the playlist. */
  games: GamePlaylistEntry[];
  /** Title of the playlist. */
  title: string;
  /** Description of the playlist. */
  description: string;
  /** Author of the playlist. */
  author: string;
  /** Icon of the playlist (Base64 encoded image). */
  icon?: string;
  /** Route of the library this playlist is for. */
  library?: string;
}

/** An entry inside a Playlist file. */
export type GamePlaylistEntry = {
  /* GameID of game. */
  id: string;
  /* Optional notes related to the game (probably about why the game is in the playlist). */
  notes?: string;
}

export type ExecMapping = {
  /** Windows path */
  win32: string;
  /** Linux path (if exists) */
  linux?: string;
  /** Mac path (if exists) */
  darwin?: string;
}


/** Game properties that will have suggestions gathered and displayed. */
export type SuggestionProps = (
    'tags'
  | 'platform'
  | 'playMode'
  | 'status'
  | 'applicationPath'
  | 'library'
)

/** Temporarily used to store the suggestions for performance reasons. */
export type GamePropSuggestionsMap = {
  /** A map of suggestions for a single game property. */
  [P in SuggestionProps]: {
    /** The key is the suggestion value. */
    [key: string]: true; // (Some arbitrary true-y value, it is only used to confirm that the key exists)
  }
}

/** Suggestions for game properties organized by property. */
export type GamePropSuggestions = {
  [P in SuggestionProps]: string[];
}
