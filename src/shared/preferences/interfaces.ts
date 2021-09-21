import { BrowsePageLayout } from '../BrowsePageLayout';
import { GameOrderBy, GameOrderReverse } from '../order/interfaces';
import { LogLevel } from '@shared/Log/interface';

/**
 * Contains state of all non-config settings the user can change in the application.
 * This is the data contained in the Preferences file.
 */
export type AppPreferencesData = {
  [key: string]: any;
  /** Path to the image folder (relative to the flashpoint path) */
  imageFolderPath: string;
  /** Path to the logo folder (relative to the flashpoint path) */
  logoFolderPath: string;
  /** Path to the playlist folder (relative to the flashpoint path) */
  playlistFolderPath: string;
  /** Path to the json folder (relative to the flashpoint path) */
  jsonFolderPath: string;
  /** Path to the htdocs folder (relative to the flashpoint path) */
  htdocsFolderPath: string;
  /** Path to the platform folder (relative to the flashpoint path) */
  platformFolderPath: string;
  /** Path to the theme folder (relative to the flashpoint path) */
  themeFolderPath: string;
  /** Path to the logo sets folder (relative to the flashpoint path) */
  logoSetsFolderPath: string;
  /** Path of the meta edits folder (relative to the flashpoint path) */
  metaEditsFolderPath: string;
  /** Path to load User extensions from (relative to the flashpoint path) */
  extensionsPath: string;
  /** Path to store Game Data packs */
  dataPacksFolderPath: string;
  /** Scale of the games at the BrowsePage. */
  browsePageGameScale: number;
  /** If "Extreme" games should be shown at the BrowsePage. */
  browsePageShowExtreme: boolean;
  /** If editing games, additional applications and playlists should be allowed. */
  enableEditing: boolean;
  /** Default language used for fallback */
  fallbackLanguage: string;
  /** Current language */
  currentLanguage: string;
  /** Layout of game collection at BrowsePage. */
  browsePageLayout: BrowsePageLayout;
  /** If the left sidebar at the BrowsePage should be visible. */
  browsePageShowLeftSidebar: boolean;
  /** If the right sidebar at the BrowsePage should be visible. */
  browsePageShowRightSidebar: boolean;
  /** Width of the left sidebar. (Browse Page) */
  browsePageLeftSidebarWidth: number;
  /** Width of the right sidebar. (Browse Page) */
  browsePageRightSidebarWidth: number;
  /** Width of the left sidebar. (Curate Page) */
  curatePageLeftSidebarWidth: number;
  /** If the "Developer" tab should be visible in the header. */
  showDeveloperTab: boolean;
  /** Filename of the current theme. */
  currentTheme: string | undefined;
  /** Filename of the current logo set */
  currentLogoSet: string | undefined;
  /** The "route" of the last selected library (empty string selects the default). */
  lastSelectedLibrary: string;
  /** What property to order the games by. */
  gamesOrderBy: GameOrderBy;
  /** What order the games should appear in. */
  gamesOrder: GameOrderReverse;
  /** Position and size of the main window. */
  mainWindow: AppPreferencesDataMainWindow;
  /** Default Library for new games etc. */
  defaultLibrary: string;
  /** Save curations after importing */
  saveImportedCurations: boolean;
  /** Assign the same UUID to imported games as in the curation archive */
  keepArchiveKey: boolean;
  /** Whether to symlink or copy curation content when running (Symlink required for MAD4FP) */
  symlinkCurationContent: boolean;
  /** Download missing thumbnails/screenshots from a remote server. */
  onDemandImages: boolean;
  /** Base URL of the server to download missing thumbnails/screenshots from. */
  onDemandBaseUrl: string;
  /** Proxy server to use during Browser Mode */
  browserModeProxy: string;
  /** Sources to show/hide in the log page. */
  showLogSource: {
    [key: string]: boolean;
  }
  /** Levels to show/hide in the log page. */
  showLogLevel: {
    [key in LogLevel]: boolean;
  }
  /** Libraries that should be excluded from random picks. */
  excludedRandomLibraries: string[];
  /** Application path overrides to check during app launches */
  appPathOverrides: AppPathOverride[];
  /** Tag filter groups */
  tagFilters: TagFilterGroup[];
  /** Use Tag Filters in the Curate suggestions */
  tagFiltersInCurate: boolean;
  /** Array of native locked platforms */
  nativePlatforms: string[];
  /** If games flagged as "extreme" should be hidden (mainly for parental control) */
  disableExtremeGames: boolean;
  /** If games flagged as "broken" should be hidden */
  showBrokenGames: boolean;
  /** Whether home page boxes are minimized */
  minimizedHomePageBoxes: string[];
  /** Whether to hide extreme game screenshots by default */
  hideExtremeScreenshots: boolean;
  /** URL to fetch for the update feed markdown */
  updateFeedUrl: string;
  /** Toggle for fancy client animations */
  fancyAnimations: boolean;
};

export type AppPathOverride = {
  path: string;
  override: string;
  enabled: boolean;
}

export type AppPreferencesDataMainWindow = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  maximized: boolean;
};


export type TagFilterGroup = {
  name: string;
  description: string;
  /** Enabled */
  enabled: boolean;
  /** Tags to filter */
  tags: TagFilter;
  /** Tag categories to filter */
  categories: TagFilter;
  /** Filters to auto apply when this is applied */
  childFilters: string[];
  /** Are these tags considered Extreme? */
  extreme: boolean;
}

export type TagFilter = string[];
