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
  /** Layout of game collection at BrowsePage */
  browsePageLayout: BrowsePageLayout;
  /** Position and size of the main window */
  mainWindow: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }
}
