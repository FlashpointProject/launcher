import { RecursivePartial } from '../interfaces';

/** Container of all language strings used by the launcher. */
export type LangContainer = {
  config: ConfigLang;
  home: HomeLang;
  logs: LogsLang;
  app: AppLang;
  filter: FilterLang;
  developer: DeveloperLang;
  about: AboutLang;
  browse: BrowseLang;
  curate: CurateLang;
  playlist: PlaylistLang;
  misc: MiscLang;
  menu: MenuLang;
  dialog: DialogLang;
  libraries: LibrariesLang;
};

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

type LangObject<T extends string> = {
  [key in T]: string;
};

export type ConfigLang = LangObject<
  'configHeader' |
  'configDesc' |
  'preferencesHeader' |
  'extremeGames' |
  'extremeGamesDesc' |
  'enableEditing' |
  'enableEditingDesc' |
  'currentLanguage' |
  'currentLanguageDesc' |
  'fallbackLanguage' |
  'fallbackLanguageDesc' |
  'auto' |
  'none' |
  'flashpointHeader' |
  'flashpointPath' |
  'flashpointPathDesc' |
  'redirector' |
  'redirectorFiddler' |
  'redirectorDesc' |
  'useWine' |
  'useWineDesc' |
  'visualsHeader' |
  'useCustomTitleBar' |
  'useCustomTitleBarDesc' |
  'theme' |
  'noTheme' |
  'themeDesc' |
  'advancedHeader' |
  'showDeveloperTab' |
  'showDeveloperTabDesc' |
  'saveAndRestart' |
  'browse'
>;

export type HomeLang = LangObject<
  'quickStartHeader' |
  'hallOfFameInfo' |
  'hallOfFame' |
  'allGamesInfo' |
  'allGames' |
  'allAnimationsInfo' |
  'allAnimations' |
  'configInfo' |
  'config' |
  'helpInfo' |
  'help' |
  'upgradesHeader' |
  'installComplete' |
  'alreadyInstalled' |
  'download' |
  'extrasHeader' |
  'favoritesPlaylist' |
  'genreList' |
  'filterByPlatform' |
  'plannedFeatures' |
  'notesHeader' |
  'notes' |
  'linuxSupport' |
  'linuxSupportLinkText' |
  'randomPicks'
>;

export type LogsLang = LangObject<
  'filters' |
  'copyText' |
  'clearLog'
>;

export type AppLang = LangObject<
  'home' |
  'browse' |
  'logs' |
  'config' |
  'about' |
  'curate' |
  'developer' |
  'searchPlaceholder' |
  'hideRightSidebar' |
  'showRightSidebar' |
  'hideLeftSidebar' |
  'showLeftSidebar' |
  'total' |
  'newGame' |
  'list' |
  'grid'
>;

export type FilterLang = LangObject<
  'dateAdded' |
  'genre' |
  'platform' |
  'series' |
  'title' |
  'developer' |
  'publisher' |
  'ascending' |
  'descending'
>;

export type DeveloperLang = LangObject<
  'developerHeader' |
  'developerDesc' |
  'checkMissingImages' |
  'checkMissingImagesDesc' |
  'checkGameIds' |
  'checkGameIdsDesc' |
  'checkGameTitles' |
  'checkGameTitlesDesc' |
  'checkGameFields' |
  'checkGameFieldsDesc' |
  'checkPlaylists' |
  'checkPlaylistsDesc' |
  'checkGameFileLocation' |
  'checkGameFileLocationDesc' |
  'renameImagesTitleToId' |
  'renameImagesTitleToIdDesc' |
  'renameImagesIdToTitle' |
  'renameImagesIdToTitleDesc' |
  'createMissingFolders' |
  'createMissingFoldersDesc'
>;

export type AboutLang = LangObject<
  'aboutHeader' |
  'flashpoint' |
  'flashpointDesc' |
  'website' |
  'flashpointLauncher' |
  'flashpointLauncherDesc' |
  'version' |
  'license' |
  'licenseInfo' |
  'creditsHeader'
>;

export type BrowseLang = LangObject<
  'noTitle' |
  'by' |
  'noDeveloper' |
  'genre' |
  'noGenre' |
  'series' |
  'noSeries' |
  'publisher' |
  'noPublisher' |
  'source' |
  'noSource' |
  'platform' |
  'noPlatform' |
  'playMode' |
  'noPlayMode' |
  'status' |
  'noStatus' |
  'version' |
  'noVersion' |
  'releaseDate' |
  'noReleaseDate' |
  'language' |
  'noLanguage' |
  'dateAdded' |
  'brokenInInfinity' |
  'extreme' |
  'playlistNotes' |
  'noPlaylistNotes' |
  'notes' |
  'noNotes' |
  'originalDescription' |
  'noOriginalDescription' |
  'additionalApplications' |
  'noName' |
  'launch' |
  'new' |
  'commandLine' |
  'noCommandLine' |
  'autoRunBefore' |
  'waitForExit' |
  'applicationPath' |
  'noApplicationPath' |
  'launchCommand' |
  'noLaunchCommand' |
  'thumbnail' |
  'screenshot' |
  'dropImageHere' |
  'noGameSelected' |
  'clickToSelectGame' |
  'failedToLoadPlaylistFolder' |
  'checkLogForInfo' |
  'loadingPlaylists' |
  'deleteAdditionalApplication' |
  'deleteGameAndAdditionalApps' |
  'removeGameFromPlaylist' |
  'saveChanges' |
  'discardChanges' |
  'editGame' |
  'allGames' |
  'newPlaylist' |
  'emptyPlaylist' |
  'noGamesFound' |
  'dropGameOnLeft' |
  'leftSidebar' |
  'setFlashpointPathQuestion' |
  'flashpointPath' |
  'config' |
  'noteSaveAndRestart' |
  'saveAndRestart' |
  'loadingGames' |
  'noGameMatchedDesc' |
  'noGameMatchedSearch' |
  'thereAreNoGames'
>;

export type CurateLang = LangObject<
  'importAll' |
  'importAllDesc' |
  'newCuration' |
  'newCurationDesc' |
  'loadMeta' |
  'loadMetaDesc' |
  'loadArchive' |
  'loadArchiveDesc' |
  'loadFolder' |
  'loadFolderDesc' |
  'heading' |
  'noHeading' |
  'curationNotes' |
  'noCurationNotes' |
  'newAddApp' |
  'removeAddApp' |
  'remove' |
  'removeCurationDesc' |
  'indexContent' |
  'openFolder' |
  'run' |
  'export' |
  'import' |
  'contentFiles' |
  'warnings' |
  'isNotHttp' |
  'releaseDateInvalid' |
  'unusedApplicationPath' |
  'unusedGenre' |
  'unusedPlatform' |
  'noContent'
>;

export type PlaylistLang = LangObject<
  'enterDescriptionHere' |
  'noDescription' |
  'save' |
  'saveDesc' |
  'discard' |
  'discardDesc' |
  'edit' |
  'editDesc' |
  'delete' |
  'deleteDesc' |
  'areYouSure' |
  'noTitle' |
  'titlePlaceholder' |
  'noAuthor' |
  'authorPlaceholder'
>;

export type MiscLang = LangObject<
  'blankNotFound' |
  'addBlank' |
  'removeBlank' |
  'deleteAllBlankImages' |
  'yes' |
  'no'
>;

export type MenuLang = LangObject<
  'viewThumbnailInFolder' |
  'viewScreenshotInFolder' |
  'openFileLocation' |
  'duplicateMetaOnly' |
  'duplicateMetaAndImages' |
  'exportMetaOnly' |
  'exportMetaAndImages'
>;

export type DialogLang = LangObject<
  'programNotFound' |
  'phpNotFound' |
  'wineNotFound' |
  'fileNotFound' |
  'pathNotFound' |
  'selectFileToExportMeta' |
  'selectFolderToExportMetaAndImages' |
  'replaceFilesQuestion' |
  'exportedAlreadyExistsYesNo' |
  'selectScreenshot' |
  'selectThumbnail' |
  'selectThemeFile' |
  'selectCurationFolder' |
  'selectCurationArchive' |
  'selectCurationMeta' |
  'errorParsingPlatforms' |
  'errorParsingPlatformsMessage'
>;

export type LibrariesLang = Partial<LangObject<string>>;
