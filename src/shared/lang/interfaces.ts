export type LangContainer = {
  config: ConfigLang;
  home: HomeLang;
  logs: LogLang;
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
  'randomPicks'
>;

export type LogLang = LangObject<
  'filters' |
  'copyText' |
  'clearLog'
>;

// export interface IBrowseStrings extends LocalizedStringsMethods {
//   noGameSelected: string;
//   noGameSelectedDesc: string;
//   failedLoadPlaylists: string;
//   failedLoadPlaylistsDesc: string;
//   newPlaylist: string;
//   emptyPlaylist: string;
//   emptyPlaylistDesc: string;
//   editGame: string;
//   deleteGame: string;
//   new: string;
//   edit: string;
//   discard: string;
//   save: string;
//   delete: string;
//   areYouSure: string;
//   allGames: string;
//   noTitle:string;
//   noAuthor: string;
//   enterDescriptionHere: string;
//   by: string;
//   noDeveloper: string;
//   genre: string;
//   noGenre: string;
//   series: string;
//   noSeries: string;
//   publisher: string;
//   noPublisher: string;
//   source: string;
//   noSource: string;
//   platform: string;
//   noPlatform: string;
//   playMode: string;
//   noPlayMode: string;
//   status: string;
//   noStatus: string;
//   version: string;
//   noVersion: string;
//   releaseDate: string;
//   noReleaseDate: string;
//   language: string;
//   noLanguage: string;
//   dateAdded: string;
//   brokenGame: string;
//   extremeGame: string;
//   notes: string;
//   noNotes: string;
//   originalDescription: string;
//   noOriginalDescription: string;
//   additionalApplications: string;
//   applicationPath: string;
//   noApplicationPath: string;
//   launchCommand: string;
//   noLaunchCommand: string;
//   thumbnail: string;
//   thumbnailDesc: string;
//   screenshot: string;
//   screenshotDesc: string;
//   openFileLocation: string;
//   duplicateMetaOnly: string;
//   duplicateMetaAndImages: string;
//   exportMetaOnly: string;
//   exportMetaAndImages: string;
// }

// export interface ICurateStrings extends LocalizedStringsMethods {
//   importAll: string;
//   loadMeta: string;
//   loadArchive: string;
// }

// export interface IAboutStrings extends LocalizedStringsMethods {
//   aboutHeader: string;
//   flashpointDesc: string;
//   website: string;
//   flashpointLauncher: string;
//   flashpointLauncherDesc: string;
//   version: string;
//   license: string;
//   creditsHeader: string;
// }

// export interface IAppStrings extends LocalizedStringsMethods {
//   home: string;
//   browse: string;
//   arcade: string;
//   theatre: string;
//   logs: string;
//   config: string;
//   about: string;
//   curate: string;
//   newGame: string;
//   search: string;
//   gridSelect: string;
//   listSelect: string;
//   total: string;
// }
