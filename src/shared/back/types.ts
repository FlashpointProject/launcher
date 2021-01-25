import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import { ExtensionContribution, IExtensionDescription, LogoSet } from '@shared/extensions/interfaces';
import { FilterGameOpts } from '@shared/game/GameFilter';
import { Legacy_GamePlatform } from '@shared/legacy/interfaces';
import { ChangedMeta, MetaEditFlags } from '@shared/MetaEdit';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { SocketTemplate } from '@shared/socket/types';
import { MessageBoxOptions, OpenDialogOptions, OpenExternalOptions, SaveDialogOptions } from 'electron';
import { AppConfigData, AppExtConfigData } from '../config/interfaces';
import { EditAddAppCuration, EditAddAppCurationMeta, EditCuration, EditCurationMeta } from '../curate/types';
import { ExecMapping, GamePropSuggestions, IService, ProcessAction } from '../interfaces';
import { LangContainer, LangFile } from '../lang';
import { ILogEntry, ILogPreEntry, LogLevel } from '../Log/interface';
import { AppPreferencesData } from '../preferences/interfaces';
import { Theme } from '../ThemeFile';

export enum BackIn {
  UNKNOWN,

  INIT_LISTEN,
  GET_SUGGESTIONS,
  GET_GAMES_TOTAL,
  SET_LOCALE,
  GET_EXEC,
  SAVE_GAME,
  GET_GAME,
  GET_ALL_GAMES,
  RANDOM_GAMES,
  LAUNCH_GAME,
  DELETE_GAME,
  DUPLICATE_GAME,
  EXPORT_GAME,
  LAUNCH_ADDAPP,
  SAVE_IMAGE,
  DELETE_IMAGE,
  ADD_LOG,
  SERVICE_ACTION,
  DUPLICATE_PLAYLIST,
  IMPORT_PLAYLIST,
  EXPORT_PLAYLIST,
  GET_PLAYLISTS,
  GET_PLAYLIST,
  SAVE_PLAYLIST,
  DELETE_PLAYLIST,
  DELETE_ALL_PLAYLISTS,
  GET_PLAYLIST_GAME,
  ADD_PLAYLIST_GAME,
  SAVE_PLAYLIST_GAME,
  DELETE_PLAYLIST_GAME,
  SAVE_LEGACY_PLATFORM,
  IMPORT_CURATION,
  LAUNCH_CURATION,
  LAUNCH_CURATION_ADDAPP,
  QUIT,

  // Tag funcs
  GET_OR_CREATE_TAG,
  GET_TAG_SUGGESTIONS,
  GET_TAG_BY_ID,
  GET_TAGS,
  GET_TAG,
  SAVE_TAG,
  DELETE_TAG,
  MERGE_TAGS,
  CLEANUP_TAG_ALIASES,
  CLEANUP_TAGS,
  FIX_TAG_PRIMARY_ALIASES,
  EXPORT_TAGS,
  IMPORT_TAGS,

  // Tag Category funcs
  SAVE_TAG_CATEGORY,
  GET_TAG_CATEGORY_BY_ID,
  DELETE_TAG_CATEGORY,

  /** Get a page of a browse view. */
  BROWSE_VIEW_PAGE,
  /** Get the index of a specific game (in the results of a given query). */
  BROWSE_VIEW_INDEX,
  /** Get the keyset of all pages (in the results of a given query). */
  BROWSE_VIEW_KEYSET,
  /** Get all data needed on init (by the renderer). */
  GET_RENDERER_INIT_DATA,
  /** Get all data needed on init (by the renderer). */
  GET_MAIN_INIT_DATA,
  /** Update any number of configs. */
  UPDATE_CONFIG,
  /** Update any number of preferences. */
  UPDATE_PREFERENCES,

  // API
  SYNC_GAME_METADATA,

  // Meta edits
  EXPORT_META_EDIT,
  IMPORT_META_EDITS,

  // Extensions
  RUN_COMMAND,

  // Misc
  UPLOAD_LOG,
  SET_EXT_CONFIG_VALUE,
}

export enum BackOut {
  UNKNOWN,

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
  FIX_TAG_PRIMARY_ALIASES,
  SYNC_GAME_METADATA,
  QUIT,
  RUN_COMMAND,
  UPLOAD_LOG,
  DEV_CONSOLE_CHANGE,
}

export type BackInTemplate = SocketTemplate<BackIn, {
  [BackIn.UNKNOWN]: () => void;

  [BackIn.INIT_LISTEN]: () => InitEventData;
  [BackIn.GET_SUGGESTIONS]: () => GetSuggestionsResponseData;
  [BackIn.GET_GAMES_TOTAL]: () => number;
  [BackIn.SET_LOCALE]: (data: string) => string;
  [BackIn.GET_EXEC]: () => ExecMapping[];
  [BackIn.SAVE_GAME]: (data: Game) => BrowseChangeData;
  [BackIn.GET_GAME]: (id: string) => Game | undefined;
  [BackIn.GET_ALL_GAMES]: () => Game[];
  [BackIn.RANDOM_GAMES]: (data: RandomGamesData) => ViewGame[];
  [BackIn.LAUNCH_GAME]: (id: string) => void;
  [BackIn.DELETE_GAME]: (id: string) => BrowseChangeData;
  [BackIn.DUPLICATE_GAME]: (id: string, dupeImages: boolean) => BrowseChangeData;
  [BackIn.EXPORT_GAME]: (id: string, location: string, metaOnly: boolean) => void;
  [BackIn.LAUNCH_ADDAPP]: (id: string) => void;
  [BackIn.SAVE_IMAGE]: (folder: string, id: string, content: string) => void;
  [BackIn.DELETE_IMAGE]: (folder: string, id: string) => void;
  [BackIn.ADD_LOG]: (data: ILogPreEntry & { logLevel: LogLevel }) => void;
  [BackIn.SERVICE_ACTION]: (action: ProcessAction, id: string) => void;
  [BackIn.DUPLICATE_PLAYLIST]: (data: string) => void;
  [BackIn.IMPORT_PLAYLIST]: (filePath: string, library?: string) => void;
  [BackIn.EXPORT_PLAYLIST]: (id: string, location: string) => void;
  [BackIn.GET_PLAYLISTS]: () => Playlist[];
  [BackIn.GET_PLAYLIST]: (playlistId: string) => Playlist;
  [BackIn.SAVE_PLAYLIST]: (playlist: Playlist) => Playlist;
  [BackIn.DELETE_PLAYLIST]: (playlistId: string) => Playlist;
  [BackIn.DELETE_ALL_PLAYLISTS]: () => void;
  [BackIn.GET_PLAYLIST_GAME]: (playlistId: string, gameId: string) => PlaylistGame | undefined;
  [BackIn.ADD_PLAYLIST_GAME]: (playlistId: string, gameId: string) => void;
  [BackIn.SAVE_PLAYLIST_GAME]: (data: PlaylistGame) => PlaylistGame;
  [BackIn.DELETE_PLAYLIST_GAME]: (playlistId: string, gameId: string) => PlaylistGame | undefined;
  [BackIn.SAVE_LEGACY_PLATFORM]: (platform: Legacy_GamePlatform) => void;
  [BackIn.IMPORT_CURATION]: (data: ImportCurationData) => ImportCurationResponseData;
  [BackIn.LAUNCH_CURATION]: (data: LaunchCurationData) => void;
  [BackIn.LAUNCH_CURATION_ADDAPP]: (data: LaunchCurationAddAppData) => void;
  [BackIn.QUIT]: () => void;

  // Tag funcs
  [BackIn.GET_OR_CREATE_TAG]: (tagName: string, tagCategory?: string) => Tag;
  [BackIn.GET_TAG_SUGGESTIONS]: (data: string) => TagSuggestion[];
  [BackIn.GET_TAG_BY_ID]: (data: number) => Tag | undefined;
  [BackIn.GET_TAGS]: (data: string) => Tag[];
  [BackIn.GET_TAG]: (data: string) => Tag | undefined;
  [BackIn.SAVE_TAG]: (data: Tag) => Tag;
  [BackIn.DELETE_TAG]: (data: number) => TagDeleteResponse;
  [BackIn.MERGE_TAGS]: (data: MergeTagData) => Tag;
  [BackIn.CLEANUP_TAG_ALIASES]: () => void;
  [BackIn.CLEANUP_TAGS]: () => void;
  [BackIn.FIX_TAG_PRIMARY_ALIASES]: (data: null) => number;
  [BackIn.EXPORT_TAGS]: (data: string) => number;
  [BackIn.IMPORT_TAGS]: (data: string) => number;

  // Tag Category funcs
  [BackIn.SAVE_TAG_CATEGORY]: (data: TagCategory) => TagCategory;
  [BackIn.GET_TAG_CATEGORY_BY_ID]: (data: number) => TagCategory | undefined;
  [BackIn.DELETE_TAG_CATEGORY]: (data: number) => boolean;

  [BackIn.BROWSE_VIEW_PAGE]: (data: BrowseViewPageData) => BrowseViewPageResponseData;
  /** @returns Index of the game (equal to or greater than 0 if found, otherwise -1). */
  [BackIn.BROWSE_VIEW_INDEX]: (gameId: string, query: SearchGamesOpts) => number;
  [BackIn.BROWSE_VIEW_KEYSET]: (library: string, query: SearchGamesOpts) => BrowseViewKeysetResponse;
  [BackIn.GET_RENDERER_INIT_DATA]: () => GetRendererInitDataResponse;
  [BackIn.GET_MAIN_INIT_DATA]: () => GetMainInitDataResponse;
  [BackIn.UPDATE_CONFIG]: (data: Partial<AppConfigData>) => void;
  [BackIn.UPDATE_PREFERENCES]: (data: AppPreferencesData) => void;

  // API
  [BackIn.SYNC_GAME_METADATA]: () => GameMetadataSyncResponse;

  // Meta edits
  [BackIn.EXPORT_META_EDIT]: (id: string, properties: MetaEditFlags) => void;
  [BackIn.IMPORT_META_EDITS]: () => ImportMetaEditResult;

  // Extensions
  [BackIn.RUN_COMMAND]: (command: string, args?: any[]) => RunCommandResponse;

  // Misc
  [BackIn.UPLOAD_LOG]: () => string | undefined;
  [BackIn.SET_EXT_CONFIG_VALUE]: (key: string, value: any) => void;
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
  [BackOut.GET_TAG_BY_ID]: (SAVE_TAGdata: Tag | undefined) => Tag | undefined;
  [BackOut.GET_TAGS]: (data: Tag[]) => void;
  [BackOut.GET_TAG]: (data: Tag | undefined) => void;
  [BackOut.SAVE_TAG]: (data: Tag) => void;
  [BackOut.MERGE_TAGS]: (newTag: Tag) => void;
  [BackOut.EXPORT_TAGS]: (data: number) => void;
  [BackOut.IMPORT_TAGS]: (data: number) => void;
  [BackOut.GET_TAG_CATEGORY_BY_ID]: (data: TagCategory | undefined) => void;
  [BackOut.SAVE_TAG_CATEGORY]: (data: TagCategory) => void;
  [BackOut.DELETE_TAG_CATEGORY]: (data: boolean) => void;
  [BackOut.TAG_CATEGORIES_CHANGE]: (cats: TagCategory[]) => void;
  [BackOut.FIX_TAG_PRIMARY_ALIASES]: (data: number) => void;
  [BackOut.SYNC_GAME_METADATA]: (data: GameMetadataSyncResponse) => void;
  [BackOut.QUIT]: () => void;
  [BackOut.RUN_COMMAND]: (data: RunCommandResponse) => void;
  [BackOut.UPLOAD_LOG]: (getUrl: string | undefined) => void;
  [BackOut.DEV_CONSOLE_CHANGE]: (text: string) => void;
}>

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
  GAMES,
  PLAYLISTS,
  EXEC,
}

export type InitEventData = {
  done: BackInit[];
}

export type GetMainInitDataResponse = {
  config: AppConfigData;
  preferences: AppPreferencesData;
}

export type GetRendererInitDataResponse = {
  config: AppConfigData;
  preferences: AppPreferencesData;
  fileServerPort: number;
  log: ILogEntry[];
  services: IService[];
  customVersion?: string;
  languages: LangFile[];
  language: LangContainer;
  themes: Theme[];
  libraries: string[];
  serverNames: string[];
  mad4fpEnabled: boolean;
  platforms: Record<string, string[]>;
  playlists: Playlist[];
  localeCode: string;
  tagCategories: TagCategory[];
  extensions: IExtensionDescription[];
  devScripts: ExtensionContribution<'devScripts'>[];
  contextButtons: ExtensionContribution<'contextButtons'>[];
  logoSets: LogoSet[];
  extConfigs: ExtensionContribution<'configuration'>[];
  extConfig: AppExtConfigData;
}

export type GetSuggestionsResponseData = {
  suggestions: Partial<GamePropSuggestions>;
  appPaths: { [platform: string]: string; };
}

export type RandomGamesData = {
  count: number;
  broken: boolean;
  extreme: boolean;
  excludedLibraries: string[];
}

/** Tuple of values from the last game of a previous page (look up "keyset pagination"). */
export type PageTuple = {
  /** Primary order value. */
  orderVal: any;
  /** Title of the game (secondary order value). */
  title: string;
  /** ID of the game (unique value). */
  id: string;
}

/** A set of page tuples. The keys in the record are page indices. */
export type PageKeyset = Partial<Record<number, PageTuple>>;

export type BrowseViewKeysetResponse = {
  keyset: PageKeyset;
  total: number;
};

export type RequestGameRange = {
  /** Index of the first game. */
  start: number;
  /** Number of games to request (if undefined, all games until the end of the query will be included). */
  length: number | undefined;
  /**
   * Tuple of the last game of the previous page.
   * If this is set then "start" must be the index of the game after this (since this will be used instead of
   * "start" when selecting the games).
   */
  index?: PageTuple;
}

export type ResponseGameRange<T extends boolean> = {
  /** Index of the first game. */
  start: number;
  /** Number of games requested. */
  length?: number;
  /** Games found within the range. */
  games: T extends true ? ViewGame[] : Game[];
}

export type BrowseViewPageData = {
  /** Ranges of games to fetch. */
  ranges: RequestGameRange[];
  /** Library to filter games by (only games in the library will be queried). */
  library?: string;
  /** Query to filter games by. */
  query: SearchGamesOpts;
  /** If a subset of the games should be returned instead of the full game objects. */
  shallow?: boolean;
}

/** Note: The generic type should have the same value as "shallow" from the request, or "boolean" if the type is unknown. */
export type BrowseViewPageResponseData = {
  /** Ranges of games. */
  ranges: ResponseGameRange<boolean>[];
  /** Library used in the query. */
  library?: string;
}

export type SearchGamesOpts = {
  /** Info to filter the search from */
  filter: FilterGameOpts;
  /** The field to order the games by. */
  orderBy: GameOrderBy;
  /** The way to order the games. */
  orderReverse: GameOrderReverse;
}

/** Shorten version of Game returned in searches, makes for better performance. */
export type ViewGame = {
  id: string;
  title: string;
  platform: string;
  // List view only
  tags: Tag[];
  developer: string;
  publisher: string;
  extreme: boolean;
}

export type BrowseChangeData = {
  library?: string;
  gamesTotal: number;
}

export type ImportCurationData = {
  curation: EditCuration;
  log?: boolean;
  /**
   * Note: This will have the incorrect prototype after being sent.
   * Wrapping it new a new date object seems to work ("new Date(date)").
   */
  date?: Date;
  saveCuration: boolean;
}

export type ImportCurationResponseData = {
  error?: any;
}

export type LaunchCurationData = {
  key: string;
  meta: EditCurationMeta;
  addApps: EditAddAppCurationMeta[];
  mad4fp: boolean;
  symlinkCurationContent: boolean;
}

export type LaunchCurationAddAppData = {
  curationKey: string;
  curation: EditAddAppCuration;
  platform?: string;
  symlinkCurationContent: boolean;
}

export type TagSuggestion = {
  alias?: string;
  primaryAlias: string;
  tag: Tag;
}

export type TagDeleteResponse = {
  success: boolean;
  id: number;
}

/**
 * Data passed to merge tags together
 * @param toMerge Tag to merge from
 * @param mergeInto Tag to merge into
 * @param makeAlias Whether to move all aliases from toMerge into mergeInto as well
 */
export type MergeTagData = {
  toMerge: string;
  mergeInto: string;
  makeAlias: boolean;
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
