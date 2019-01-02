import { IAppPreferencesData } from './IAppPreferencesData';
import { BrowsePageLayout } from '../BrowsePageLayout';
import { recursiveReplace } from '../Util';

/** Default Preferences Data used for values that are not found in the file */
export const defaultPreferencesData: Readonly<IAppPreferencesData> = Object.freeze({
  browsePageGameScale: 0.087,
  browsePageShowExtreme: false,
  enableEditing: true,
  browsePageLayout: BrowsePageLayout.grid,
  browsePageShowLeftSidebar: true,
  browsePageShowRightSidebar: true,
  browsePageLeftSidebarWidth: 320,
  browsePageRightSidebarWidth: 320,
  showDeveloperTab: false,
  mainWindow: Object.freeze({
    x: undefined,
    y: undefined,
    width: undefined,
    height: undefined,
    maximized: false,
  }),
  showLogSource: Object.freeze({
    // (Add log sources that should be hidden by default here)
  }),
});

/**
 * Overwrite a preferences data object with data from another object
 * @param source Object to overwrite
 * @param data Object with data to overwrite the source with
 * @returns source object (not a copy)
 */
export function overwritePreferenceData(source: IAppPreferencesData, data: Partial<IAppPreferencesData>): IAppPreferencesData {
  // Repalce every prop thats already present
  recursiveReplace(source, data);
  // Copy "showLogSource"
  if (data.showLogSource) {
    copyBooleanMap(source.showLogSource, data.showLogSource);
  }
  // Return
  return source;
}

function copyBooleanMap(source: BooleanMap, data: Partial<BooleanMap>): void {
  for (let label in data) {
    source[label] = !!data[label];
  }
}

type BooleanMap = { [key: string]: boolean };
