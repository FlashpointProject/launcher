import { BrowsePageLayout } from '../BrowsePageLayout';
import { GameOrderBy, GameOrderReverse } from '../order/interfaces';

/**
 * Contains state of all non-config settings the user can change in the application.
 * This is the data contained in the Preferences file.
 */
export type IAppPreferencesData = {
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
  /** The "route" of the last selected library (empty string selects the default). */
  lastSelectedLibrary: string;
  /** What property to order the games by. */
  gamesOrderBy: GameOrderBy;
  /** What order the games should appear in. */
  gamesOrder: GameOrderReverse;
  /** Position and size of the main window. */
  mainWindow: IAppPreferencesDataMainWindow;
  /** Default Library for new games etc. */
  defaultLibrary: string;
  /** Save curations after importing */
  saveImportedCurations: boolean;
  /** Download missing thumbnails/screenshots from a remote server. */
  onDemandImages: boolean;
  /** Sources to show/hide in the log page. */
  showLogSource: {
    [key: string]: boolean;
  }
};

export type IAppPreferencesDataMainWindow = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  maximized: boolean;
};
