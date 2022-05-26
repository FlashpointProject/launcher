import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { TagCategory } from '@database/entity/TagCategory';
import { BackInit, ViewGame } from '@shared/back/types';
import { AppConfigData, AppExtConfigData } from '@shared/config/interfaces';
import { ExecMapping, IBackProcessInfo, INamedBackProcessInfo } from '@shared/interfaces';
import { LangContainer, LangFile } from '@shared/lang';
import { ILogEntry } from '@shared/Log/interface';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { AppPreferencesData } from '@shared/preferences/interfaces';
import { MessageBoxOptions, OpenDialogOptions, OpenExternalOptions, SaveDialogOptions } from 'electron';
import { EventEmitter } from 'events';
import * as flashpoint from 'flashpoint-launcher';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { Connection } from 'typeorm';
import * as WebSocket from 'ws';
import { ApiEmitter } from './extensions/ApiEmitter';
import { ExtensionService } from './extensions/ExtensionService';
import { InterceptorState as ModuleInterceptorState } from './extensions/NodeInterceptor';
import { Registry } from './extensions/types';
import { GameManagerState } from './game/types';
import { ManagedChildProcess } from './ManagedChildProcess';
import { SocketServer } from './SocketServer';
import { EventQueue } from './util/EventQueue';
import { FolderWatcher } from './util/FolderWatcher';
import { LogFile } from './util/LogFile';

/** Contains most state for the back process. */
export type BackState = {
  // @TODO Write comments for these properties
  isInit: boolean;
  isExit: boolean;
  isDev: boolean;
  verbose: boolean;
  socketServer: SocketServer;
  fileServer: Server;
  fileServerPort: number;
  fileServerDownloads: {
    queue: ImageDownloadItem[];
    current: ImageDownloadItem[];
  };
  preferences: AppPreferencesData;
  config: AppConfigData;
  extConfig: AppExtConfigData;
  configFolder: string;
  exePath: string;
  localeCode: string;
  version: string;
  logFile: LogFile;
  customVersion?: string,
  gameManager: GameManagerState;
  messageQueue: WebSocket.MessageEvent[];
  isHandling: boolean;
  init: { [key in BackInit]: boolean; };
  initEmitter: InitEmitter;
  queries: Record<string, BackQueryChache>;
  log: ILogEntry[];
  serviceInfo?: ServiceFileData;
  services: Map<string, ManagedChildProcess>;
  languageWatcher: FolderWatcher;
  languageQueue: EventQueue;
  languages: LangFile[];
  languageContainer: LangContainer;
  readonly themeState: ThemeState;
  playlists: Playlist[];
  execMappings: ExecMapping[];
  lastLinkedCurationKey: string;
  moduleInterceptor: ModuleInterceptorState;
  readonly status: StatusState,
  readonly apiEmitters: ApiEmittersState,
  readonly registry: Registry;
  extensionsService: ExtensionService;
  connection: Connection | undefined;
  prefsQueue: EventQueue;
}

export type BackQueryChache = {
  query: BackQuery;
  games: Game[];
  viewGames: ViewGame[];
}

export type BackQuery = {
  extreme: boolean;
  broken: boolean;
  library: string;
  search: string;
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
  playlistId?: string;
}

type InitEmitter = (
  EmitterPart<BackInit, () => void>
) & EventEmitter

/** Data related to an image being downloaded on-demand. */
export type ImageDownloadItem = {
  subPath: string;
  req: IncomingMessage;
  res: ServerResponse;
  /** If the request has been cancelled by the client. */
  cancelled: boolean;
}

/** Declarations for a single event in an event emitter (in all the different related functions). */
export interface EmitterPart<E extends string | number | symbol, F extends (...args: any[]) => void> {
  on(event: E, listener: F): this;
  once(event: E, listener: F): this;
  off(event: E, listener: F): this;
  emit(event: E, ...args: Parameters<F>): boolean;
}

export type ServiceFileData = {
  server: INamedBackProcessInfo[];
  /** Processes to run as background services. */
  daemon: INamedBackProcessInfo[];
  /** Processes to run before the launcher starts. */
  start: IBackProcessInfo[];
  /** Processes to run when the launcher closes. */
  stop: IBackProcessInfo[];
  /** Files to watch and run continuous logging on */
  watch: string[];
};

export type ThemeState = {
  watchers: FolderWatcher[];
  queue: EventQueue;
}

export type ThemeListItem = {
  /**
   * File or folder name of the theme (relative to the theme folder).
   * Format: X in "\X" or "\X\theme.css"
   */
  basename: string;
}

export type BareTag = {
  categoryId: number;
  description?: string;
  primaryAlias: string;
  aliases: string[];
}

export type TagsFile = {
  categories: TagCategory[];
  tags: BareTag[]
}

export type ShowMessageBoxFunc = (options: MessageBoxOptions) => Promise<number>;
export type ShowSaveDialogFunc = (options: SaveDialogOptions) => Promise<string | undefined>;
export type ShowOpenDialogFunc = (options: OpenDialogOptions) => Promise<string[] | undefined>;
export type OpenExternalFunc = (url: string, options?: OpenExternalOptions) => Promise<void>;

export type StatusState = {
  devConsole: string;
}

export type ApiEmittersState = Readonly<{
  onDidInit: ApiEmitter<void>;
  onDidConnect: ApiEmitter<void>;
  onLog: ApiEmitter<flashpoint.ILogEntry>;
  games: Readonly<{
    onWillLaunchGame: ApiEmitter<flashpoint.GameLaunchInfo>;
    onWillLaunchAddApp: ApiEmitter<flashpoint.AdditionalApp>;
    onWillLaunchCurationGame: ApiEmitter<flashpoint.GameLaunchInfo>;
    onWillLaunchCurationAddApp: ApiEmitter<flashpoint.AdditionalApp>;
    onWillUninstallGameData: ApiEmitter<flashpoint.GameData>;
    onDidLaunchGame: ApiEmitter<flashpoint.Game>;
    onDidLaunchAddApp: ApiEmitter<flashpoint.AdditionalApp>;
    onDidLaunchCurationGame: ApiEmitter<flashpoint.Game>;
    onDidLaunchCurationAddApp: ApiEmitter<flashpoint.AdditionalApp>;
    onDidUpdateGame: ApiEmitter<{oldGame: flashpoint.Game, newGame: flashpoint.Game}>;
    onDidRemoveGame: ApiEmitter<flashpoint.Game>;
    onDidUpdatePlaylist: ApiEmitter<{oldPlaylist: flashpoint.Playlist, newPlaylist: flashpoint.Playlist}>;
    onDidUpdatePlaylistGame: ApiEmitter<{oldGame: flashpoint.PlaylistGame, newGame: flashpoint.PlaylistGame}>;
    onDidRemovePlaylistGame: ApiEmitter<flashpoint.PlaylistGame>;
    onDidInstallGameData: ApiEmitter<flashpoint.GameData>;
    onDidUninstallGameData: ApiEmitter<flashpoint.GameData>;
    onWillImportCuration: ApiEmitter<flashpoint.CurationImportState>;
  }>,
  gameData: Readonly<{
    onDidImportGameData: ApiEmitter<flashpoint.GameData>;
  }>,
  services: Readonly<{
    onServiceNew: ApiEmitter<flashpoint.ManagedChildProcess>;
    onServiceRemove: ApiEmitter<flashpoint.ManagedChildProcess>;
    onServiceChange: ApiEmitter<flashpoint.ServiceChange>;
  }>,
  ext: Readonly<{
    onExtConfigChange: ApiEmitter<{key: string, value: any}>;
  }>,
}>
