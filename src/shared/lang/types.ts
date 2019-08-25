import { Menu } from 'electron';

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
}

export type Language = {
  code: string;
  name: string;
}

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
  'favouritesPlaylist' |
  'genreList' |
  'filterByPlatform' |
  'plannedFeatures' |
  'notesHeader' |
  'notes' |
  'randomPicks' |
  'upgradesTech' |
  'upgradesTechDesc' |
  'upgradesScreenshots' |
  'upgradesScreenshotsDesc'
>;

export type LogsLang = LangObject<
  'filters' |
  'copyText' |
  'clearLog'
>;

export type AppLang = LangObject<
  'home' |
  'browse' |
  'arcade' |
  'theatre' |
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
  'titlePlaceholder' |
  'author' |
  'authorPlaceholder' |
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
  'setFlashpointPathQuestion' |
  'noteSaveAndRestart' |
  'loadingGames' |
  'noGameMatchedSearch' |
  'thereAreNoGames'
>;

export type CurateLang = LangObject<
  'importAll' |
  'importAllDesc' |
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
  'remove' |
  'removeDesc' |
  'removeCurationDesc' |
  'import' |
  'contentFiles' |
  'warnings'
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
  'deleteAllImages' |
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
  'replaceFilesQuestion' |
  'exportedAlreadyExistsYesNo' |
  'selectScreenshot' |
  'selectThumbnail' |
  'selectThemeFile' |
  'selectCurationFolder' |
  'selectCurationArchive' |
  'selectCurationMeta'
>;
