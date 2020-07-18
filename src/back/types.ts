import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { TagCategory } from '@database/entity/TagCategory';
import { BackInit, ViewGame } from '@shared/back/types';
import { IAppConfigData } from '@shared/config/interfaces';
import { ExecMapping, IBackProcessInfo, INamedBackProcessInfo } from '@shared/interfaces';
import { LangContainer, LangFile } from '@shared/lang';
import { ILogEntry } from '@shared/Log/interface';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { IAppPreferencesData } from '@shared/preferences/interfaces';
import { MessageBoxOptions, OpenExternalOptions, SaveDialogOptions, OpenDialogOptions } from 'electron';
import { EventEmitter } from 'events';
import * as flashpoint from 'flashpoint';
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
  preferences: IAppPreferencesData;
  config: IAppConfigData;
  configFolder: string;
  exePath: string;
  localeCode: string;
  version: string;
  customVersion?: string,
  gameManager: GameManagerState;
  messageQueue: WebSocket.MessageEvent[];
  isHandling: boolean;
  init: { [key in BackInit]: boolean; };
  initEmitter: InitEmitter;
  queries: Record<string, BackQueryChache>;
  log: ILogEntry[];
  serviceInfo?: ServiceFileData;
  services: Record<string, ManagedChildProcess>;
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
  /** Processes to run before the launcher starts. */
  start: IBackProcessInfo[];
  /** Processes to run when the launcher closes. */
  stop: IBackProcessInfo[];
  /** Files to watch and run continous logging on */
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
  devConsoleText: string;
}

export type ApiEmittersState = {
  games: {
    onDidLaunchGame: ApiEmitter<flashpoint.Game>;
    onDidUpdateGame: ApiEmitter<flashpoint.Game>;
    onDidRemoveGame: ApiEmitter<flashpoint.Game>;
  }
}
