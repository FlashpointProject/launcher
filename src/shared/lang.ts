import { RecursivePartial } from './interfaces';

/**
 * Template for the language types and containers.
 * Each property is a language category, and each of the strings is the name of a language string.
 */
const langTemplate = {
  config: [
    'configHeader',
    'configDesc',
    'preferencesHeader',
    'extremeGames',
    'extremeGamesDesc',
    'enableEditing',
    'enableEditingDesc',
    'currentLanguage',
    'currentLanguageDesc',
    'fallbackLanguage',
    'fallbackLanguageDesc',
    'auto',
    'none',
    'flashpointHeader',
    'flashpointPath',
    'flashpointPathDesc',
    'redirector',
    'redirectorFiddler',
    'redirectorDesc',
    'useWine',
    'useWineDesc',
    'platforms',
    'nativePlatforms',
    'nativePlatformsDesc',
    'visualsHeader',
    'useCustomTitleBar',
    'useCustomTitleBarDesc',
    'theme',
    'noTheme',
    'themeDesc',
    'advancedHeader',
    'showDeveloperTab',
    'showDeveloperTabDesc',
    'saveAndRestart',
    'browse',
  ] as const,
  home: [
    'updateHeader',
    'currentVersion',
    'nextVersion',
    'updateAvailable',
    'upToDate',
    'downloadingUpdate',
    'quickStartHeader',
    'hallOfFameInfo',
    'hallOfFame',
    'allGamesInfo',
    'allGames',
    'allAnimationsInfo',
    'allAnimations',
    'configInfo',
    'config',
    'helpInfo',
    'help',
    'upgradesHeader',
    'installComplete',
    'alreadyInstalled',
    'download',
    'update',
    'checkingUpgradeState',
    'extrasHeader',
    'favoritesPlaylist',
    'tagList',
    'filterByPlatform',
    'plannedFeatures',
    'notesHeader',
    'notes',
    'linuxSupport',
    'linuxSupportLinkText',
    'randomPicks',
  ] as const,
  logs: [
    'filters',
    'copyText',
    'clearLog',
  ] as const,
  app: [
    'home',
    'browse',
    'logs',
    'config',
    'about',
    'curate',
    'developer',
    'searchPlaceholder',
    'hideRightSidebar',
    'showRightSidebar',
    'hideLeftSidebar',
    'showLeftSidebar',
    'total',
    'newGame',
    'list',
    'grid',
    'searchResults',
  ] as const,
  filter: [
    'dateAdded',
    'tags',
    'platform',
    'series',
    'title',
    'developer',
    'publisher',
    'ascending',
    'descending',
  ] as const,
  developer: [
    'developerHeader',
    'developerDesc',
    'checkMissingImages',
    'checkMissingImagesDesc',
    'checkGameIds',
    'checkGameIdsDesc',
    'checkGameTitles',
    'checkGameTitlesDesc',
    'checkGameFields',
    'checkGameFieldsDesc',
    'checkPlaylists',
    'checkPlaylistsDesc',
    'checkGameFileLocation',
    'checkGameFileLocationDesc',
    'checkMissingExecMappings',
    'checkMissingExecMappingsDesc',
    'renameImagesTitleToId',
    'renameImagesTitleToIdDesc',
    'renameImagesIdToTitle',
    'renameImagesIdToTitleDesc',
    'createMissingFolders',
    'createMissingFoldersDesc',
    'servicesHeader',
    'servicesMissing',
    'running',
    'stopped',
    'killing',
    'start',
    'startDesc',
    'stop',
    'stopDesc',
    'restart',
    'restartDesc',
    'details',
    'detailsDesc',
  ] as const,
  about: [
    'aboutHeader',
    'flashpoint',
    'flashpointDesc',
    'website',
    'flashpointLauncher',
    'flashpointLauncherDesc',
    'version',
    'license',
    'licenseInfo',
    'creditsHeader',
  ] as const,
  browse: [
    'noTitle',
    'by',
    'noDeveloper',
    'alternateTitles',
    'noAlternateTitles',
    'tags',
    'noTags',
    'series',
    'noSeries',
    'publisher',
    'noPublisher',
    'source',
    'noSource',
    'platform',
    'noPlatform',
    'playMode',
    'noPlayMode',
    'status',
    'noStatus',
    'version',
    'noVersion',
    'releaseDate',
    'noReleaseDate',
    'language',
    'noLanguage',
    'dateAdded',
    'brokenInInfinity',
    'extreme',
    'playlistNotes',
    'noPlaylistNotes',
    'notes',
    'noNotes',
    'originalDescription',
    'noOriginalDescription',
    'additionalApplications',
    'noName',
    'launch',
    'new',
    'autoRunBefore',
    'waitForExit',
    'applicationPath',
    'noApplicationPath',
    'launchCommand',
    'noLaunchCommand',
    'library',
    'defaultLibrary',
    'thumbnail',
    'screenshot',
    'dropImageHere',
    'noGameSelected',
    'clickToSelectGame',
    'failedToLoadPlaylistFolder',
    'checkLogForInfo',
    'loadingPlaylists',
    'deleteAdditionalApplication',
    'deleteGameAndAdditionalApps',
    'removeGameFromPlaylist',
    'saveChanges',
    'discardChanges',
    'editGame',
    'allGames',
    'newPlaylist',
    'emptyPlaylist',
    'noGamesFound',
    'dropGameOnLeft',
    'leftSidebar',
    'setFlashpointPathQuestion',
    'flashpointPath',
    'config',
    'noteSaveAndRestart',
    'saveAndRestart',
    'loadingGames',
    'noGameMatchedDesc',
    'noGameMatchedSearch',
    'thereAreNoGames',
    'library',
    'defaultLibrary',
  ] as const,
  curate: [
    'importAll',
    'importAllDesc',
    'deleteAll',
    'deleteAllDesc',
    'openCurationsFolder',
    'openCurationsFolderDesc',
    'openExportsFolder',
    'openExportsFolderDesc',
    'openImportedFolder',
    'openImportedFolderDesc',
    'newCuration',
    'newCurationDesc',
    'loadMeta',
    'loadMetaDesc',
    'loadArchive',
    'loadArchiveDesc',
    'loadFolder',
    'loadFolderDesc',
    'saveImportedCurations',
    'noCurations',
    'id',
    'heading',
    'noHeading',
    'folderName',
    'noFolderName',
    'message',
    'noMessage',
    'curationNotes',
    'noCurationNotes',
    'newAddApp',
    'addExtras',
    'addMessage',
    'removeAddApp',
    'delete',
    'deleteCurationDesc',
    'openFolder',
    'indexContent',
    'run',
    'export',
    'import',
    'contentFiles',
    'default',
    'warnings',
    'noLaunchCommand',
    'invalidLaunchCommand',
    'releaseDateInvalid',
    'unusedApplicationPath',
    'unusedTags',
    'unusedPlatform',
    'nonExistingLibrary',
    'nonContentFolders',
    'ilc_notHttp',
    'ilc_nonExistant'
  ] as const,
  playlist: [
    'enterDescriptionHere',
    'noDescription',
    'save',
    'saveDesc',
    'discard',
    'discardDesc',
    'edit',
    'editDesc',
    'delete',
    'deleteDesc',
    'areYouSure',
    'noTitle',
    'titlePlaceholder',
    'noAuthor',
    'authorPlaceholder',
    'filename',
    'by',
  ] as const,
  misc: [
    'noBlankFound',
    'addBlank',
    'deleteAllBlankImages',
    'yes',
    'no',
    'downloading',
    'extracting',
    'installingFiles',
    'complete',
  ] as const,
  menu: [
    'viewThumbnailInFolder',
    'viewScreenshotInFolder',
    'openFileLocation',
    'duplicateMetaOnly',
    'duplicateMetaAndImages',
    'exportMetaOnly',
    'exportMetaAndImages',
  ] as const,
  dialog: [
    'programNotFound',
    'phpNotFound',
    'wineNotFound',
    'flashpointPathNotFound',
    'fileNotFound',
    'flashpointPathInvalid',
    'pathNotFound',
    'selectFileToExportMeta',
    'selectFolderToExportMetaAndImages',
    'replaceFilesQuestion',
    'exportedAlreadyExistsYesNo',
    'selectFolder',
    'selectScreenshot',
    'selectThumbnail',
    'selectThemeFile',
    'selectCurationFolder',
    'selectCurationArchive',
    'selectCurationMeta',
    'errorParsingPlatforms',
    'errorParsingPlatformsMessage',
    'dataRequired',
    'dataRequiredDesc',
    'upgradeWillInstallTo',
    'verifyPathSelection',
    'badFolderPerms',
    'pickAnotherFolder',
    'restartNow',
    'restartToApplyUpgrade',
    'selectInstallDirectory',
    'areYouSure'
  ] as const,
  setup: [
    'title',
    'additionalDataRequired',
    'selectInstallPath',
    'flashpointPath',
    'existingFolderAllowed',
    'warnExistingInstall',
    'warnInvalidPath',
    'startFlashpoint',
    'warnNotEmpty',
    'install'
  ] as const,
  // libraries: [], // (This is dynamically populated in run-time)
} as const;

/** Language template (short-hand). */
type LangTemplate = typeof langTemplate;

/** A language category (based on a language template category). */
type LangCategory<T extends readonly string[]> = {
  -readonly [K in T[number]]: string;
};

/** A dynamic and partial language category. */
type DynamicLangCategory = {
  [key: string]: string | undefined;
};

/** Base type of LangContainer (). */
export type BaseLangContainer = {
  -readonly [key in keyof LangTemplate]: LangCategory<LangTemplate[key]>;
};

/** Container of all language strings used by the launcher. */
export type LangContainer = BaseLangContainer & {
  libraries: DynamicLangCategory;
  upgrades: DynamicLangCategory;
};

/**
 * Create a language category object from a language template category.
 * @param tempCat Language template category.
 */
function createCategory<T extends readonly string[]>(tempCat: T): LangCategory<T> {
  const cat: LangCategory<T> = {} as any;
  for (let i = tempCat.length - 1; i >= 0; i--) {
    const value = tempCat[i];
    (cat as any)[value] = value;
  }
  return cat;
}

/** Create a base language container from the template. */
function createBaseLangContainer(): BaseLangContainer {
  const lang: BaseLangContainer = {} as any;
  for (let key in langTemplate) {
    lang[key as keyof LangTemplate] = createCategory(langTemplate[key as keyof LangTemplate]);
  }
  return lang;
}

/** Create a language container from the template. */
export function createLangContainer(): LangContainer {
  return {
    ...createBaseLangContainer(),
    libraries: {},
    upgrades: {},
  };
}

/** Contents of a language file. */
export type LangFile = {
  /** Kept for the watcher to keep track of ownership. */
  filename: string;
  /** 2 letter language code. */
  code: string;
  /** Contents of the language file. */
  data: RecursivePartial<LangFileContent>;
};

/** Contents of a language file. */
export type LangFileContent = LangContainer & {
  /** Name of the language (this will be displayed in the drop-down). */
  name: string;
};

/** Magic string used to reference "automatic language selection". */
export const autoCode: string = '<auto>';

export function getDefaultLocalization(): LangContainer {
  // Get the base language container
  const lang: LangContainer = createLangContainer();
  // Make some changes
  lang.config.auto += ' ({0})';
  lang.home.hallOfFameInfo += ' {0}';
  lang.home.allGamesInfo += ' {0}';
  lang.home.allAnimationsInfo += ' {0}';
  lang.home.configInfo += ' {0}';
  lang.home.helpInfo += ' {0}';
  lang.home.linuxSupport += ' {0}';
  lang.browse.dropGameOnLeft += ' {0}';
  lang.browse.setFlashpointPathQuestion += ' {0} {1}';
  lang.browse.noteSaveAndRestart += ' {0}';
  lang.misc.noBlankFound = '{0} ' + lang.misc.noBlankFound;
  lang.misc.addBlank += ' {0}';
  lang.misc.deleteAllBlankImages += ' {0}';
  lang.dialog.errorParsingPlatformsMessage = '{0} ' + lang.dialog.errorParsingPlatformsMessage;
  lang.dialog.upgradeWillInstallTo = '{0} ' + lang.dialog.upgradeWillInstallTo;
  // Return object
  return lang;
}
