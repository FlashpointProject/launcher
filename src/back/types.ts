import { EventEmitter } from 'events';
import { Server } from 'http';
import * as WebSocket from 'ws';
import { BackInit, ViewGame } from '../shared/back/types';
import { IAppConfigData } from '../shared/config/interfaces';
import { IGameInfo } from '../shared/game/interfaces';
import { GamePlaylist, IBackProcessInfo } from '../shared/interfaces';
import { LangFile } from '../shared/lang';
import { ILogEntry } from '../shared/Log/interface';
import { GameOrderBy, GameOrderReverse } from '../shared/order/interfaces';
import { IAppPreferencesData } from '../shared/preferences/interfaces';
import { Theme } from '../shared/ThemeFile';
import { GameManager } from './game/GameManager';
import { ManagedChildProcess } from './ManagedChildProcess';
import { EventQueue } from './util/EventQueue';
import { FolderWatcher } from './util/FolderWatcher';

export type BackState = {
  isInit: boolean;
  isExit: boolean;
  server: WebSocket.Server;
  fileServer: Server;
  imageServerPort: number;
  secret: string;
  preferences: IAppPreferencesData;
  config: IAppConfigData;
  configFolder: string;
  countryCode: string;
  gameManager: GameManager;
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
  themeWatcher: FolderWatcher;
  themeQueue: EventQueue;
  themeFiles: ThemeListItem[];
  playlistWatcher: FolderWatcher;
  playlistQueue: EventQueue;
  playlists: GamePlaylist[];
}

export type BackQueryChache = {
  query: BackQuery;
  games: IGameInfo[];
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

interface EmitterPart<E extends string | number | Symbol, F extends (...args: any[]) => void> {
  on(event: E, listener: F): this;
  once(event: E, listener: F): this;
  off(event: E, listener: F): this;
  emit(event: E, ...args: Parameters<F>): boolean;
}

export type ServiceFileData = {
  redirector?: IBackProcessInfo;
  fiddler?: IBackProcessInfo;
  server?: IBackProcessInfo;
  /** Processes to run before the launcher starts. */
  start: IBackProcessInfo[];
  /** Processes to run when the launcher closes. */
  stop: IBackProcessInfo[];
};

export type ThemeListItem = Theme & {
  /**
   * File or folder name of the theme (relative to the theme folder).
   * Format: X in "\X" or "\X\theme.css"
   */
  basename: string;
}
