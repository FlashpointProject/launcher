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
    'hideExtremeScreenshots',
    'hideExtremeScreenshotsDesc',
    'fancyAnimations',
    'fancyAnimationsDesc',
    'searchLimit',
    'searchLimitDesc',
    'searchLimitUnlimited',
    'searchLimitValue',
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
    'contentFiltersHeader',
    'flashpointHeader',
    'flashpointPath',
    'flashpointPathDesc',
    'useWine',
    'useWineDesc',
    'libraries',
    'randomLibraries',
    'randomLibrariesDesc',
    'updateSource',
    'platforms',
    'nativePlatforms',
    'nativePlatformsDesc',
    'tagFilterGroups',
    'tagFilterGroupsDesc',
    'editTagFilter',
    'duplicateTagFilter',
    'deleteTagFilter',
    'appPathOverrides',
    'appPathOverridesDesc',
    'visualsHeader',
    'useCustomTitleBar',
    'useCustomTitleBarDesc',
    'theme',
    'noTheme',
    'themeDesc',
    'logoSet',
    'noLogoSet',
    'logoSetDesc',
    'advancedHeader',
    'showDeveloperTab',
    'showDeveloperTabDesc',
    'server',
    'serverDesc',
    'metadataServerHost',
    'metadataServerHostDesc',
    'extensionsHeader',
    'noExtensionsLoaded',
    'extDevScripts',
    'extThemes',
    'extLogoSets',
    'extApplications',
    'saveAndRestart',
    'saveAndClose',
    'browse',
    'tagFilterGroupEditor',
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
    'updateFeedHeader',
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
    'logLevels',
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
    'exportTags',
    'exportTagsDesc',
    'importTags',
    'importTagsDesc',
    'deleteAllPlaylists',
    'deleteAllPlaylistsDesc',
    'fixPrimaryAliases', // @NOT_ASSIGNED
    'fixPrimaryAliasesDesc', // @NOT_ASSIGNED
    'fixCommaTags', // @NOT_ASSIGNED
    'fixCommaTagsDesc', // @NOT_ASSIGNED
    'updateTagsString',
    'updateTagsStringDesc',
    'massImportGameData',
    'massImportGameDataDesc',
    'migrateExtremeGames',
    'migrateExtremeGamesDesc',
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
    'play',
    'stop',
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
    'legacyGame',
    'notInstalled',
    'installed',
    'download',
    'uninstallGame',
    'mountParameters',
    'noMountParameters',
    'showExtremeScreenshot',
    'extras',
    'noExtras',
    'message',
    'noMessage',
    'extrasName',
    'noExtrasName',
  ] as const,
  tags: [
    'name',
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
    'scanNewCurationFolders',
    'scanNewCurationFoldersDesc',
    'saveImportedCurations',
    'keepArchiveKey',
    'symlinkCurationContent',
    'useTagFilters',
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
    'noTags',
    'noSource',
    'unenteredTag',
    'noLogo',
    'noScreenshot',
    'ilc_notHttp',
    'ilc_nonExistant',
    'sort',
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
    'extreme'
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
    'showImage',
  ] as const,
  menu: [
    'viewThumbnailInFolder',
    'viewScreenshotInFolder',
    'openFileLocation',
    'addToPlaylist',
    'duplicateMetaOnly',
    'duplicateMetaAndImages',
    'copyGameUUID',
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
    'importPlaylistAs',
    'selectDataPackToImport',
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
    'areYouSureDelete',
    'areYouSurePlaylistRemove',
    'cancel',
    'mergePlaylists',
    'newPlaylist',
    'uploadPrivacyWarning',
    'overwriteFileTitle',
    'overwriteFileMessage',
    'overwriteFileDetail',
    'deleteTagFilterGroup',
    'deleteCuration',
    'importCuration',
    'deleteGameImage',
    'deletePlaylist',
    'importAllCurations',
    'deleteAllCurations',
    'removePlaylistGame',
    'deleteGame',
    'deleteAddApp',
    'deleteTagCategory',
    'deleteTag',
    'deleteTagAlias',
    'deleteSource',
    'uninstallGame',
    'deleteGameData',
    'unableToUninstallGameData',
    'unableToDeleteGame',
    'downloadingGame',
    'verifyingGame',
    'aFewMinutes',
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
  for (const key in langTemplate) {
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
export const autoCode = '<auto>';

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
