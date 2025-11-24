import { SocketClient } from '@shared/back/SocketClient';
import { EventEmitter } from 'events';
import { AppConfigData, AppPreferencesData, IBackProcessInfo, ILogEntry, ITheme, LangContainer, LangInfo } from 'flashpoint-launcher';

/** Replacement of "object" type. Note: I'm not sure how effective it is though //obelisk */
type ObjectLike = Record<string, unknown> | Record<number, unknown>

/** Type for all global logging functions */
export type LogFunc = (source: string, message: string) => ILogEntry;

/** Recursively set all properties as optional. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends ObjectLike ? DeepPartial<T[K]> : T[K];
}

/** Subtract the properties of U from T. */
export type Subtract<T, U extends ObjectLike> = Pick<T, Exclude<keyof T, keyof U>>;

export interface IMainWindowExternal {
  /** URL the program was run with */
  url?: string;

  initialPreferences: AppPreferencesData;

  /** Renderers interface for the Config data */
  config: {
    data: AppConfigData;
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

  /** If the launcher is running in development mode (using something like "npm run start"). */
  isDev: boolean;

  /** If the "back" is running remotely. */
  isBackRemote: boolean;

  /** Socket to the back API. */
  back: SocketClient<WebSocket>;

  /** Port of the back file server. */
  fileServerPort: number;

  /** URL of the back websocket server. */
  backUrl: URL;

  /** Custom version to display alongside launcher version (useful for packaged copies) */
  customVersion?: string;

  // @REFACTOR Figure out a way to delete these after they have been used (put them in a sub-object and just set it to undefined after it has been used?)
  initialLogEntries: ILogEntry[];
  initialLang: LangContainer;
  initialLangList: LangInfo[];
  initialThemes: ITheme[];
  initialLocaleCode: string;

  dialogResEvent: EventEmitter;
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
export type PickType<T, U> = NonNullable<{
  [P in keyof T]: T[P] extends U ? P : never
}[keyof T]>;


export type TestType = {
  id: string;
  test?: string;
}

/** IPC channels used to relay game manager events from  */

export type INamedBackProcessInfo = IBackProcessInfo & {
  /** Name of the server */
  name: string;
  /** Whether to use this service when toggling MAD4FP */
  mad4fp?: boolean;
  /** Aliases for the name */
  aliases: string[];
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

export type ExecMapping = {
  /** Windows path */
  win32: string;
  /** Linux path (if exists) */
  linux?: string;
  /** Wine path (if exists) */
  wine?: string;
  /** Mac path (if exists) */
  darwin?: string;
  /** Mac wine path (if exists) */
  darwine?: string;
}


/** Game properties that will have suggestions gathered and displayed. */
export type SuggestionProps = (
  | 'tags'
  | 'playMode'
  | 'status'
  | 'platforms'
  | 'applicationPath'
  | 'library'
)

/** Suggestions for game properties organized by property. */
export type GamePropSuggestions = {
  [P in SuggestionProps]: string[];
}
