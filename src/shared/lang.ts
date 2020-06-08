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
    'onDemandImages',
    'onDemandImagesDesc',
    'currentLanguage',
    'currentLanguageDesc',
    'fallbackLanguage',
    'fallbackLanguageDesc',
    'auto',
    'none',
    'flashpointHeader',
    'flashpointPath',
    'flashpointPathDesc',
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
    'server',
    'serverDesc',
    'metadataServerHost',
    'metadataServerHostDesc',
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
    'rerollPicks',
  ] as const,
  logs: [
    'filters',
    'copyText',
    'clearLog',
    'copy404Urls',
    'uploadLog',
    'copiedToClipboard',
  ] as const,
  app: [
    'home',
    'browse',
    'tags',
    'categories',
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
    'dateModified',
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
    'importLegacyPlatforms',
    'importLegacyPlatformsDesc',
    'importLegacyPlaylists',
    'importLegacyPlaylistsDesc',
    'fixPrimaryAliases', // @NOT_ASSIGNED
    'fixPrimaryAliasesDesc', // @NOT_ASSIGNED
    'fixCommaTags', // @NOT_ASSIGNED
    'fixCommaTagsDesc', // @NOT_ASSIGNED
    'forceGameMetaSync', // @NOT_ASSIGNED
    'forceGameMetaSyncDesc', // @NOT_ASSIGNED
    'importMetaEdits',
    'importMetaEditsDesc',
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
    'specialThanks',
  ] as const,
  browse: [
    'noTitle',
    'by',
    'noDeveloper',
    'alternateTitles',
    'noAlternateTitles',
    'tags',
    'noTags',
    'enterTag',
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
    'dateModified',
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
    'deleteAdditionalApplication',
    'deleteGameAndAdditionalApps',
    'removeGameFromPlaylist',
    'saveChanges',
    'discardChanges',
    'editGame',
    'allGames',
    'newPlaylist',
    'importPlaylist',
    'emptyPlaylist',
    'noGamesFound',
    'dropGameOnLeft',
    'leftSidebar',
    'setFlashpointPathQuestion',
    'flashpointPath',
    'config',
    'noteSaveAndRestart',
    'saveAndRestart',
    'noGameMatchedDesc',
    'noGameMatchedSearch',
    'thereAreNoGames',
    'searching',
    'library',
    'defaultLibrary',
  ] as const,
  tags: [
    'noName',
    'description',
    'noDescription',
    'category',
    'noCategory',
    'newCategory',
    'enterAlias',
    'aliases',
    'editTag',
    'color',
    'noTagSelected',
    'clickToSelectTag',
    'deleteTagAlias',
    'setPrimaryAlias',
    'mergeIntoTag',
    'mergeTag',
    'makeAliasWhenMerged',
    'deleteTag',
    'deleteTagCategory',
    'locked',
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
    'runWithMAD4FP',
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
    'ilc_nonExistant',
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
    'changeIcon',
    'duplicatePlaylistDesc',
    'exportPlaylistDesc',
    'delete',
    'deleteDesc',
    'areYouSure',
    'noTitle',
    'titlePlaceholder',
    'noAuthor',
    'authorPlaceholder',
    'id',
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
    'exportMetaEditTitle',
    'exportMetaEditDesc',
  ] as const,
  menu: [
    'viewThumbnailInFolder',
    'viewScreenshotInFolder',
    'openFileLocation',
    'duplicateMetaOnly',
    'duplicateMetaAndImages',
    'exportMetaOnly',
    'exportMetaAndImages',
    'exportMetaEdit',
    'duplicatePlaylist',
    'exportPlaylist',
  ] as const,
  dialog: [
    'programNotFound',
    'phpNotFound',
    'wineNotFound', // @UNUSED
    'flashpointPathNotFound',
    'fileNotFound',
    'flashpointPathInvalid',
    'pathNotFound', // @UNUSED
    'playlistConflict',
    'importedPlaylistAlreadyExists',
    'mergeOrStaySeperate',
    'selectFileToExportMeta',
    'selectFolderToExportMetaAndImages',
    'selectFileToExportPlaylist',
    'replaceFilesQuestion', // @UNUSED
    'exportedAlreadyExistsYesNo', // @UNUSED
    'selectFolder',
    'selectScreenshot',
    'selectThumbnail',
    'selectCurationFolder',
    'selectCurationArchive',
    'selectCurationMeta',
    'selectPlaylistToImport',
    'dataRequired',
    'dataRequiredDesc',
    'upgradeWillInstallTo',
    'verifyPathSelection',
    'badFolderPerms', // @NOT_ASSIGNED
    'pickAnotherFolder', // @NOT_ASSIGNED
    'restartNow',
    'restartToApplyUpgrade',
    'areYouSure',
    'cancel',
    'mergePlaylists',
    'newPlaylist',
    'uploadPrivacyWarning',
    'overwriteFileTitle',
    'overwriteFileMessage',
    'overwriteFileDetail',
  ] as const,
  // libraries: [], // (This is dynamically populated in run-time)
} as const;

/** Language template (short-hand). */
type LangTemplate = typeof langTemplate

/** A language category (based on a language template category). */
type LangCategory<T extends readonly string[]> = {
  -readonly [K in T[number]]: string;
}

/** A dynamic and partial language category. */
type DynamicLangCategory = {
  [key: string]: string | undefined;
}

/** Base type of LangContainer (). */
export type BaseLangContainer = {
  -readonly [key in keyof LangTemplate]: LangCategory<LangTemplate[key]>;
}

/** Container of all language strings used by the launcher. */
export type LangContainer = BaseLangContainer & {
  libraries: DynamicLangCategory;
  upgrades: DynamicLangCategory;
}

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
}

/** Contents of a language file. */
export type LangFileContent = LangContainer & {
  /** Name of the language (this will be displayed in the drop-down). */
  name: string;
}

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
  lang.dialog.upgradeWillInstallTo = '{0} ' + lang.dialog.upgradeWillInstallTo;
  lang.dialog.importedPlaylistAlreadyExists = lang.dialog.importedPlaylistAlreadyExists + ' - "{0}"';
  // Return object
  return lang;
}
