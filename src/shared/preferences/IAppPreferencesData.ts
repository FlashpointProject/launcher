import { BrowsePageLayout } from '../BrowsePageLayout';

/**
 * Contains state of all non-config settings the user can change in the application.
 * This is the data contained in the Preferences file.
 */
export interface IAppPreferencesData {
  /** Scale of the games at the BrowsePage */
  browsePageGameScale: number;
  /** If "Extreme" games should be shown at the BrowsePage */
  browsePageShowExtreme: boolean;
  /** If editing games, additional applications and playlists should be allowed */
  enableEditing: boolean;
  /** Layout of game collection at BrowsePage */
  browsePageLayout: BrowsePageLayout;
  /** If the left sidebar at the BrowsePage should be visible */
  browsePageShowLeftSidebar: boolean;
  /** If the right sidebar at the BrowsePage should be visible */
  browsePageShowRightSidebar: boolean;
  /** Position and size of the main window */
  mainWindow: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }
  /** Sources to show/hide in the log page */
  showLogSource: {
    [key: string]: boolean;
  }
}
