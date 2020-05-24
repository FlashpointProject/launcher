import { autoCode } from '@shared/lang';
import { BackIn } from '../back/types';
import { BrowsePageLayout } from '../BrowsePageLayout';
import { ARCADE } from '../constants';
import { DeepPartial } from '../interfaces';
import { gameOrderByOptions, gameOrderReverseOptions } from '../order/util';
import { deepCopy } from '../Util';
import { Coerce } from '../utils/Coerce';
import { IObjectParserProp, ObjectParser } from '../utils/ObjectParser';
import { IAppPreferencesData, IAppPreferencesDataMainWindow } from './interfaces';

export function updatePreferencesData(data: DeepPartial<IAppPreferencesData>, send: boolean = true) {
  const preferences = window.Shared.preferences;
  // @TODO Figure out the delta change of the object tree, and only send the changes
  preferences.data = overwritePreferenceData(deepCopy(preferences.data), data);
  if (preferences.onUpdate) { preferences.onUpdate(); }
  if (send) {
    window.Shared.back.send(
      BackIn.UPDATE_PREFERENCES,
      preferences.data
    );
  }
}

const { num, str } = Coerce;

/** Default Preferences Data used for values that are not found in the file */
export const defaultPreferencesData: Readonly<IAppPreferencesData> = Object.freeze<IAppPreferencesData>({
  browsePageGameScale: 0.087,
  browsePageShowExtreme: false,
  enableEditing: true,
  fallbackLanguage: 'en',
  currentLanguage: autoCode,
  browsePageLayout: BrowsePageLayout.list,
  browsePageShowLeftSidebar: true,
  browsePageShowRightSidebar: true,
  browsePageLeftSidebarWidth: 320,
  browsePageRightSidebarWidth: 320,
  curatePageLeftSidebarWidth: 320,
  showDeveloperTab: false,
  currentTheme: 'Metal\\theme.css',
  lastSelectedLibrary: '',
  gamesOrderBy: 'title',
  gamesOrder: 'ASC',
  defaultLibrary: ARCADE,
  mainWindow: Object.freeze({
    x: undefined,
    y: undefined,
    width: undefined,
    height: undefined,
    maximized: false,
  }),
  saveImportedCurations: true,
  onDemandImages: false,
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
  data: DeepPartial<IAppPreferencesData>,
  onError?: (error: string) => void
): IAppPreferencesData {
  const parser = new ObjectParser({
    input: data,
    onError: onError && (e => onError(`Error while parsing Preferences: ${e.toString()}`)),
  });
  // Parse root object
  parser.prop('browsePageGameScale',         v => source.browsePageGameScale         = num(v));
  parser.prop('browsePageShowExtreme',       v => source.browsePageShowExtreme       = !!v);
  parser.prop('enableEditing',               v => source.enableEditing               = !!v);
  parser.prop('fallbackLanguage',            v => source.fallbackLanguage            = str(v));
  parser.prop('currentLanguage',             v => source.currentLanguage             = str(v));
  parser.prop('browsePageLayout',            v => source.browsePageLayout            = num(v));
  parser.prop('browsePageShowLeftSidebar',   v => source.browsePageShowLeftSidebar   = !!v);
  parser.prop('browsePageShowRightSidebar',  v => source.browsePageShowRightSidebar  = !!v);
  parser.prop('browsePageLeftSidebarWidth',  v => source.browsePageLeftSidebarWidth  = num(v));
  parser.prop('browsePageRightSidebarWidth', v => source.browsePageRightSidebarWidth = num(v));
  parser.prop('curatePageLeftSidebarWidth',  v => source.curatePageLeftSidebarWidth  = num(v));
  parser.prop('showDeveloperTab',            v => source.showDeveloperTab            = !!v);
  parser.prop('currentTheme',                v => source.currentTheme                = str(v), true);
  parser.prop('lastSelectedLibrary',         v => source.lastSelectedLibrary         = str(v));
  parser.prop('gamesOrderBy',                v => source.gamesOrderBy                = strOpt(v, gameOrderByOptions,      'title'    ));
  parser.prop('gamesOrder',                  v => source.gamesOrder                  = strOpt(v, gameOrderReverseOptions, 'ASC'));
  parser.prop('defaultLibrary',              v => source.defaultLibrary              = str(v));
  parser.prop('saveImportedCurations',       v => source.saveImportedCurations       = !!v);
  parser.prop('onDemandImages',              v => source.onDemandImages              = !!v);
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

/**
 * Coerce a value to a string, then return it if it matches at least on of the options.
 * If it does not match any option, the default option is returned.
 * @param value Value to coerce.
 * @param options Options the value must match at least one of.
 * @param defaultOption This is returned if the value doesn't match any of the options.
 */
function strOpt<T extends string>(value: any, options: T[], defaultOption: T): T {
  value = str(value);
  for (let option of options) {
    if (value === option) { return value; }
  }
  return defaultOption;
}
