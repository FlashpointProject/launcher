import { BrowsePageLayout } from '../BrowsePageLayout';
import { IObjectParserProp, ObjectParser } from '../utils/ObjectParser';
import { IAppPreferencesData, IAppPreferencesDataMainWindow } from './interfaces';
import { gameOrderByOptions, gameOrderReverseOptions } from '../order/util';

/** Default Preferences Data used for values that are not found in the file */
export const defaultPreferencesData: Readonly<IAppPreferencesData> = Object.freeze<IAppPreferencesData>({
  browsePageGameScale: 0.087,
  browsePageShowExtreme: false,
  enableEditing: true,
  browsePageLayout: BrowsePageLayout.grid,
  browsePageShowLeftSidebar: true,
  browsePageShowRightSidebar: true,
  browsePageLeftSidebarWidth: 320,
  browsePageRightSidebarWidth: 320,
  showDeveloperTab: false,
  useWine: false,
  currentTheme: undefined,
  lastSelectedLibrary: '',
  gamesOrderBy: 'title',
  gamesOrder: 'ascending',
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
 * Overwrite a preferences data object with data from another object.
 * @param source Object to overwrite.
 * @param data Object with data to overwrite the source with.
 * @returns Source argument (not a copy).
 */
export function overwritePreferenceData(
  source: IAppPreferencesData,
  data: Partial<IAppPreferencesData>,
  onError?: (error: string) => void
): IAppPreferencesData {
  const parser = new ObjectParser({
    input: data,
    onError: onError && (error => onError(`Error while parsing Preferences: ${error.toString()}`)),
  });
  // Parse root object
  parser.prop('browsePageGameScale',         v => source.browsePageGameScale         = num(v));
  parser.prop('browsePageShowExtreme',       v => source.browsePageShowExtreme       = !!v);
  parser.prop('enableEditing',               v => source.enableEditing               = !!v);
  parser.prop('browsePageLayout',            v => source.browsePageLayout            = num(v));
  parser.prop('browsePageShowLeftSidebar',   v => source.browsePageShowLeftSidebar   = !!v);
  parser.prop('browsePageShowRightSidebar',  v => source.browsePageShowRightSidebar  = !!v);
  parser.prop('browsePageLeftSidebarWidth',  v => source.browsePageLeftSidebarWidth  = num(v));
  parser.prop('browsePageRightSidebarWidth', v => source.browsePageRightSidebarWidth = num(v));
  parser.prop('showDeveloperTab',            v => source.showDeveloperTab            = !!v);
  parser.prop('useWine',                     v => source.useWine                     = !!v);
  parser.prop('currentTheme',                v => source.currentTheme                = str(v), true);
  parser.prop('lastSelectedLibrary',         v => source.lastSelectedLibrary         = str(v));
  parser.prop('gamesOrderBy',                v => source.gamesOrderBy                = strOpt(v, gameOrderByOptions,      'title'    ));
  parser.prop('gamesOrder',                  v => source.gamesOrder                  = strOpt(v, gameOrderReverseOptions, 'ascending'));
  // Parse window object
  parseMainWindow(parser.prop('mainWindow'), source.mainWindow);
  parser.prop('showLogSource').mapRaw((item, label) => source.showLogSource[label] = !!item);
  // Done
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

function strOpt<T extends string>(text: any, options: T[], defaultOption: T): T {
  text = str(text);
  for (let option of options) {
    if (text === option) { return text; }
  }
  return defaultOption;
}

function noop() {}
