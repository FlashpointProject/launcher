import { IAppPreferencesData, IAppPreferencesDataMainWindow } from './IAppPreferencesData';
import { BrowsePageLayout } from '../BrowsePageLayout';
import { ObjectParser, IObjectParserProp } from '../utils/ObjectParser';

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
  lastSelectedLibrary: '',
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
export function overwritePreferenceData(source: IAppPreferencesData, data: Partial<IAppPreferencesData>, onError?: (error: string) => void): IAppPreferencesData {
  //
  const parser = new ObjectParser({
    input: data,
    onError: onError ? (error => onError(`Error while parsing Config: ${error.toString()}`)) : noop
  });
  parser.prop('browsePageGameScale',         v => source.browsePageGameScale         = num(v));
  parser.prop('browsePageShowExtreme',       v => source.browsePageShowExtreme       = !!v);
  parser.prop('enableEditing',               v => source.enableEditing               = !!v);
  parser.prop('browsePageLayout',            v => source.browsePageLayout            = num(v));
  parser.prop('browsePageShowLeftSidebar',   v => source.browsePageShowLeftSidebar   = !!v);
  parser.prop('browsePageShowRightSidebar',  v => source.browsePageShowRightSidebar  = !!v);
  parser.prop('browsePageLeftSidebarWidth',  v => source.browsePageLeftSidebarWidth  = num(v));
  parser.prop('browsePageRightSidebarWidth', v => source.browsePageRightSidebarWidth = num(v));
  parser.prop('showDeveloperTab',            v => source.showDeveloperTab            = !!v);
  parser.prop('lastSelectedLibrary',         v => source.lastSelectedLibrary         = str(v));
  parseMainWindow(parser.prop('mainWindow'), source.mainWindow);
  parser.prop('showLogSource').mapRaw((item, label) => source.showLogSource[label] = !!item);
  return source;
}

function parseMainWindow(parser: IObjectParserProp<any>, output: IAppPreferencesDataMainWindow): void {
  parser.prop('x',         v => output.x         = num(v), true);
  parser.prop('y',         v => output.y         = num(v), true);
  parser.prop('width',     v => output.width     = num(v), true);
  parser.prop('height',    v => output.height    = num(v), true);
  parser.prop('maximized', v => output.maximized = !!v);
}

function num(n: any): number {
  return parseFloat(n) || 0;
}

function str(str: any): string {
  return (str || '') + '';
}

function noop() {}
