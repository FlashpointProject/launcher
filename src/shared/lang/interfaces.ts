import { LocalizedStringsMethods } from 'react-localization';

export interface ILocalization {
  config: IConfigStrings;
  home: IHomeStrings;
}

export interface IConfigStrings extends LocalizedStringsMethods {
  configHeader: string;
  configDesc: string;
  extremeGames: string;
  extremeGamesDesc: string;
  enableEditing: string;
  enableEditingDesc: string;
  flashpointHeader: string;
  flashpointPath: string;
  flashpointPathDesc: string;
  redirector: string;
  redirectorFiddler: string;
  redirectorDesc: string;
  useWine: string;
  useWineDesc: string;
  visualsHeader: string;
  useCustomTitleBar: string;
  useCustomTitleBarDesc: string;
  theme: string;
  noTheme: string;
  themeDesc: string;
  advancedHeader: string;
  showDeveloperTab: string
  showDeveloperTabDesc: string;
  saveAndRestart: string;
  browse: string;
}

export interface IHomeStrings extends LocalizedStringsMethods {
  quickStartHeader: string;
  hallOfFameInfo: string;
  animationInfo: string;
  configInfo: string;
  helpInfo: string;
  upgradesHeader: string;
  otherTechnologies: string;
  otherTechnologiesDesc: string;
  screenshots: string;
  screenshotsDesc: string;
  notInstalled: string;
  alreadyInstalled: string;
  extrasHeader: string;
  favouritesPlaylist: string;
  genreList: string;
  filterByPlatform: string;
  plannedFeatures: string;
  notesHeader: string;
  notes: string;
  randomPicks: string;
}

export interface IBrowseStrings extends LocalizedStringsMethods {
  noGameSelected: string;
  noGameSelectedDesc: string;
  failedLoadPlaylists: string;
  failedLoadPlaylistsDesc: string;
  newPlaylist: string;
  emptyPlaylist: string;
  emptyPlaylistDesc: string;
  editGame: string;
  deleteGame: string;
  new: string;
  edit: string;
  discard: string;
  save: string;
  delete: string;
  areYouSure: string;
  allGames: string;
  noTitle:string;
  noAuthor: string;
  enterDescriptionHere: string;
  by: string;
  noDeveloper: string;
  genre: string;
  noGenre: string;
  series: string;
  noSeries: string;
  publisher: string;
  noPublisher: string;
  source: string;
  noSource: string;
  platform: string;
  noPlatform: string;
  playMode: string;
  noPlayMode: string;
  status: string;
  noStatus: string;
  version: string;
  noVersion: string;
  releaseDate: string;
  noReleaseDate: string;
  language: string;
  noLanguage: string;
  dateAdded: string;
  brokenGame: string;
  extremeGame: string;
  notes: string;
  noNotes: string;
  originalDescription: string;
  noOriginalDescription: string;
  additionalApplications: string;
  applicationPath: string;
  noApplicationPath: string;
  launchCommand: string;
  noLaunchCommand: string;
  thumbnail: string;
  thumbnailDesc: string;
  screenshot: string;
  screenshotDesc: string;
  openFileLocation: string;
  duplicateMetaOnly: string;
  duplicateMetaAndImages: string;
  exportMetaOnly: string;
  exportMetaAndImages: string;
}

export interface ICurateStrings extends LocalizedStringsMethods {
  importAll: string;
  loadMeta: string;
  loadArchive: string;
}

export interface ILogsStrings extends LocalizedStringsMethods {
  copyText: string;
  clearLog: string;
}

export interface IAboutStrings extends LocalizedStringsMethods {
  aboutHeader: string;
  flashpointDesc: string;
  website: string;
  flashpointLauncher: string;
  flashpointLauncherDesc: string;
  version: string;
  license: string;
  creditsHeader: string;
}

export interface IMainStrings extends LocalizedStringsMethods {
  home: string;
  browse: string;
  arcade: string;
  theatre: string;
  logs: string;
  config: string;
  about: string;
  curate: string;
  newGame: string;
  search: string;
  gridSelect: string;
  listSelect: string;
  total: string;
}
