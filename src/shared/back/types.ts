import { ChangedMeta, MetaEditFlags } from '@shared/MetaEdit';
import { EditCurationMeta } from '@shared/curate/OLD_types';
import { AddAppCuration, ContentTree, PlatformAppPathSuggestions } from '@shared/curate/types';
import { ExtensionContribution, IExtensionDescription, LogoSet } from '@shared/extensions/interfaces';
import { Legacy_GamePlatform } from '@shared/legacy/interfaces';
import { SocketTemplate } from '@shared/socket/types';
import { MessageBoxOptions, OpenDialogOptions, OpenExternalOptions, SaveDialogOptions } from 'electron';
import {
  AdvancedFilter,
  AppPreferencesData,
  ConfigSchema,
  CurationFpfssInfo,
  CurationState,
  CurationWarnings,
  DialogState,
  DialogStateTemplate,
  DownloaderStatus,
  DownloadTask,
  DownloadWorkerState,
  Game,
  GameConfig,
  GameData,
  GameDataSource,
  GameLaunchOverride,
  GameMetadataSource,
  GameMiddlewareConfig,
  GameMiddlewareInfo, GameOrderBy, GameOrderDirection,
  LoadedCuration,
  MergeTagData,
  Platform,
  Playlist,
  PlaylistGame,
  Tag,
  TagCategory,
  TagFilterGroup,
  TagSuggestion,
  ViewGame
} from 'flashpoint-launcher';
import { ILogEntry, ILogPreEntry, LogLevel } from '../Log/interface';
import { Theme } from '../ThemeFile';
import { AppConfigData, AppExtConfigData } from '../config/interfaces';
import { ExecMapping, GamePropSuggestions, IService, ProcessAction, Task } from '../interfaces';
import { LangContainer, LangFile } from '../lang';
import { GameSearchOffset, GameSearch, GameSearchOrder } from '@fparchive/flashpoint-archive';

export enum BackIn {
  UNKNOWN = 1000,

  INIT_LISTEN,
  GET_SUGGESTIONS,
  GET_GAMES_TOTAL,
  SET_LOCALE,
  GET_EXEC,
  SAVE_GAMES,
  SAVE_GAME,
  DELETE_GAME_CONFIG,
  GET_GAME,
  GET_GAMES_GAME_DATA,
  GET_GAME_DATA,
  DELETE_GAME_DATA,
  IMPORT_GAME_DATA,
  DOWNLOAD_GAME_DATA,
  UNINSTALL_GAME_DATA,
  SAVE_GAME_DATAS,
  GET_SOURCES,
  GET_ALL_GAMES,
  RANDOM_GAMES,
  LAUNCH_GAME,
  DELETE_GAME,
  DUPLICATE_GAME,
  EXPORT_GAME,
  GET_VALID_MIDDLEWARE,
  LAUNCH_ADDAPP,
  SAVE_IMAGE,
  DELETE_IMAGE,
  ADD_LOG,
  SERVICE_ACTION,
  DUPLICATE_PLAYLIST,
  IMPORT_PLAYLIST,
  EXPORT_PLAYLIST,
  DOWNLOAD_PLAYLIST_CONTENTS,
  GET_PLAYLISTS,
  GET_PLAYLIST,
  SAVE_PLAYLIST,
  DELETE_PLAYLIST,
  DELETE_ALL_PLAYLISTS,
  GET_PLAYLIST_GAME,
  ADD_PLAYLIST_GAME,
  SAVE_PLAYLIST_GAME,
  DELETE_PLAYLIST_GAME,
  RAISE_PLAYLIST_GAME,
  SAVE_LEGACY_PLATFORM,
  LAUNCH_CURATION,
  LAUNCH_CURATION_ADDAPP,
  QUIT,

  // Web?
  DOWNLOAD_PLAYLIST,

  // Tag funcs
  GET_OR_CREATE_TAG,
  GET_OR_CREATE_PLATFORM,
  GET_TAG_SUGGESTIONS,
  GET_PLATFORM_SUGGESTIONS,
  GET_TAG_BY_ID,
  GET_PLATFORM_BY_ID,
  GET_TAGS,
  GET_TAG,
  SAVE_TAG,
  DELETE_TAG,
  MERGE_TAGS,
  EXPORT_TAGS,
  EXPORT_DATABASE,
  IMPORT_TAGS,
  NUKE_TAGS,

  // Tag Category funcs
  SAVE_TAG_CATEGORY,
  GET_TAG_CATEGORY_BY_ID,
  DELETE_TAG_CATEGORY,

  // Unique Searches
  GET_DISTINCT_DEVELOPERS,
  GET_DISTINCT_PUBLISHERS,
  GET_DISTINCT_SERIES,

  /** Returns a query object for the given data */
  PARSE_QUERY_DATA,
  /** Returns all results for a search */
  BROWSE_ALL_RESULTS,
  /** Get a page of a browse view. */
  BROWSE_VIEW_PAGE,
  /** Get the first page of a browse view */
  BROWSE_VIEW_FIRST_PAGE,
  /** Get the keyset of all pages (in the results of a given query). */
  BROWSE_VIEW_KEYSET,
  /** Get all data needed on init (by the renderer). */
  GET_RENDERER_INIT_DATA,
  /** Get all misc data needed when finished loading database (by the renderer) */
  GET_RENDERER_LOADED_DATA,
  /** Get all extension data needed by the renderer */
  GET_RENDERER_EXTENSION_INFO,
  /** Get all data needed on init (by the main process). */
  GET_MAIN_INIT_DATA,
  /** Get all data needed on init (by the independent logger window) */
  GET_LOGGER_INIT_DATA,
  /** Update any number of configs. */
  UPDATE_CONFIG,
  /** Update any number of preferences. */
  UPDATE_PREFERENCES,

  // API
  SYNC_GAME_METADATA,
  SYNC_METADATA_SERVER,
  IMPORT_METADATA,
  SYNC_TAGGED,
  SYNC_ALL,

  // Meta edits
  EXPORT_META_EDIT,
  IMPORT_META_EDITS,

  // Extensions
  RUN_COMMAND,
  DOWNLOAD_EXTENSION,
  GET_MIDDLEWARE_CONFIG_SCHEMAS,
  GET_MIDDLEWARE_DEFAULT_CONFIG,
  CHECK_MIDDLEWARE_VERSION_VALIDITY,

  // FPFSS
  FPFSS_OPEN_CURATION,

  // Curate
  CURATE_LOAD_ARCHIVES,
  CURATE_GET_LIST,
  CURATE_SYNC_CURATIONS,
  CURATE_EDIT_REMOVE_IMAGE,
  CURATE_DELETE,
  CURATE_IMPORT,
  CURATE_CREATE_CURATION,
  CURATE_EXPORT,
  CURATE_EXPORT_DATA_PACK,
  CURATE_FROM_GAME,
  CURATE_REFRESH_CONTENT,
  CURATE_GEN_WARNINGS,
  CURATE_DUPLICATE,
  CURATE_SCAN_NEW_CURATIONS,

  // Misc
  OPEN_LOGS_WINDOW,
  UPLOAD_LOG,
  SET_EXT_CONFIG_VALUE,
  FETCH_DIAGNOSTICS,
  OPEN_FLASHPOINT_MANAGER,
  CANCEL_DOWNLOAD,
  DELETE_ALL_IMAGES,
  OPTIMIZE_DATABASE,
  CLEAR_WININET_CACHE,
  PRE_UPDATE_INFO,
  CLEAR_PLAYTIME_TRACKING,
  CLEAR_PLAYTIME_TRACKING_BY_ID,
  KEEP_ALIVE,
  PREP_RELOAD_WINDOW,

  // Dialogs
  DIALOG_RESPONSE,
  NEW_DIALOG_RESPONSE,

  // Tests
  TEST_RECONNECTIONS,

}

export enum BackOut {
  UNKNOWN = 0,

  INIT_EVENT,
  OPEN_MESSAGE_BOX,
  OPEN_SAVE_DIALOG,
  OPEN_OPEN_DIALOG,
  OPEN_EXTERNAL,
  LOCALE_UPDATE,
  GET_MAIN_INIT_DATA,
  UPDATE_PREFERENCES_RESPONSE,
  UPDATE_EXT_CONFIG_DATA,
  IMAGE_CHANGE,
  LOG_ENTRY_ADDED,
  SERVICE_CHANGE,
  SERVICE_REMOVED,
  LANGUAGE_CHANGE,
  LANGUAGE_LIST_CHANGE,
  IMPORT_PLAYLIST,
  PLAYLISTS_CHANGE,
  THEME_CHANGE,
  THEME_LIST_CHANGE,
  IMPORT_CURATION_RESPONSE,
  GET_TAG_SUGGESTIONS,
  GET_TAG_BY_ID,
  GET_TAGS,
  GET_TAG,
  SAVE_TAG,
  MERGE_TAGS,
  EXPORT_TAGS,
  IMPORT_TAGS,
  GET_TAG_CATEGORY_BY_ID,
  SAVE_TAG_CATEGORY,
  DELETE_TAG_CATEGORY,
  TAG_CATEGORIES_CHANGE,
  SYNC_GAME_METADATA,
  QUIT,
  RUN_COMMAND,
  UPLOAD_LOG,
  DEV_CONSOLE_CHANGE,
  OPEN_ALERT,
  SET_PLACEHOLDER_DOWNLOAD_DETAILS,
  SET_PLACEHOLDER_DOWNLOAD_PERCENT,
  OPEN_PLACEHOLDER_DOWNLOAD_DIALOG,
  CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG,
  UPDATE_COMPONENT_STATUSES,
  SET_VIEW_SEARCH_STATUS,

  // Browse
  BROWSE_VIEW_PAGE,

  // Updates?
  UPDATE_GOTD,
  UPDATE_FEED,
  UPDATE_PLATFORM_APP_PATHS,

  // Metadata Sync
  POST_SYNC_CHANGES,

  // Curate
  CURATE_CONTENTS_CHANGE,
  CURATE_LIST_CHANGE,
  CURATE_SELECT_LOCK,
  CURATE_SELECT_CURATIONS,

  UPDATE_TASK,
  CREATE_TASK,

  UPDATE_DOWNLOADER_TASK,
  UPDATE_DOWNLOADER_STATUS,
  UPDATE_DOWNLOADER_STATE_WORKER,

  FOCUS_WINDOW,

  // Shortcuts
  SHORTCUT_REGISTER_COMMAND,
  SHORTCUT_UNREGISTER,

  // Dialogs
  NEW_DIALOG,
  CANCEL_DIALOG,
  UPDATE_DIALOG_MESSAGE,
  UPDATE_DIALOG_FIELD_VALUE,

  FPFSS_ACTION
}

export const BackRes = {
  ...BackOut,
  ...BackIn
};
// Don't ask why this redeclare even works or why it's necessary, it just does and it is.
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type BackRes = BackOut | BackIn;

export type BackInTemplate = SocketTemplate<BackIn, {
  [BackIn.UNKNOWN]: () => void;

  [BackIn.INIT_LISTEN]: () => InitEventData;
  [BackIn.GET_SUGGESTIONS]: () => GetSuggestionsResponseData;
  [BackIn.GET_GAMES_GAME_DATA]: (gameId: string) => GameData[];
  [BackIn.GET_GAME_DATA]: (gameDataId: number) => GameData | null;
  [BackIn.DELETE_GAME_DATA]: (gameDataId: number) => void;
  [BackIn.GET_SOURCES]: () => GameDataSource[];
  [BackIn.DOWNLOAD_GAME_DATA]: (gameDataId: number) => void;
  [BackIn.UNINSTALL_GAME_DATA]: (id: number) => Game | null;
  [BackIn.IMPORT_GAME_DATA]: (gameId: string, path: string) => GameData;
  [BackIn.SAVE_GAME_DATAS]: (gameData: GameData[]) => void;
  [BackIn.GET_GAMES_TOTAL]: () => number;
  [BackIn.SET_LOCALE]: (data: string) => string;
  [BackIn.GET_EXEC]: () => ExecMapping[];
  [BackIn.SAVE_GAME]: (data: Game) => BrowseChangeData;
  [BackIn.DELETE_GAME_CONFIG]: (id: number) => void;
  [BackIn.SAVE_GAMES]: (data: Game[]) => void;
  [BackIn.GET_GAME]: (id: string) => Game | null;
  [BackIn.GET_ALL_GAMES]: (offsetGameTitle?: string, offsetGameId?: string) => Game[];
  [BackIn.RANDOM_GAMES]: (data: RandomGamesData) => Game[];
  [BackIn.LAUNCH_GAME]: (id: string, override: GameLaunchOverride) => void;
  [BackIn.DELETE_GAME]: (id: string) => BrowseChangeData;
  [BackIn.DUPLICATE_GAME]: (id: string, dupeImages: boolean) => BrowseChangeData;
  [BackIn.EXPORT_GAME]: (id: string, location: string, metaOnly: boolean) => void;
  [BackIn.GET_VALID_MIDDLEWARE]: (game: Game) => GameMiddlewareInfo[];
  [BackIn.LAUNCH_ADDAPP]: (id: string, override: GameLaunchOverride) => void;
  [BackIn.SAVE_IMAGE]: (folder: string, id: string, content: string) => void;
  [BackIn.DELETE_IMAGE]: (folder: string, id: string) => void;
  [BackIn.ADD_LOG]: (data: ILogPreEntry & { logLevel: LogLevel }) => void;
  [BackIn.SERVICE_ACTION]: (action: ProcessAction, id: string) => void;
  [BackIn.DUPLICATE_PLAYLIST]: (data: string) => void;
  [BackIn.IMPORT_PLAYLIST]: (filePath: string, library?: string) => void;
  [BackIn.EXPORT_PLAYLIST]: (id: string, location: string) => void;
  [BackIn.DOWNLOAD_PLAYLIST_CONTENTS]: (playlistId: string) => void;
  [BackIn.GET_PLAYLISTS]: () => Playlist[];
  [BackIn.GET_PLAYLIST]: (playlistId: string) => Playlist | undefined;
  [BackIn.SAVE_PLAYLIST]: (playlist: Playlist) => Playlist;
  [BackIn.DELETE_PLAYLIST]: (playlistId: string) => Playlist;
  [BackIn.DELETE_ALL_PLAYLISTS]: () => void;
  [BackIn.GET_PLAYLIST_GAME]: (playlistId: string, gameId: string) => PlaylistGame | null;
  [BackIn.ADD_PLAYLIST_GAME]: (playlistId: string, gameId: string) => void;
  [BackIn.SAVE_PLAYLIST_GAME]: (playlistId: string, data: PlaylistGame) => PlaylistGame;
  [BackIn.DELETE_PLAYLIST_GAME]: (playlistId: string, gameId: string) => PlaylistGame | null;
  [BackIn.RAISE_PLAYLIST_GAME]: (playlistId: string, sourceIdx: number, destIdx: number) => void;
  [BackIn.SAVE_LEGACY_PLATFORM]: (platform: Legacy_GamePlatform) => void;
  [BackIn.LAUNCH_CURATION]: (data: LaunchCurationData) => void;
  [BackIn.LAUNCH_CURATION_ADDAPP]: (data: LaunchCurationAddAppData) => void;
  [BackIn.QUIT]: () => void;

  // Web?
  [BackIn.DOWNLOAD_PLAYLIST]: (url: string) => Playlist;

  // Tag funcs
  [BackIn.GET_OR_CREATE_TAG]: (tagName: string, tagCategory?: string) => Tag | null;
  [BackIn.GET_OR_CREATE_PLATFORM]: (platformName: string) => Platform;
  [BackIn.GET_TAG_SUGGESTIONS]: (data: string, tagFilters: TagFilterGroup[]) => TagSuggestion[];
  [BackIn.GET_PLATFORM_SUGGESTIONS]: (data: string) => TagSuggestion[];
  [BackIn.GET_TAG_BY_ID]: (data: number) => Tag | null;
  [BackIn.GET_PLATFORM_BY_ID]: (data: number) => Platform | null;
  [BackIn.GET_TAGS]: (tagFilters?: TagFilterGroup[]) => Tag[];
  [BackIn.GET_TAG]: (data: string) => Tag | null;
  [BackIn.SAVE_TAG]: (data: Tag) => Tag;
  [BackIn.DELETE_TAG]: (name: string) => void;
  [BackIn.MERGE_TAGS]: (data: MergeTagData) => Tag;
  [BackIn.EXPORT_TAGS]: (data: string) => number;
  [BackIn.EXPORT_DATABASE]: (data: string) => string;
  [BackIn.IMPORT_TAGS]: (data: string) => number;
  [BackIn.NUKE_TAGS]: (tags: string[]) => Promise<void>;

  // Tag Category funcs
  [BackIn.SAVE_TAG_CATEGORY]: (data: TagCategory) => TagCategory;
  [BackIn.GET_TAG_CATEGORY_BY_ID]: (data: number) => TagCategory | null;
  [BackIn.DELETE_TAG_CATEGORY]: (data: number) => boolean;

  // Unique Searches
  [BackIn.GET_DISTINCT_DEVELOPERS]: (tagFilters?: TagFilterGroup[]) => string[];
  [BackIn.GET_DISTINCT_PUBLISHERS]: (tagFilters?: TagFilterGroup[]) => string[];
  [BackIn.GET_DISTINCT_SERIES]: (tagFilters?: TagFilterGroup[]) => string[];

  [BackIn.PARSE_QUERY_DATA]: (query: QueryData) => SearchQuery;
  [BackIn.BROWSE_ALL_RESULTS]: (searchQuery: SearchQuery) => Game[];
  [BackIn.BROWSE_VIEW_PAGE]: (search: SearchQuery) => void;
  [BackIn.BROWSE_VIEW_FIRST_PAGE]: (search: SearchQuery) => BrowseViewFirstPageResponseData;
  [BackIn.BROWSE_VIEW_KEYSET]: (search: SearchQuery) => BrowseViewKeysetResponse;
  [BackIn.GET_LOGGER_INIT_DATA]: () => GetLoggerInitDataResponse;
  [BackIn.GET_RENDERER_INIT_DATA]: () => GetRendererInitDataResponse;
  [BackIn.GET_RENDERER_LOADED_DATA]: () => GetRendererLoadedDataResponse;
  [BackIn.GET_RENDERER_EXTENSION_INFO]: () => GetRendererExtDataResponse;
  [BackIn.GET_MAIN_INIT_DATA]: () => GetMainInitDataResponse;
  [BackIn.UPDATE_CONFIG]: (data: Partial<AppConfigData>) => void;
  [BackIn.UPDATE_PREFERENCES]: (data: AppPreferencesData, refresh: boolean) => void;

  // API
  [BackIn.SYNC_GAME_METADATA]: () => GameMetadataSyncResponse;
  [BackIn.SYNC_METADATA_SERVER]: (serverInfo: MetadataServerInfo) => void;
  [BackIn.IMPORT_METADATA]: (metadata: any) => void;

  // Meta edits
  [BackIn.EXPORT_META_EDIT]: (id: string, properties: MetaEditFlags) => void;
  [BackIn.IMPORT_META_EDITS]: () => ImportMetaEditResult;

  // Extensions
  [BackIn.RUN_COMMAND]: (command: string, args?: any[]) => RunCommandResponse;
  [BackIn.DOWNLOAD_EXTENSION]: (downloadPath: string) => void;
  [BackIn.GET_MIDDLEWARE_CONFIG_SCHEMAS]: (mIds: MiddlewareVersionPair[]) => MiddlewareSchemasResponse;
  [BackIn.GET_MIDDLEWARE_DEFAULT_CONFIG]: (middlewareId: string, game: Game) => GameMiddlewareNewConfig;
  [BackIn.CHECK_MIDDLEWARE_VERSION_VALIDITY]: (middlewareId: string, version: string) => boolean;

  // FPFSS
  [BackIn.FPFSS_OPEN_CURATION]: (fpfssInfo: CurationFpfssInfo, url: string, accessToken: string, taskId: string) => void;

  // Curate
  [BackIn.CURATE_LOAD_ARCHIVES]: (filePaths: string[], taskId?: string) => void;
  [BackIn.CURATE_GET_LIST]: () => CurationState[];
  [BackIn.CURATE_SYNC_CURATIONS]: (curations: CurationState[]) => void;
  [BackIn.CURATE_EDIT_REMOVE_IMAGE]: (folder: string, type: CurationImageEnum) => void;
  [BackIn.CURATE_DELETE]: (folders: string[], taskId?: string) => void;
  [BackIn.CURATE_IMPORT]: (data: ImportCurationData) => ImportCurationResponseData;
  [BackIn.CURATE_CREATE_CURATION]: (folder: string, meta?: EditCurationMeta) => void;
  [BackIn.CURATE_EXPORT]: (curations: LoadedCuration[], taskId?: string) => void;
  [BackIn.CURATE_EXPORT_DATA_PACK]: (curations: LoadedCuration[], taskId?: string) => void;
  [BackIn.CURATE_FROM_GAME]: (gameId: string, taskId?: string) => string | undefined;
  [BackIn.CURATE_REFRESH_CONTENT]: (folder: string) => void;
  [BackIn.CURATE_GEN_WARNINGS]: (curation: CurationState) => CurationWarnings;
  [BackIn.CURATE_DUPLICATE]: (folders: string[]) => void;
  [BackIn.CURATE_SCAN_NEW_CURATIONS]: () => void;

  // Misc
  [BackIn.OPEN_LOGS_WINDOW]: () => void;
  [BackIn.UPLOAD_LOG]: () => string | undefined;
  [BackIn.SET_EXT_CONFIG_VALUE]: (key: string, value: any) => void;
  [BackIn.FETCH_DIAGNOSTICS]: () => string;
  [BackIn.OPEN_FLASHPOINT_MANAGER]: () => void;
  [BackIn.CANCEL_DOWNLOAD]: () => void;
  [BackIn.DELETE_ALL_IMAGES]: () => void;
  [BackIn.OPTIMIZE_DATABASE]: () => void;
  [BackIn.CLEAR_WININET_CACHE]: () => void;
  [BackIn.PRE_UPDATE_INFO]: (source: GameMetadataSource) => number;
  [BackIn.CLEAR_PLAYTIME_TRACKING]: () => Promise<void>;
  [BackIn.CLEAR_PLAYTIME_TRACKING_BY_ID]: (gameId: string) => Promise<void>;
  [BackIn.KEEP_ALIVE]: () => void;
  [BackIn.PREP_RELOAD_WINDOW]: () => void;

  // Developer
  [BackIn.SYNC_TAGGED]: (source: GameMetadataSource) => void;
  [BackIn.SYNC_ALL]: (source: GameMetadataSource) => boolean;

  // Dialogs
  [BackIn.DIALOG_RESPONSE]: (dialog: DialogState, button: number) => void;
  [BackIn.NEW_DIALOG_RESPONSE]: (dialogId: string, responseId: string) => void;

  // Tests
  [BackIn.TEST_RECONNECTIONS]: () => void;

}>

export type BackOutTemplate = SocketTemplate<BackOut, {
  [BackOut.UNKNOWN]: () => void;

  [BackOut.INIT_EVENT]: (data: InitEventData) => void;
  [BackOut.OPEN_MESSAGE_BOX]: (options: MessageBoxOptions) => number;
  [BackOut.OPEN_SAVE_DIALOG]: (options: SaveDialogOptions) => string | undefined;
  [BackOut.OPEN_OPEN_DIALOG]: (options: OpenDialogOptions) => string[] | undefined;
  [BackOut.OPEN_EXTERNAL]: (url: string, options?: OpenExternalOptions) => void;
  [BackOut.LOCALE_UPDATE]: (data: string) => void;
  [BackOut.GET_MAIN_INIT_DATA]: () => void;
  [BackOut.UPDATE_PREFERENCES_RESPONSE]: (data: AppPreferencesData) => void;
  [BackOut.UPDATE_EXT_CONFIG_DATA]: (data: AppExtConfigData) => void;
  [BackOut.IMAGE_CHANGE]: (folder: string, id: string) => void;
  [BackOut.LOG_ENTRY_ADDED]: (entry: ILogEntry, index: number) => void;
  [BackOut.SERVICE_CHANGE]: (data: IService) => void;
  [BackOut.SERVICE_REMOVED]: (processId: string) => void;
  [BackOut.LANGUAGE_CHANGE]: (data: LangContainer) => void;
  [BackOut.LANGUAGE_LIST_CHANGE]: (data: LangFile[]) => void;
  [BackOut.IMPORT_PLAYLIST]: (data: Playlist) => void;
  [BackOut.PLAYLISTS_CHANGE]: (data: Playlist[]) => void;
  [BackOut.THEME_CHANGE]: (theme: Theme) => void;
  [BackOut.THEME_LIST_CHANGE]: (themes: Theme[]) => void;
  [BackOut.IMPORT_CURATION_RESPONSE]: () => void;
  [BackOut.GET_TAG_SUGGESTIONS]: (data: TagSuggestion[]) => void;
  [BackOut.GET_TAG_BY_ID]: (SAVE_TAGdata: Tag | null) => Tag | undefined;
  [BackOut.GET_TAGS]: (data: Tag[]) => void;
  [BackOut.GET_TAG]: (data: Tag | null) => void;
  [BackOut.SAVE_TAG]: (data: Tag) => void;
  [BackOut.MERGE_TAGS]: (newTag: Tag) => void;
  [BackOut.EXPORT_TAGS]: (data: number) => void;
  [BackOut.IMPORT_TAGS]: (data: number) => void;
  [BackOut.GET_TAG_CATEGORY_BY_ID]: (data: TagCategory | null) => void;
  [BackOut.SAVE_TAG_CATEGORY]: (data: TagCategory) => void;
  [BackOut.DELETE_TAG_CATEGORY]: (data: boolean) => void;
  [BackOut.TAG_CATEGORIES_CHANGE]: (cats: TagCategory[]) => void;
  [BackOut.SYNC_GAME_METADATA]: (data: GameMetadataSyncResponse) => void;
  [BackOut.QUIT]: () => void;
  [BackOut.RUN_COMMAND]: (data: RunCommandResponse) => void;
  [BackOut.UPLOAD_LOG]: (getUrl: string | undefined) => void;
  [BackOut.DEV_CONSOLE_CHANGE]: (text: string) => void;
  [BackOut.OPEN_ALERT]: (text: string) => void;
  [BackOut.SET_PLACEHOLDER_DOWNLOAD_DETAILS]: (details: DownloadDetails) => void;
  [BackOut.SET_PLACEHOLDER_DOWNLOAD_PERCENT]: (percent: number) => void;
  [BackOut.OPEN_PLACEHOLDER_DOWNLOAD_DIALOG]: () => void;
  [BackOut.CLOSE_PLACEHOLDER_DOWNLOAD_DIALOG]: () => void;
  [BackOut.UPDATE_COMPONENT_STATUSES]: (componentStatuses: ComponentStatus[]) => void;
  [BackOut.SET_VIEW_SEARCH_STATUS]: (viewId: string, status: string | null) => void;

  // Browse
  [BackOut.BROWSE_VIEW_PAGE]: (data: BrowsePageResponseData) => void;

  // Updates?
  [BackOut.UPDATE_GOTD]: (gotd: GameOfTheDay[]) => void;
  [BackOut.UPDATE_FEED]: (markdown: string) => void;
  [BackOut.UPDATE_PLATFORM_APP_PATHS]: (paths: PlatformAppPathSuggestions) => void;

  // Metadata Sync
  [BackOut.POST_SYNC_CHANGES]: (libraries: string[], suggestions: GamePropSuggestions, platformAppPaths: PlatformAppPathSuggestions, cats: TagCategory[], total: number) => void;

  // Curate
  [BackOut.CURATE_CONTENTS_CHANGE]: (folder: string, contents: ContentTree) => void;
  [BackOut.CURATE_LIST_CHANGE]: (added?: CurationState[], removed?: string[]) => void; // "removed" is the folder names of the removed curations
  [BackOut.CURATE_SELECT_LOCK]: (folder: string, locked: boolean) => void;
  [BackOut.CURATE_SELECT_CURATIONS]: (folders: string[]) => void;

  // Tasks
  [BackOut.UPDATE_TASK]: (task: Partial<Task>) => void;
  [BackOut.CREATE_TASK]: (task: Task) => void;

  [BackOut.UPDATE_DOWNLOADER_TASK]: (task: DownloadTask) => void;
  [BackOut.UPDATE_DOWNLOADER_STATUS]: (state: DownloaderStatus) => void;
  [BackOut.UPDATE_DOWNLOADER_STATE_WORKER]: (worker: DownloadWorkerState) => void;

  [BackOut.FOCUS_WINDOW]: () => void;

  // Shortcuts
  [BackOut.SHORTCUT_REGISTER_COMMAND]: (command: string, shortcuts: string[]) => void;
  [BackOut.SHORTCUT_UNREGISTER]: (shortcuts: string[]) => void;

  // Dialogs
  [BackOut.NEW_DIALOG]: (template: DialogStateTemplate, responseId: string) => void;
  [BackOut.CANCEL_DIALOG]: (dialogId: string) => void;
  [BackOut.UPDATE_DIALOG_MESSAGE]: (message: string, dialogId: string) => void;
  [BackOut.UPDATE_DIALOG_FIELD_VALUE]: (dialogId: string, name: string, value: any) => void;

  [BackOut.FPFSS_ACTION]: (extId: string) => FpfssUser | undefined;
}>

export type BackResTemplate = BackOutTemplate & BackInTemplate;
export type BackResParams<T extends BackRes> = Parameters<BackResTemplate[T]>;
export type BackResReturnTypes<T extends BackRes> = ReturnType<BackResTemplate[T]>;

export type BackInitArgs = {
  /** Path to the folder containing the preferences and config files. */
  configFolder: string;
  /** Secret string used for authentication. */
  secret: string;
  isDev: boolean;
  verbose: boolean;
  localeCode: string;
  exePath: string;
  /** If the back should accept remote clients to connect (renderers from different machines). */
  acceptRemote: boolean;
  /** Semver of the launcher. */
  version: string;
}

export enum BackInit {
  SERVICES,
  DATABASE_READY,
  DATABASE,
  PLAYLISTS,
  EXTENSIONS,
  EXEC_MAPPINGS,
  CURATE,
}

export type InitEventData = {
  done: BackInit[];
}

export type GetMainInitDataResponse = {
  config: AppConfigData;
  preferences: AppPreferencesData;
}

export type GetLoggerInitDataResponse = {
  config: AppConfigData;
  preferences: AppPreferencesData;
  log: ILogEntry[];
}

export type GetRendererExtDataResponse = {
  extensions: IExtensionDescription[];
  devScripts: ExtensionContribution<'devScripts'>[];
  contextButtons: ExtensionContribution<'contextButtons'>[];
  curationTemplates: ExtensionContribution<'curationTemplates'>[];
  extConfigs: ExtensionContribution<'configuration'>[];
  extConfig: AppExtConfigData;
}

export type GameMiddlewareNewConfig = {
  config: GameMiddlewareConfig,
  schema: ConfigSchema,
}

export type GameOfTheDay = {
  id: string;
  author?: string;
  description: string;
  date: string;
}

export type GetRendererLoadedDataResponse = {
  gotdList: GameOfTheDay[] | undefined,
  services: IService[];
  libraries: string[];
  suggestions: GamePropSuggestions;
  serverNames: string[];
  mad4fpEnabled: boolean;
  tagCategories: TagCategory[];
  logoSets: LogoSet[];
  platformAppPaths: PlatformAppPathSuggestions;
  componentStatuses: ComponentStatus[];
  shortcuts: Record<string, string[]>;
}

export type GetRendererInitDataResponse = {
  config: AppConfigData;
  preferences: AppPreferencesData;
  fileServerPort: number;
  log: ILogEntry[];
  customVersion?: string;
  languages: LangFile[];
  language: LangContainer;
  themes: Theme[];
  localeCode: string;
}

export type GetSuggestionsResponseData = {
  suggestions: GamePropSuggestions;
  platformAppPaths: PlatformAppPathSuggestions;
}

export type RandomGamesData = {
  count: number;
  excludedLibraries: string[];
}

/** A set of page tuples. The keys in the record are page indices. */
export type PageKeyset = GameSearchOffset[];

export type BrowseViewKeysetResponse = {
  /** Keyset */
  keyset: PageKeyset;
  /** Total results */
  total: number;
};

export type BrowseViewFirstPageResponseData = {
  /** Games in the first page */
  games: Game[];
}

export type BrowsePageResponseData = {
  viewId: string,
  searchId: number,
  page: number,
  games: ViewGame[]
}

export type BrowseChangeData = Game | null;

export type ImportCurationData = {
  curations: LoadedCuration[];
  log?: boolean;
  /**
   * Note: This will have the incorrect prototype after being sent.
   * Wrapping it new a new date object seems to work ("new Date(date)").
   */
  date?: Date;
  saveCuration: boolean;
  taskId?: string;
}

export type ImportCurationResponseData = {
  error?: any;
}

export type LaunchCurationData = {
  curation: LoadedCuration;
  mad4fp: boolean;
  symlinkCurationContent: boolean;
  override: GameLaunchOverride;
}

export type LaunchCurationAddAppData = {
  folder: string;
  addApp: AddAppCuration;
  platforms?: Platform[];
  symlinkCurationContent: boolean;
  override: GameLaunchOverride;
}

export type GameMetadataSyncResponse = {
  total: number;
  successes: number;
  error?: string;
}

export type ImportMetaEditResult = {
  /** If the import was aborted (either by the user or by the launcher). */
  aborted: boolean;
  errors?: Error[];
  changedMetas?: ChangedMeta[];
  gameNotFound?: MetaEditGameNotFound[];
}

export type MetaEditGameNotFound = {
  filenames: string[];
  id: string;
}

export type RunCommandResponse = {
  success: boolean;
  res: any;
}

export type DownloadDetails = {
  downloadSize: number;
}

export enum CurationImageEnum {
  THUMBNAIL,
  SCREENSHOT
}

export enum ComponentState {
  UNINSTALLED,
  UP_TO_DATE,
  NEEDS_UPDATE,
}

export type ComponentStatus = {
  id: string;
  name: string;
  state: ComponentState
}

export type MetadataServerInfo = {
  name: string;
  host: string;
  type: 'raw' | 'python';
}

export type FpfssUser = {
  username: string;
  userId: number;
  avatarUrl: string;
  roles: string[];
  accessToken: string;
}

export type FpfssState = {
  user: FpfssUser | null;
  editingGame: Game | null;
}

export enum ArchiveState {
  NotArchived = 0,
  Archived,
  Available
}

export type FetchedGameInfo = {
  game: Game;
  activeConfig: GameConfig | null;
  configs: GameConfig[];
}

export type MiddlewareSchemasResponse = Record<string, ConfigSchema>;

export type MiddlewareVersionPair = {
  id: string,
  version: string
}

export type QueryData = {
  viewId: string;
  searchId: number;
  orderBy: GameOrderBy;
  orderDirection: GameOrderDirection;
  text: string;
  advancedFilter: AdvancedFilter;
  playlist?: Playlist;
}

export type SearchQuery = GameSearch & {
  viewId: string;
  searchId: number;
  page: number;
  playlist?: Playlist;
}
