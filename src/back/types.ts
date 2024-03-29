import { BackInit, ComponentStatus } from '@shared/back/types';
import { AppConfigData, AppExtConfigData } from '@shared/config/interfaces';
import { ExecMapping, GamePropSuggestions, IBackProcessInfo, INamedBackProcessInfo } from '@shared/interfaces';
import { LangContainer, LangFile } from '@shared/lang';
import { ILogEntry } from '@shared/Log/interface';
import { OpenDialogOptions, OpenExternalOptions, SaveDialogOptions } from 'electron';
import { EventEmitter } from 'events';
import * as flashpoint from 'flashpoint-launcher';
import { Game, GameOrderBy, GameOrderReverse, TagCategory, ViewGame } from 'flashpoint-launcher';
import { IncomingMessage, ServerResponse } from 'http';
import * as WebSocket from 'ws';
import { ApiEmitter } from './extensions/ApiEmitter';
import { ExtensionService } from './extensions/ExtensionService';
import { InterceptorState as ModuleInterceptorState } from './extensions/NodeInterceptor';
import { Registry } from './extensions/types';
import { InstancedAbortController } from './InstancedAbortController';
import { ManagedChildProcess } from './ManagedChildProcess';
import { SocketServer } from './SocketServer';
import { EventQueue } from './util/EventQueue';
import { FileServer } from './util/FileServer';
import { FolderWatcher } from './util/FolderWatcher';
import { LogFile } from './util/LogFile';
import { PlatformAppPathSuggestions } from '@shared/curate/types';

/** Contains most state for the back process. */
export type BackState = {
  // @TODO Write comments for these properties
  readyForInit: boolean;
  runInit: boolean;
  isExit: boolean;
  isDev: boolean;
  verbose: boolean;
  socketServer: SocketServer;
  fileServer: FileServer;
  fileServerPort: number;
  fileServerDownloads: {
    queue: ImageDownloadItem[];
    current: ImageDownloadItem[];
  };
  preferences: flashpoint.AppPreferencesData;
  config: AppConfigData;
  extConfig: AppExtConfigData;
  configFolder: string;
  exePath: string;
  localeCode: string;
  version: string;
  versionStr: string;
  suggestions: GamePropSuggestions;
  logFile: LogFile;
  customVersion?: string,
  acceptRemote: boolean;
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
  playlists: flashpoint.Playlist[];
  execMappings: ExecMapping[];
  lastLinkedCurationKey: string;
  moduleInterceptor: ModuleInterceptorState;
  readonly status: StatusState,
  readonly apiEmitters: ApiEmittersState,
  readonly registry: Registry;
  extensionsService: ExtensionService;
  /** Path of the SevenZip binary. */
  sevenZipPath: string;
  /** All currently loaded curations. */
  loadedCurations: flashpoint.CurationState[];
  /** Most recent app paths that were fetched from the database (cached in the back so it's available for the curation stuff /obelisk). */
  platformAppPaths: PlatformAppPathSuggestions;
  writeLocks: number;
  prefsQueue: EventQueue;
  logsWindowProc?: ManagedChildProcess;
  pathVar?: string;
  componentStatuses: ComponentStatus[];
  newDialogEvents: EventEmitter;
  resolveDialogEvents: EventEmitter;
  downloadController: InstancedAbortController;
  shortcuts: Record<string, string[]>;
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

export type DatabaseExportFile = {
  tags: TagsFile,
  games: Game[],
  platforms: PlatformsFile,
}

type PlatformsFile = {
  platforms: flashpoint.Platform[];
}

export type TagsFile = {
  categories: TagCategory[];
  tags: flashpoint.Tag[];
}

export type ShowMessageBoxFunc = (options: flashpoint.DialogStateTemplate) => Promise<string>;
export type ShowMessageBoxBroadcastFunc = (options: flashpoint.DialogStateTemplate) => void;
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
  curations: Readonly <{
    onDidCurationListChange: ApiEmitter<{ added?: flashpoint.CurationState[], removed?: string[] }>;
    onDidCurationChange: ApiEmitter<flashpoint.CurationState>;
    onWillGenCurationWarnings: ApiEmitter<{
      curation: flashpoint.LoadedCuration,
      warnings: flashpoint.CurationWarnings
    }>;
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

export type MetadataRaw = {
  games: MetadataGame[];
  tags: MetadataTag[];
  platforms: MetadataPlatform[];
  categories: MetadataCategory[];
}

export type MetadataAddApp = {
  applicationPath: string;
  autoRunBefore?: number;
  id: string;
  launchCommand: string;
  name: string;
  parentGameId: string;
  waitForExit?: number;
}

export type MetadataGameData = {
  id: number;
  gameId: string;
  title: string;
  dateAdded: string;
  sha256: string;
  crc32: number;
  size: number;
  parameters?: string;
}

export type MetadataGame = {
  addApps: MetadataAddApp[];
  gameData: MetadataGameData[];
  tags: number[];
  platforms: number[];
  id: string;
  title: string;
  alternateTitles: string;
  series: string;
  developer: string;
  publisher: string;
  status: string;
  extreme: boolean;
  source: string;
  launchCommand: string;
  library: string;
  notes: string;
  curationNotes: string;
  applicationPath: string;
  playMode: string;
  releaseDate: string;
  version: string;
  originalDescription: string;
  mountParameters: string;
  language: string;
  dateAdded: string;
  platformsStr: string;
  tagsStr: string;
  parentGameId?: string;
  activeDataId?: number;
}

export type MetadataTag = {
  id: number;
  dateModified: string;
  description?: string;
  categoryId: number;
  tagAliases: MetadataTagAlias[];
  primaryAliasId: number;
}

export type MetadataTagAlias = {
  id: number;
  name: string;
  tagId: number;
}

export type MetadataPlatform = {
  id: number;
  dateModified: string;
  description?: string;
  platformAliases: MetadataPlatformAlias[];
  primaryAliasId: number;
}

export type MetadataPlatformAlias = {
  id: number;
  name: string;
  platformId: number;
}

export type MetadataCategory = {
  id: number;
  name: string;
  color: string;
  description?: string
}
