import { IAppConfigData } from '../config/interfaces';
import { IAdditionalApplicationInfo, IGameInfo } from '../game/interfaces';
import { GamePlaylist, IService, ProcessAction } from '../interfaces';
import { LangContainer, LangFile } from '../lang';
import { ILogEntry, ILogPreEntry } from '../Log/interface';
import { IAppPreferencesData } from '../preferences/interfaces';
import { Theme } from '../ThemeFile';
import { MessageBoxOptions, OpenExternalOptions } from 'electron';

export enum BackIn {
  GENERIC_RESPONSE,
  INIT_LISTEN,
  GET_GAMES_TOTAL,
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
  GET_PLAYLISTS,
  SAVE_PLAYLIST,
  DELETE_PLAYLIST,
  QUIT,
  /** Get all library names. */
  GET_LIBRARIES,
  /** Get a page of a browse view. */
  BROWSE_VIEW_PAGE,
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
  BROWSE_VIEW_PAGE_RESPONSE,
  GET_MAIN_INIT_DATA,
  UPDATE_PREFERENCES_RESPONSE,
  BROWSE_CHANGE,
  IMAGE_CHANGE,
  LOG_ENTRY_ADDED,
  SERVICE_CHANGE,
  LANGUAGE_CHANGE,
  LANGUAGE_LIST_CHANGE,
  THEME_CHANGE,
  THEME_LIST_CHANGE,
  PLAYLIST_UPDATE,
  PLAYLIST_REMOVE,
  QUIT,
}

export type WrappedRequest<T = any> = {
  /** Identifier of the response */
  id: string;
  /** Type of the request */
  type: BackIn;
  /** Data contained in the response (if any) */
  data?: T;
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
  countryCode: string;
}

export enum BackInit {
  GAMES,
  PLAYLISTS,
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
  imageServerPort: number;
  log: ILogEntry[];
  services: IService[];
  languages: LangFile[];
  language: LangContainer;
  themes: Theme[];
  playlists?: GamePlaylist[];
  platformNames: string[]
}

export type GetGamesTotalResponseData = number;

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

export type SaveGameData = {
  game: IGameInfo;
  addApps: IAdditionalApplicationInfo[];
  library: string;
  saveToFile: boolean;
}

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

export type GetGameData = {
  id: string;
}

export type GetGameResponseData = {
  game?: IGameInfo;
  addApps?: IAdditionalApplicationInfo[];
}

export type GetAllGamesResponseData = {
  games: IGameInfo[];
}

export type RandomGamesData = {
  count: number;
}

export type RandomGamesResponseData = IGameInfo[];

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

export type BrowseViewPageData = {
  offset: number;
  limit: number;
  query: GameQuery;
}

export type BrowseViewPageResponseData = {
  games: ViewGame[];
  offset: number;
  total?: number;
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

export type QuickSearchData = {
  query: GameQuery;
  search: string;
}

export type QuickSearchResponseData = {
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
  genre: string;
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

export type PlaylistUpdateData = GamePlaylist;

export type PlaylistRemoveData = string;

export type GetPlaylistResponse = GamePlaylist[];

export type SavePlaylistData = {
  prevFilename?: string;
  playlist: GamePlaylist;
};

export type DeletePlaylistData = string;
