import { IAppPreferencesData } from './IAppPreferencesData';
import { BrowsePageLayout } from '../BrowsePageLayout';

/** Default Preferences Data used for values that are not found in the file */
export const defaultPreferencesData: Readonly<IAppPreferencesData> = Object.freeze({
  browsePageGameScale: 0.087,
  browsePageShowExtreme: false,
  enableEditing: true,
  browsePageLayout: BrowsePageLayout.grid,
  browsePageShowLeftSidebar: true,
  browsePageShowRightSidebar: true,
  mainWindow: Object.freeze({
    x: undefined,
    y: undefined,
    width: undefined,
    height: undefined,
  }),
});
