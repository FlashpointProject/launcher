import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { FilterGameOpts } from '@shared/game/GameFilter';
import { Legacy_GamePlatform } from '@shared/legacy/interfaces';
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
  /** Get a page of a browse view. */
  BROWSE_VIEW_PAGE,
  BROWSE_VIEW_INDEX,
  BROWSE_VIEW_PAGE_INDEX,
  /** Get all data needed on init (by the renderer). */
  GET_RENDERER_INIT_DATA,
  /** Get all data needed on init (by the renderer). */
  GET_MAIN_INIT_DATA,
  /** Update any number of configs. */
  UPDATE_CONFIG,
  /** Update any number of preferences. */
  UPDATE_PREFERENCES,
}

export enum BackOut {
  GENERIC_RESPONSE,
  INIT_EVENT,
  OPEN_DIALOG,
  OPEN_EXTERNAL,
  LOCALE_UPDATE,
  BROWSE_VIEW_PAGE_INDEX_RESPONSE,
  BROWSE_VIEW_PAGE_RESPONSE,
  GET_MAIN_INIT_DATA,
  UPDATE_PREFERENCES_RESPONSE,
  BROWSE_CHANGE,
  IMAGE_CHANGE,
  LOG_ENTRY_ADDED,
  SERVICE_CHANGE,
  LANGUAGE_CHANGE,
  LANGUAGE_LIST_CHANGE,
  PLAYLISTS_CHANGE,
  THEME_CHANGE,
  THEME_LIST_CHANGE,
  IMPORT_CURATION_RESPONSE,
  QUIT,
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
  platforms: Record<string, string[]>;
  playlists: Playlist[];
  localeCode: string;
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

export type Index = {
  orderVal: any,
  id: string
}
export type PageIndex = Record<number, Index>;

export type BrowseViewPageIndexResponse = {
  index: PageIndex;
  library: string;
};

export type BrowseViewPageIndexData = BrowseViewPageData;

export type BrowseViewPageData = {
  offset: number;
  library: string;
  limit?: number;
  index?: Index;
  query: SearchGamesOpts;
  getTotal?: boolean;
}

export type BrowseViewPageResponseData = {
  games: ViewGame[];
  library?: string;
  offset: number;
  total?: number;
}

export type BrowseViewIndexData = {
  gameId: string;
  query: SearchGamesOpts;
}

export type BrowseViewIndexResponse = {
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

type GameQuery = {
  extreme: boolean;
  broken: boolean;
  library: string;
  search: string;
  playlistId?: string;
  orderBy: string;
  orderReverse: string;
}

export type UpdateConfigData = Partial<IAppConfigData>;

export type ViewGame = {
  id: string;
  title: string;
  platform: string;
  // List view only
  tags: string;
  developer: string;
  publisher: string;
}

export type BrowseChangeData = {
  game?: Game;
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
}

export type LaunchCurationAddAppData = {
  curationKey: string;
  curation: EditAddAppCuration;
  platform?: string;
}
