import { Game } from '@database/entity/Game';
import { GameData } from '@database/entity/GameData';
import { CreditsData } from '@renderer/credits/types';
import { ViewGameSet } from '@renderer/interfaces';
import { UpgradeStage } from '@renderer/upgrade/types';
import { BackInit, ComponentStatus, GameOfTheDay, PageKeyset, ResponseGameRange, SearchGamesOpts, ViewGame } from '@shared/back/types';
import { AppExtConfigData } from '@shared/config/interfaces';
import { ExtensionContribution, IExtensionDescription, ILogoSet } from '@shared/extensions/interfaces';
import { DialogField, DialogState, GamePropSuggestions, IService } from '@shared/interfaces';
import { LangContainer, LangFile } from '@shared/lang';
import { ITheme, Theme } from '@shared/ThemeFile';
import { Gate } from '@shared/utils/Gate';
import * as axiosImport from 'axios';
import { UpdateInfo } from 'electron-updater';
import { AppPreferencesData, GameOrderBy, GameOrderReverse, Playlist, PlaylistGame, TagFilterGroup } from 'flashpoint-launcher';
import { EventEmitter } from 'stream';
import { MainActionType, RequestState } from './enums';

export type View = {
  /** The most recent query used for this view. */
  query: ViewQuery;
  /** State of each page in the view. */
  pageState: ViewPageStates;
  /** Most recent meta. */
  meta?: {
    /** Total number of results in the query. */
    total: number;
    /** Page keyset of the results. */
    pageKeyset: PageKeyset;
  };
  /** State of the meta request (undefined means the view is "idle" and no request should be made). */
  metaState?: RequestState;
  /** Games to display. */
  games: ViewGameSet;
  /** Unique identifier for the current "search" (used for validating that responses are not outdated). */
  queryId: number;
  /** If a new meta has been applied but the games of the old query are still present (this means the games should be discarded the next time a game page is received). */
  isDirty: boolean;
  /** Total number of results in the query of the most recent game page response (used for games even if dirty). */
  total?: number;
  /** ID of the selected game. */
  selectedGameId?: string;
  /** Most recent "start" page index that has been viewed. */
  lastStart: number;
  /** Most recent "count" of pages that has been viewed. */
  lastCount: number;
  /** Tag filters used when building */
  tagFilters: TagFilterGroup[];
}

export type ViewQuery = SearchGamesOpts & {
  /** Query string. */
  text: string;
  /** If extreme games are included. */
  extreme: boolean;
}

export type ViewPageStates = Partial<Record<number, RequestState>>

export type MainState = {
  gotdList: GameOfTheDay[];
  views: Record<string, View | undefined>; // views[id] = view
  libraries: string[];
  serverNames: string[];
  mad4fpEnabled: boolean;
  playlists: Playlist[];
  playlistIconCache: Record<string, string>; // [PLAYLIST_ID] = ICON_BLOB_URL
  suggestions: GamePropSuggestions;
  appPaths: Record<string, string>;
  platforms: Record<string, string[]>;
  loadedAll: Gate;
  loaded: { [key in BackInit]: boolean; };
  extensions: IExtensionDescription[];
  themeList: ITheme[];
  logoSets: ILogoSet[];
  logoVersion: number; // Increase to force cache clear
  gamesTotal: number;
  localeCode: string;
  /** Text to display on the dev console */
  devConsole: string;

  /** Random games for the Home page box */
  randomGames: ViewGame[];
  /** Whether we're currently requesting random games */
  requestingRandomGames: boolean;
  /** If the random games should be shifted when the request is complete. */
  shiftRandomGames: boolean;

  /** Data and state used for the upgrade system (optional install-able downloads from the HomePage). */
  upgrades: UpgradeStage[];
  /** If the Random games have loaded - Masked as 'Games' */
  gamesDoneLoading: boolean;
  /** If upgrades files have loaded */
  upgradesDoneLoading: boolean;
  /** Stop rendering to force component unmounts */
  stopRender: boolean;
  /** Credits data (if any). */
  creditsData?: CreditsData;
  creditsDoneLoading: boolean;
  /** If the "New Game" button was clicked (silly way of passing the event from the footer the the browse page). */
  wasNewGameClicked: boolean;
  /** Current language container. */
  lang: LangContainer;
  /** Current list of available language files. */
  langList: LangFile[];
  /** Info of the update, if one was found */
  updateInfo: UpdateInfo | undefined;
  /** If the "Meta Edit Popup" is open. */
  metaEditExporterOpen: boolean;
  /** ID of the game used in the "Meta Edit Popup". */
  metaEditExporterGameId: string;
  /** Scripts for the Developer Page */
  devScripts: ExtensionContribution<'devScripts'>[];
  /** Context buttons added by extensions */
  contextButtons: ExtensionContribution<'contextButtons'>[];
  /** Curation Templates added by extensions */
  curationTemplates: ExtensionContribution<'curationTemplates'>[];
  /** Extension config options */
  extConfigs: ExtensionContribution<'configuration'>[];
  /** Current extension config data */
  extConfig: AppExtConfigData;
  /** Services */
  services: IService[];
  /** PLACEHOLDER - Download percent of Game */
  downloadPercent: number;
  downloadSize: number;
  downloadOpen: boolean;
  cancelToken?: axiosImport.CancelToken;
  downloadVerifying: boolean;
  taskBarOpen: boolean;
  selectedGameId?: string;
  selectedPlaylistId?: string;
  currentGame?: Game;
  currentGameData?: GameData;
  currentPlaylist?: Playlist;
  currentPlaylistEntry?: PlaylistGame;
  isEditingGame: boolean;
  updateFeedMarkdown: string;
  /** Games which are in the middle of a busy operation */
  busyGames: string[];
  /** State of the Socket connection */
  socketOpen: boolean;
  /** Main Proc output (when requested) */
  mainOutput?: string;
  /** List of components from FPM */
  componentStatuses: ComponentStatus[];
  /** In the process of quitting, suspend all action */
  quitting: boolean;
  /** Open Dialog States */
  openDialogs: DialogState[];
  /** Renderer side dialog response emitter (event code = dialog id) */
  dialogResEvent: EventEmitter;
}

export type MainAction = {
  type: MainActionType.SET_STATE;
  payload: Partial<MainState>;
} | {
  type: MainActionType.SET_VIEW_QUERY;
  library: string;
  searchText: string;
  showExtreme: boolean;
  searchLimit: number;
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
  tagFilters: TagFilterGroup[];
  /** The playlistId can be of type string or undefined. Null means it will remain the same as before. */
  playlist?: Playlist | null;
} | {
  type: MainActionType.SET_VIEW_BOUNDRIES;
  library: string;
  start: number;
  count: number;
} | {
  type: MainActionType.REQUEST_VIEW_META;
  library: string;
  queryId: number;
} | {
  type: MainActionType.SET_VIEW_META;
  library: string;
  queryId: number;
  keyset: PageKeyset;
  total: number;
} | {
  type: MainActionType.ADD_VIEW_PAGES;
  library: string;
  queryId: number;
  ranges: ResponseGameRange<boolean>[];
} | {
  type: MainActionType.REQUEST_VIEW_PAGES;
  library: string;
  queryId: number;
  pages: number[];
} | {
  type: MainActionType.SET_SELECTED_GAME;
  gameId?: string;
} | {
  type: MainActionType.SET_CREDITS;
  creditsData?: CreditsData;
} | {
  type: MainActionType.STOP_RENDER;
} | {
  type: MainActionType.OPEN_META_EXPORTER;
  gameId: string;
} | {
  type: MainActionType.CLOSE_META_EXPORTER;
} | {
  type: MainActionType.ADD_LOADED;
  loaded: BackInit[];
} | {
  type: MainActionType.SET_GAMES_TOTAL;
  total: number;
} | {
  type: MainActionType.SET_SUGGESTIONS;
  suggestions: GamePropSuggestions;
  appPaths: Record<string, string>;
} | {
  type: MainActionType.SET_LOCALE;
  localeCode: string;
} | {
  type: MainActionType.SET_LANGUAGE;
  lang: LangContainer;
} | {
  type: MainActionType.SET_LANGUAGE_LIST;
  langList: LangFile[];
} | {
  type: MainActionType.SET_THEME_LIST;
  themeList: Theme[];
} | {
  type: MainActionType.SET_PLAYLISTS;
  playlists: Playlist[];
} | {
  type: MainActionType.SET_UPGRADES;
  upgrades: UpgradeStage[];
} | {
  type: MainActionType.SET_UPDATE_INFO;
  updateInfo: UpdateInfo;
} | {
  type: MainActionType.CLICK_NEW_GAME;
} | {
  type: MainActionType.CLICK_NEW_GAME_END;
} | {
  type: MainActionType.SHIFT_RANDOM_GAMES;
} | {
  type: MainActionType.REQUEST_RANDOM_GAMES;
} | {
  type: MainActionType.RESPONSE_RANDOM_GAMES;
  games: ViewGame[];
} | {
  type: MainActionType.CLEAR_RANDOM_GAMES;
} | {
  type: MainActionType.INCREMENT_LOGO_VERSION;
} | {
  type: MainActionType.FORCE_UPDATE_GAME_DATA;
  gameData: GameData;
} | {
  type: MainActionType.SETUP_VIEWS;
  preferencesData: AppPreferencesData;
} | {
  type: MainActionType.BUSY_GAME;
  gameId: string;
} | {
  type: MainActionType.UNBUSY_GAME;
  gameId: string;
} | {
  type: MainActionType.NEW_DIALOG;
  dialog: DialogState;
} | {
  type: MainActionType.CANCEL_DIALOG;
  dialogId: string;
} | {
  type: MainActionType.UPDATE_DIALOG;
  dialog: DialogState;
} | {
  type: MainActionType.RESOLVE_DIALOG;
  dialogId: string;
  button: number;
} | {
  type: MainActionType.UPDATE_DIALOG_FIELD;
  dialogId: string;
  field: DialogField;
}
