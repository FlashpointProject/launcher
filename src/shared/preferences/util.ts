import { autoCode } from '@shared/lang';
import { LogLevel } from '@shared/Log/interface';
import { delayedThrottle, delayedThrottleAsync } from '@shared/utils/throttle';
import {
  AdvancedFilter,
  AdvancedFilterToggle,
  AppPathOverride,
  AppPreferencesData,
  AppPreferencesDataMainWindow,
  GameDataSource,
  GameMetadataSource, GameOrderBy, GameOrderReverse,
  MetadataUpdateInfo,
  SingleUsePromptPrefs,
  StoredView,
  TagFilterGroup
} from 'flashpoint-launcher';
import { BackIn } from '../back/types';
import { BrowsePageLayout, ScreenshotPreviewMode } from '../BrowsePageLayout';
import { ARCADE } from '../constants';
import { DeepPartial } from '../interfaces';
import { gameOrderByOptions, gameOrderReverseOptions } from '../order/util';
import { deepCopy, parseVarStr } from '../Util';
import * as Coerce from '@shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '../utils/ObjectParser';
import { CurateGroup } from '@renderer/store/curate/slice';
import { getDefaultAdvancedFilter } from '@shared/search/util';
import { Paths } from '@shared/Paths';

export function updatePreferencesData(data: DeepPartial<AppPreferencesData>, send = true) {
  const preferences = window.Shared.preferences;
  // @TODO Figure out the delta change of the object tree, and only send the changes
  preferences.data = overwritePreferenceData(deepCopy(preferences.data), data);
  if (send) {
    sendPrefs();
  }
  if (preferences.onUpdate) { preferences.onUpdate(); }
}

export async function updatePreferencesDataAsync(data: DeepPartial<AppPreferencesData>, send = true) {
  const preferences = window.Shared.preferences;
  // @TODO Figure out the delta change of the object tree, and only send the changes
  preferences.data = overwritePreferenceData(deepCopy(preferences.data), data);
  if (send) {
    await sendPrefsAsync();
  }
  if (preferences.onUpdate) { preferences.onUpdate(); }
}

const sendPrefs = delayedThrottle(() => {
  const preferences = window.Shared.preferences;
  window.Shared.back.send(
    BackIn.UPDATE_PREFERENCES,
    preferences.data,
    false
  );
}, 200);

const sendPrefsAsync = delayedThrottleAsync(async () => {
  const preferences = window.Shared.preferences;
  await window.Shared.back.request(
    BackIn.UPDATE_PREFERENCES,
    preferences.data,
    false
  );
}, 200);

const { num, str } = Coerce;

/** Default Preferences Data used for values that are not found in the file */
export const defaultPreferencesData: Readonly<AppPreferencesData> = Object.freeze<AppPreferencesData>({
  registerProtocol: true,
  imageFolderPath: 'Data/Images',
  logoFolderPath: 'Data/Logos',
  playlistFolderPath: 'Data/Playlists',
  jsonFolderPath: 'Data',
  htdocsFolderPath: 'Legacy/htdocs',
  platformFolderPath: 'Data/Platforms',
  themeFolderPath: 'Data/Themes',
  logoSetsFolderPath: 'Data/LogoSets',
  metaEditsFolderPath: 'Data/MetaEdits',
  extensionsPath: 'Data/Extensions',
  dataPacksFolderPath: 'Data/Games',
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
  currentLogoSet: undefined,
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
  keepArchiveKey: true,
  symlinkCurationContent: true,
  onDemandImages: true,
  onDemandImagesCompressed: true,
  onDemandBaseUrl: 'https://infinity.unstable.life/images/',
  browserModeProxy: 'localhost:22500',
  showLogSource: Object.freeze({
    // (Add log sources that should be hidden by default here)
  }),
  showLogLevel: Object.freeze({
    [LogLevel.TRACE]: false,
    [LogLevel.DEBUG]: false,
    [LogLevel.INFO]: true,
    [LogLevel.WARN]: true,
    [LogLevel.ERROR]: true,
    [LogLevel.SILENT]: true,
  }),
  excludedRandomLibraries: [],
  appPathOverrides: [],
  tagFilters: [],
  tagFiltersInCurate: false,
  nativePlatforms: [],
  disableExtremeGames: false,
  showBrokenGames: false,
  minimizedHomePageBoxes: [],
  hideExtremeScreenshots: true,
  updateFeedUrl: 'https://bluemaxima.org/flashpoint/updateFeed/stable.txt',
  fancyAnimations: true,
  searchLimit: 0,
  onlineManual: 'https://flashpointproject.github.io/manual/',
  offlineManual: '',
  fpfssBaseUrl: 'https://fpfss.unstable.life',
  groups: [],
  server: 'Apache Webserver',
  curateServer: 'Apache Webserver',
  shortcuts: {
    curate: {
      prev: ['ctrl+arrowup', 'cmd+arrowup'],
      next: ['ctrl+arrowdown', 'cmd+arrowdown'],
      load: ['ctrl+o', 'cmd+o'],
      newCur: ['ctrl+n', 'cmd+n'],
      deleteCurs: ['ctrl+delete', 'cmd+delete'],
      exportCurs: ['ctrl+s', 'cmd+s'],
      exportDataPacks: ['ctrl+shift+s', 'cmd+shift+s'],
      importCurs: ['ctrl+i', 'cmd+i'],
      refresh: ['ctrl+r', 'cmd+r'],
      run: ['ctrl+t', 'cmd+t'],
      runMad4fp: ['ctrl+shift+t', 'cmd+shift+t']
    }
  },
  gameDataSources: [],
  gameMetadataSources: [],
  enablePlaytimeTracking: true,
  enablePlaytimeTrackingExtreme: true,
  enableVerboseLogging: false,
  screenshotPreviewMode: ScreenshotPreviewMode.OFF,
  screenshotPreviewDelay: 250,
  singleUsePrompt: {
    badAntiVirus: false,
  },
  useStoredViews: true,
  storedViews: [],
  useCustomViews: false,
  customViews: [],
  defaultOpeningPage: Paths.HOME,
});

/**
 * Overwrite a preferences data object with data from another object.
 *
 * @param source Object to overwrite.
 * @param data Object with data to overwrite the source with.
 * @param onError Called when an error occurs
 * @returns Source argument (not a copy).
 */
export function overwritePreferenceData(
  source: AppPreferencesData,
  data: DeepPartial<AppPreferencesData>,
  onError?: (error: string) => void
): AppPreferencesData {
  const parser = new ObjectParser({
    input: data,
    onError: onError && (e => onError(`Error while parsing Preferences: ${e.toString()}`)),
  });
  // Parse root object
  parser.prop('registerProtocol',              v => source.registerProtocol              = !!v, true);
  parser.prop('imageFolderPath',               v => source.imageFolderPath               = parseVarStr(str(v)), true);
  parser.prop('logoFolderPath',                v => source.logoFolderPath                = parseVarStr(str(v)), true);
  parser.prop('playlistFolderPath',            v => source.playlistFolderPath            = parseVarStr(str(v)), true);
  parser.prop('jsonFolderPath',                v => source.jsonFolderPath                = parseVarStr(str(v)), true);
  parser.prop('htdocsFolderPath',              v => source.htdocsFolderPath              = parseVarStr(str(v)), true);
  parser.prop('platformFolderPath',            v => source.platformFolderPath            = parseVarStr(str(v)), true);
  parser.prop('themeFolderPath',               v => source.themeFolderPath               = parseVarStr(str(v)), true);
  parser.prop('logoSetsFolderPath',            v => source.logoSetsFolderPath            = parseVarStr(str(v)), true);
  parser.prop('metaEditsFolderPath',           v => source.metaEditsFolderPath           = parseVarStr(str(v)), true);
  parser.prop('extensionsPath',                v => source.extensionsPath                = parseVarStr(str(v)), true);
  parser.prop('dataPacksFolderPath',           v => source.dataPacksFolderPath           = parseVarStr(str(v)), true);
  parser.prop('browsePageGameScale',           v => source.browsePageGameScale           = num(v), true);
  parser.prop('browsePageShowExtreme',         v => source.browsePageShowExtreme         = !!v, true);
  parser.prop('hideExtremeScreenshots',        v => source.hideExtremeScreenshots        = !!v, true);
  parser.prop('enableEditing',                 v => source.enableEditing                 = !!v, true);
  parser.prop('fallbackLanguage',              v => source.fallbackLanguage              = str(v), true);
  parser.prop('currentLanguage',               v => source.currentLanguage               = str(v), true);
  parser.prop('browsePageLayout',              v => source.browsePageLayout              = num(v), true);
  parser.prop('browsePageShowLeftSidebar',     v => source.browsePageShowLeftSidebar     = !!v, true);
  parser.prop('browsePageShowRightSidebar',    v => source.browsePageShowRightSidebar    = !!v, true);
  parser.prop('browsePageLeftSidebarWidth',    v => source.browsePageLeftSidebarWidth    = num(v), true);
  parser.prop('browsePageRightSidebarWidth',   v => source.browsePageRightSidebarWidth   = num(v), true);
  parser.prop('curatePageLeftSidebarWidth',    v => source.curatePageLeftSidebarWidth    = num(v), true);
  parser.prop('showDeveloperTab',              v => source.showDeveloperTab              = !!v, true);
  parser.prop('currentTheme',                  v => source.currentTheme                  = str(v), true);
  parser.prop('lastSelectedLibrary',           v => source.lastSelectedLibrary           = str(v), true);
  parser.prop('gamesOrderBy',                  v => source.gamesOrderBy                  = strOpt(v, gameOrderByOptions, 'title'), true);
  parser.prop('gamesOrder',                    v => source.gamesOrder                    = strOpt(v, gameOrderReverseOptions, 'ASC'), true);
  parser.prop('defaultLibrary',                v => source.defaultLibrary                = str(v), true);
  parser.prop('saveImportedCurations',         v => source.saveImportedCurations         = !!v, true);
  parser.prop('keepArchiveKey',                v => source.keepArchiveKey                = !!v, true);
  parser.prop('symlinkCurationContent',        v => source.symlinkCurationContent        = !!v, true);
  parser.prop('tagFiltersInCurate',            v => source.tagFiltersInCurate            = !!v, true);
  parser.prop('onDemandImages',                v => source.onDemandImages                = !!v, true);
  parser.prop('onDemandImagesCompressed',      v => source.onDemandImagesCompressed      = !!v, true);
  parser.prop('browserModeProxy',              v => source.browserModeProxy              = str(v), true);
  parser.prop('onDemandBaseUrl',               v => source.onDemandBaseUrl               = parseVarStr(str(v)), true);
  parser.prop('excludedRandomLibraries',       v => source.excludedRandomLibraries       = strArray(v), true);
  parser.prop('minimizedHomePageBoxes',        v => source.minimizedHomePageBoxes        = strArray(v), true);
  parser.prop('nativePlatforms',               v => source.nativePlatforms               = strArray(v), true);
  parser.prop('disableExtremeGames',           v => source.disableExtremeGames           = !!v, true);
  parser.prop('showBrokenGames',               v => source.showBrokenGames               = !!v, true);
  parser.prop('updateFeedUrl',                 v => source.updateFeedUrl                 = str(v), true);
  parser.prop('onlineManual',                  v => source.onlineManual                  = str(v), true);
  parser.prop('offlineManual',                 v => source.offlineManual                 = str(v), true);
  parser.prop('fpfssBaseUrl',                  v => source.fpfssBaseUrl                  = str(v), true);
  parser.prop('fancyAnimations',               v => source.fancyAnimations                                = !!v, true);
  parser.prop('searchLimit',                   v => source.searchLimit                   = num(v), true);
  parser.prop('server',                        v => source.server                        = str(v), true);
  parser.prop('curateServer',                  v => source.curateServer                  = str(v), true);
  parser.prop('enablePlaytimeTracking',        v => source.enablePlaytimeTracking        = !!v, true);
  parser.prop('enablePlaytimeTrackingExtreme', v => source.enablePlaytimeTrackingExtreme = !!v, true);
  parser.prop('enableVerboseLogging',          v => source.enableVerboseLogging          = !!v, true);
  parser.prop('screenshotPreviewMode',         v => source.screenshotPreviewMode         = parseScreenshotPreviewMode(v), true);
  parser.prop('screenshotPreviewDelay',        v => source.screenshotPreviewDelay        = num(v), true);
  parser.prop('useStoredViews',                v => source.useStoredViews                                  = !!v, true);
  parser.prop('useCustomViews',                v => source.useCustomViews                = !!v, true);
  parser.prop('customViews',                   v => source.customViews          = strArray(v), true);
  parser.prop('defaultOpeningPage',            v   => source.defaultOpeningPage           = str(v), true);

  // Can't have a negative delay!
  if (source.screenshotPreviewDelay < 0) {
    source.screenshotPreviewDelay = 0;
  }

  // Migrate onDemandBaseUrl from the older FP url
  if (source.onDemandBaseUrl == 'https://infinity.unstable.life/Flashpoint/Data/Images/') {
    source.onDemandBaseUrl = 'https://infinity.unstable.life/images/';
  }
  if (data.shortcuts) {
    // @TODO Validate
    source.shortcuts = Object.assign(source.shortcuts, data.shortcuts);
  }
  if (data.groups) {
    const newGroups: CurateGroup[] = [];
    parser.prop('groups').array((item, index) => newGroups[index] = parseCurateGroup(item));
    source.groups = newGroups;
  }
  if (data.appPathOverrides) {
    const newAppPathOverrides: AppPathOverride[] = [];
    parser.prop('appPathOverrides').array((item, index) => newAppPathOverrides[index] = parseAppPathOverride(item));
    source.appPathOverrides = newAppPathOverrides;
  }
  // Parse window object
  if (data.mainWindow) {
    parseMainWindow(parser.prop('mainWindow'), source.mainWindow,);
  }
  if (data.showLogSource) {
    parser.prop('showLogSource').mapRaw((item, label) => source.showLogSource[label] = !!item);
  }
  if (data.showLogLevel) {
    parser.prop('showLogLevel').mapRaw((item, label) => source.showLogLevel[label as LogLevel] = !!item);
  }
  parser.prop('currentLogoSet',              v => source.currentLogoSet              = str(v), true);
  if (data.tagFilters) {
    // Why is this or undefined anyway?
    const newTagFilters: TagFilterGroup[] = [];
    parser.prop('tagFilters').array((item, index) => newTagFilters[index] = parseTagFilterGroup(item as IObjectParserProp<TagFilterGroup>));
    source.tagFilters = newTagFilters;
  }
  if (data.gameDataSources) {
    const newSources: GameDataSource[] = [];
    parser.prop('gameDataSources').array((item, index) => newSources[index] = parseGameDataSource(item as IObjectParserProp<GameDataSource>));
    source.gameDataSources = newSources;
  }
  if (data.gameMetadataSources) {
    const newSources: GameMetadataSource[] = [];
    parser.prop('gameMetadataSources').array((item, index) => newSources[index] = parseGameMetadataSource(item as IObjectParserProp<GameMetadataSource>));
    source.gameMetadataSources = newSources;
  }
  if (data.singleUsePrompt) {
    source.singleUsePrompt = parseSingleUsePrompt(parser.prop('singleUsePrompt') as IObjectParserProp<SingleUsePromptPrefs>);
  }
  if (data.storedViews) {
    const newStoredViews: StoredView[] = [];
    parser.prop('storedViews').array((item, index) => newStoredViews[index] = parseStoredView(item as IObjectParserProp<StoredView>));
    source.storedViews = newStoredViews;
  }
  // Done
  return source;
}

function parseScreenshotPreviewMode(v: any): ScreenshotPreviewMode {
  const n = num(v);
  switch (n) {
    case 0:
      return ScreenshotPreviewMode.OFF;
    case 1:
      return ScreenshotPreviewMode.ON;
    case 2:
      return ScreenshotPreviewMode.ALWAYS;
    default:
      return ScreenshotPreviewMode.OFF;
  }
}

function parseSingleUsePrompt(parser: IObjectParserProp<SingleUsePromptPrefs>): SingleUsePromptPrefs {
  const prompts: SingleUsePromptPrefs = {
    badAntiVirus: false,
  };

  parser.prop('badAntiVirus', v => prompts.badAntiVirus = !!v, true);

  return prompts;
}

function parseMainWindow(parser: IObjectParserProp<any>, output: AppPreferencesDataMainWindow): void {
  parser.prop('x',         v => output.x         = num(v), true);
  parser.prop('y',         v => output.y         = num(v), true);
  parser.prop('width',     v => output.width     = num(v), true);
  parser.prop('height',    v => output.height    = num(v), true);
  parser.prop('maximized', v => output.maximized = !!v);
}

function parseAppPathOverride(parser: IObjectParserProp<any>): AppPathOverride {
  const override: AppPathOverride = {
    path: '',
    override: '',
    enabled: true
  };
  parser.prop('path',     v => override.path     = str(v));
  parser.prop('override', v => override.override = str(v));
  parser.prop('enabled',  v => override.enabled  = !!v);
  return override;
}

function parseGameDataSource(parser: IObjectParserProp<GameDataSource>): GameDataSource {
  const source: GameDataSource = {
    type: 'raw',
    name: '',
    arguments: []
  };
  parser.prop('type', v => source.type = str(v));
  parser.prop('name', v => source.name = str(v));
  parser.prop('arguments').arrayRaw((item, index) => source.arguments.push(item));
  return source;
}

function parseGameMetadataSource(parser: IObjectParserProp<GameMetadataSource>): GameMetadataSource {
  const source: GameMetadataSource = {
    name: '',
    baseUrl: '',
    games: {
      actualUpdateTime: '1970-01-01',
      latestDeleteTime: '1970-01-01',
      latestUpdateTime: '1970-01-01'
    },
    tags: {
      actualUpdateTime: '1970-01-01',
      latestDeleteTime: '1970-01-01',
      latestUpdateTime: '1970-01-01'
    },
  };
  parser.prop('name',             v => source.name             = str(v));
  parser.prop('baseUrl',          v => source.baseUrl          = str(v));
  parseMetadataUpdateInfo(parser.prop('games'), source.games);
  parseMetadataUpdateInfo(parser.prop('tags'), source.tags);
  return source;
}

function parseAdvancedFilterToggle(toggle: string): AdvancedFilterToggle {
  if (toggle !== 'whitelist' && toggle !== 'blacklist') {
    return 'whitelist';
  }
  return toggle;
}

function parseAdvancedFilter(parser: IObjectParserProp<AdvancedFilter>, output: AdvancedFilter) {
  parser.prop('installed', v => output.installed = v === undefined ? undefined : !!v, true);
  parser.prop('legacy', v => output.legacy = v === undefined ? undefined : !!v, true);
  parser.prop('library', true).mapRaw((item, index) => output.library[index] = parseAdvancedFilterToggle(str(item)));
  parser.prop('playlistOrder', v => output.playlistOrder = !!v, true);
  parser.prop('playMode', true).mapRaw((item, index) => output.playMode[index] = parseAdvancedFilterToggle(str(item)));
  parser.prop('platform', true).mapRaw((item, index) => output.platform[index] = parseAdvancedFilterToggle(str(item)));
  parser.prop('tags', true).mapRaw((item, index) => output.tags[index] = parseAdvancedFilterToggle(str(item)));
  parser.prop('developer', true).mapRaw((item, index) => output.developer[index] = parseAdvancedFilterToggle(str(item)));
  parser.prop('publisher', true).mapRaw((item, index) => output.publisher[index] = parseAdvancedFilterToggle(str(item)));
  parser.prop('series', true).mapRaw((item, index) => output.series[index] = parseAdvancedFilterToggle(str(item)));
}

function parseStoredView(parser: IObjectParserProp<StoredView>): StoredView {
  const source: StoredView = {
    view: '',
    text: '',
    advancedFilter: getDefaultAdvancedFilter(),
    orderBy: 'title',
    orderReverse: 'ASC',
    expanded: true,
  };

  parser.prop('view', v => source.view = str(v));
  parser.prop('text', v => source.text = str(v), true);
  parseAdvancedFilter(parser.prop('advancedFilter'), source.advancedFilter);
  parser.prop('orderBy', v => source.orderBy = parseOrderBy(v), true);
  parser.prop('orderReverse', v => source.orderReverse = parseOrderReverse(v), true);
  parser.prop('selectedPlaylistId', v => source.selectedPlaylistId = str(v), true);
  parser.prop('selectedGameId', v => source.selectedGameId = str(v), true);
  parser.prop('expanded', v => source.expanded = !!v, true);

  return source;
}

function parseMetadataUpdateInfo(parser: IObjectParserProp<MetadataUpdateInfo>, output: MetadataUpdateInfo) {
  parser.prop('actualUpdateTime', v => output.actualUpdateTime = str(v), true);
  parser.prop('latestUpdateTime', v => output.latestUpdateTime = str(v), true);
  parser.prop('latestDeleteTime', v => output.latestDeleteTime = str(v), true);
}

function parseTagFilterGroup(parser: IObjectParserProp<TagFilterGroup>): TagFilterGroup {
  const tfg: TagFilterGroup = {
    name: '',
    description: '',
    enabled: false,
    tags: [],
    categories: [],
    childFilters: [],
    extreme: false
  };
  parser.prop('name',    v => tfg.name    = str(v));
  parser.prop('description', v => tfg.description = str(v));
  parser.prop('enabled', v => tfg.enabled = !!v);
  parser.prop('tags').arrayRaw((item) => tfg.tags.push(str(item)));
  parser.prop('categories').arrayRaw((item) => tfg.categories.push(str(item)));
  parser.prop('childFilters').arrayRaw((item) => tfg.childFilters.push(str(item)));
  parser.prop('extreme', v => tfg.extreme = !!v);
  return tfg;
}

function parseCurateGroup(parser: IObjectParserProp<any>): CurateGroup {
  const g: CurateGroup = {
    name: '',
    icon: ''
  };
  parser.prop('name', v => g.name = str(v));
  parser.prop('icon', v => g.icon = str(v));
  return g;
}

function parseOrderBy(value: string): GameOrderBy {
  switch (value) {
    case 'custom':
    case 'title':
    case 'developer':
    case 'publisher':
    case 'series':
    case 'platform':
    case 'dateAdded':
    case 'dateModified':
    case 'releaseDate':
    case 'lastPlayed':
    case 'playtime':
      return value;
    default:
      return 'title';
  }
}

function parseOrderReverse(value: string): GameOrderReverse {
  switch (value) {
    case 'ASC':
    case 'DESC':
      return value;
    default:
      return 'ASC';
  }
}


/**
 * Coerce a value to a string, then return it if it matches at least on of the options.
 * If it does not match any option, the default option is returned.
 *
 * @param value Value to coerce.
 * @param options Options the value must match at least one of.
 * @param defaultOption This is returned if the value doesn't match any of the options.
 */
function strOpt<T extends string>(value: any, options: T[], defaultOption: T): T {
  value = str(value);
  for (const option of options) {
    if (value === option) { return value; }
  }
  return defaultOption;
}

function strArray(array: any): string[] {
  return Array.isArray(array)
    ? Array.prototype.map.call(array, v => str(v)) as string[]
    : [];
}
