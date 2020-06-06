import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import { FilterGameOpts } from '@shared/game/GameFilter';
import { Legacy_GamePlatform } from '@shared/legacy/interfaces';
import { ChangedMeta, MetaEditFlags } from '@shared/MetaEdit';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { MessageBoxOptions, OpenExternalOptions } from 'electron';
import { IAppConfigData } from '../config/interfaces';
import { EditAddAppCuration, EditAddAppCurationMeta, EditCuration, EditCurationMeta } from '../curate/types';
import { ExecMapping, GamePropSuggestions, IService, ProcessAction } from '../interfaces';
import { LangContainer, LangFile } from '../lang';
import { ILogEntry, ILogPreEntry } from '../Log/interface';
import { IAppPreferencesData } from '../preferences/interfaces';
import { Theme } from '../ThemeFile';

export enum BackIn {
  GENERIC_RESPONSE,
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
  QUICK_SEARCH,
  ADD_LOG,
  SERVICE_ACTION,
  DUPLICATE_PLAYLIST,
  IMPORT_PLAYLIST,
  EXPORT_PLAYLIST,
  GET_PLAYLISTS,
  GET_PLAYLIST,
  SAVE_PLAYLIST,
  DELETE_PLAYLIST,
  GET_PLAYLIST_GAME,
  SAVE_PLAYLIST_GAME,
  DELETE_PLAYLIST_GAME,
  SAVE_LEGACY_PLATFORM,
  IMPORT_CURATION,
  LAUNCH_CURATION,
  LAUNCH_CURATION_ADDAPP,
  QUIT,
  /** Tag funcs */
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
  /** Tag Category funcs */
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
  /** API */
  SYNC_GAME_METADATA,
  // Meta edits
  EXPORT_META_EDIT,
  IMPORT_META_EDITS,
  // Misc
  UPLOAD_LOG,
}

export enum BackOut {
  GENERIC_RESPONSE,
  INIT_EVENT,
  OPEN_DIALOG,
  OPEN_EXTERNAL,
  LOCALE_UPDATE,
  GET_MAIN_INIT_DATA,
  UPDATE_PREFERENCES_RESPONSE,
  IMAGE_CHANGE,
  LOG_ENTRY_ADDED,
  SERVICE_CHANGE,
  LANGUAGE_CHANGE,
  LANGUAGE_LIST_CHANGE,
  PLAYLISTS_CHANGE,
  THEME_CHANGE,
  THEME_LIST_CHANGE,
  IMPORT_CURATION_RESPONSE,
  GET_TAG_SUGGESTIONS,
  GET_TAG_BY_ID,
  GET_TAGS,
  GET_TAG,
  SAVE_TAG,
  DELETE_TAG,
  MERGE_TAGS,
  GET_TAG_CATEGORY_BY_ID,
  SAVE_TAG_CATEGORY,
  DELETE_TAG_CATEGORY,
  TAG_CATEGORIES_CHANGE,
  FIX_TAG_PRIMARY_ALIASES,
  SYNC_GAME_METADATA,
  QUIT,
  UPLOAD_LOG,
}

export type WrappedRequest<T = any> = {
  /** Identifier of the response */
  id: string;
  /** Type of the request */
  type: BackIn;
  /** Data contained in the response (if any) */
  data: T;
}

export type WrappedResponse<T = any> = {
  /** Identifier of the response */
  id: string;
  /** Type of the response */
  type: BackOut;
  /** Data contained in the response (if any) */
  data?: T;
}

export type BackInitArgs = {
  /** Path to the folder containing the preferences and config files. */
  configFolder: string;
  /** Secret string used for authentication. */
  secret: string;
  isDev: boolean;
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

export type AddLogData = ILogPreEntry;

export type InitEventData = {
  done: BackInit[];
}

export type GetMainInitDataResponse = {
  config: IAppConfigData;
  preferences: IAppPreferencesData;
}

export type GetRendererInitDataResponse = {
  config: IAppConfigData;
  preferences: IAppPreferencesData;
  fileServerPort: number;
  log: ILogEntry[];
  services: IService[];
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
}

export type GetSuggestionsResponseData = {
  suggestions: Partial<GamePropSuggestions>;
  appPaths: { [platform: string]: string; };
}

export type GetGamesTotalResponseData = number;

export type SetLocaleData = string;

export type LocaleUpdateData = string;

export type GetExecData = ExecMapping[];

export type OpenDialogData = MessageBoxOptions;

export type OpenDialogResponseData = number;

export type OpenExternalData = {
  url: string;
  options?: OpenExternalOptions;
}

export type OpenExternalResponseData = {
  error?: Error;
}

export type LaunchGameData = {
  id: string;
}

export type SaveGameData = Game;

export type SaveLegacyPlatformData = Legacy_GamePlatform;

export type DeleteGameData = {
  id: string;
}

export type DuplicateGameData = {
  id: string;
  dupeImages: boolean;
}

export type ExportGameData = {
  id: string;
  location: string;
  metaOnly: boolean;
}

export type DuplicatePlaylistData = string;

export type ImportPlaylistData = string;

export type ExportPlaylistData = {
  id: string;
  location: string;
}

export type GetGameData = {
  id: string;
}

export type GetGameResponseData = {
  game?: Game;
}

export type GetAllGamesResponseData = {
  games: Game[];
}

export type RandomGamesData = {
  count: number;
  broken: boolean;
  extreme: boolean;
}

export type RandomGamesResponseData = Game[];

export type LaunchAddAppData = {
  id: string;
}

export type BrowseViewAllData = {
  libraries: string[];
}

export type BrowseViewUpdateData = {
  viewId?: string;
  query: unknown;
}

export type BrowseViewResponseData = {
  viewId: string;
  total: number;
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

export type BrowseViewKeysetData = {
  /** Library to filter games by (only games in the library will be queried). */
  library: string;
  /** Query to filter games by. */
  query: SearchGamesOpts;
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
export type BrowseViewPageResponseData<T extends boolean> = {
  /** Ranges of games. */
  ranges: ResponseGameRange<T>[];
  /** Library used in the query. */
  library?: string;
}

export type BrowseViewIndexData = {
  gameId: string;
  query: SearchGamesOpts;
}

export type BrowseViewIndexResponse = {
  /** Index of the game (equal to or greater than 0 if found, otherwise -1). */
  index: number;
}

export type SaveImageData = {
  folder: string;
  id: string;
  content: string;
}

export type DeleteImageData = {
  folder: string;
  id: string;
}

export type PlaylistsChangeData = Playlist[];

export type TagCategoriesChangeData = TagCategory[];

export type SearchGamesOpts = {
  /** Info to filter the search from */
  filter: FilterGameOpts;
  /** The field to order the games by. */
  orderBy: GameOrderBy;
  /** The way to order the games. */
  orderReverse: GameOrderReverse;
}

export type SearchGamesResponse = {
  id?: string;
  index?: number;
}

export type UpdateConfigData = Partial<IAppConfigData>;

export type ViewGame = {
  id: string;
  title: string;
  platform: string;
  // List view only
  tags: Tag[];
  developer: string;
  publisher: string;
}

export type BrowseChangeData = {
  library?: string;
  gamesTotal: number;
}

export type ImageChangeData = {
  folder: string;
  id: string;
}

export type LogEntryAddedData = {
  entry: ILogEntry;
  index: number;
}

export type ServiceActionData = {
  action: ProcessAction;
  id: string;
}

export type ServiceChangeData = IService;

export type LanguageChangeData = LangContainer;

export type LanguageListChangeData = LangFile[];

export type ThemeChangeData = string;

export type ThemeListChangeData = Theme[];

export type GetPlaylistsResponse = Playlist[];

export type GetPlaylistData = string;

export type GetPlaylistResponse = Playlist;

export type SavePlaylistData = Playlist;

export type SavePlaylistResponse = Playlist;

export type DeletePlaylistData = string;

export type DeletePlaylistResponse = Playlist;

export type GetPlaylistGameData = {
  gameId: string;
  playlistId: string;
}

export type GetPlaylistGameResponse = PlaylistGame | undefined;

export type DeletePlaylistGameData = {
  gameId: string;
  playlistId: string;
}

export type DeletePlaylistGameResponse = PlaylistGame | undefined;

export type SavePlaylistGameData = PlaylistGame;

export type SavePlaylistGameResponse = PlaylistGame;

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
}

export type LaunchCurationAddAppData = {
  curationKey: string;
  curation: EditAddAppCuration;
  platform?: string;
}

export type TagSuggestion = {
  alias?: string;
  primaryAlias: string;
  tag: Tag;
}

export type TagGetOrCreateData = {
  tag: string,
  tagCategory?: string
};

export type TagGetOrCreateResponse = Tag;

export type TagByIdData = number;

export type TagByIdResponse = Tag | undefined;

export type TagSuggestionsData = string;

export type TagSuggestionsResponse = TagSuggestion[];

export type TagPrimaryFixData = null;

export type TagPrimaryFixResponse = number;

export type TagFindData = string;

export type TagFindResponse = Tag[];

export type TagGetData = string;

export type TagGetResponse = Tag | undefined;

export type TagSaveData = Tag;

export type TagSaveResponse = Tag;

export type TagDeleteData = number;

export type TagDeleteResponse = {
  success: boolean;
  id: number;
}

export type MergeTagData = {
  toMerge: Tag;
  mergeInto: string;
  makeAlias: boolean;
}

export type TagCategorySaveData = TagCategory;

export type TagCategorySaveResponse = TagCategory;

export type TagCategoryDeleteData = number;

export type TagCategoryDeleteResponse = {
  success: boolean;
}

export type TagCategoryByIdData = number;

export type TagCategoryByIdResponse = TagCategory | undefined;

export type GameMetadataSyncResponse = {
  total: number;
  successes: number;
  error?: string;
}

export type ExportMetaEditData = {
  /** ID of the game to export meta from. */
  id: string;
  /** Properties to export. */
  properties: MetaEditFlags;
}

export type ImportMetaEditResponseData = ImportMetaEditResult;

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

export type UploadLogResponse = string | undefined;
