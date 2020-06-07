import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { BackInit, ViewGame } from '@shared/back/types';
import { IAppConfigData } from '@shared/config/interfaces';
import { ExecMapping, IBackProcessInfo, INamedBackProcessInfo } from '@shared/interfaces';
import { LangContainer, LangFile } from '@shared/lang';
import { ILogEntry, ILogPreEntry } from '@shared/Log/interface';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { IAppPreferencesData } from '@shared/preferences/interfaces';
import { Theme } from '@shared/ThemeFile';
import { MessageBoxOptions, OpenExternalOptions } from 'electron';
import { EventEmitter } from 'events';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { Connection } from 'typeorm';
import * as WebSocket from 'ws';
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
  themeWatcher: FolderWatcher;
  themeQueue: EventQueue;
  themeFiles: ThemeListItem[];
  playlists: Playlist[];
  execMappings: ExecMapping[];
  lastLinkedCurationKey: string;
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
export interface EmitterPart<E extends string | number | Symbol, F extends (...args: any[]) => void> {
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

export type ThemeListItem = Theme & {
  /**
   * File or folder name of the theme (relative to the theme folder).
   * Format: X in "\X" or "\X\theme.css"
   */
  basename: string;
}

export type LogFunc = (entry: ILogPreEntry) => void;
export type OpenDialogFunc = (options: MessageBoxOptions) => Promise<number>;
export type OpenExternalFunc = (url: string, options?: OpenExternalOptions) => Promise<void>;
