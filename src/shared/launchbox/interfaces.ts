/**
 * This interface represents a Game that is used in LaunchBox/Big Box.
 * (Data from a single <Game> tag in a LaunchBox Platform XML)
 * (NOTE: The property names are not necessarily the same as the XML node names, 
 *  so this might not be completely convertable by making the first character lower/upper case)
 * ( http://pluginapi.launchbox-app.com/html/b33d2055-e2be-3f42-12c6-adbc5668f454.htm )
 */
export interface ILaunchBoxGame {
  applicationPath?: string; // (String)
  // backgroundImagePath?: string; // (String)
  // backImagePath?: string; // (String)
  box3DImagePath?: string; // (String)
  broken?: boolean; // (Boolean)
  // cart3DImagePath?: string; // (String)
  // cartBackImagePath?: string; // (String)
  // cartFrontImagePath?: string; // (String)
  // clearLogoImagePath?: string; // (String)
  // cloneOf?: string; // (String)
  commandLine?: string; // (String)
  // communityOrLocalStarRating?: number; // (Float)
  communityStarRating?: number; // (Float)
  communityStarRatingTotalVotes?: number; // (Int32)
  completed?: boolean; // (Boolean)
  configurationCommandLine?: string; // (String)
  configurationPath?: string; // (String)
  dateAdded?: Date; // (DateTime)
  dateModified?: Date; // (DateTime)
  // detailsWithoutPlatform?: string; // (String)
  // detailsWithPlatform?: string; // (String)
  developer?: string; // (String)
  // developers?: string[]; // (String[])
  // dosBoxConfigurationPath?: string; // (String)
  // emulatorId?: string; // (String)
  favorite?: boolean; // (Boolean)
  // frontImagePath?: string; // (String)
  // genres?: string[]; // (BlockingCollection<String>) (BlockingCollection is just a thread-safe array?)
  // genresString?: string; // (String)
  hide?: boolean; // (Boolean)
  id?: string; // (String)
  // lastPlayedDate?: Date; // (Nullable<DateTime>)
  // launchBoxDbId?: number; // (Nullable<Int32>)
  manualPath?: string; // (String)
  // marqueeImagePath?: string; // (String)
  musicPath?: string; // (String)
  notes?: string; // (String)
  platform?: string; // (String)
  // platformClearLogoImagePath?: string; // (String)
  playCount?: number; // (Int32)
  // playModes?: string[]; // (String[])
  portable?: boolean; // (boolean)
  publisher?: string; // (String)
  // publishers?: string[]; // (String[])
  rating?: string; // (String)
  // ratingImage?: Image; // (Image)
  region?: string; // (String)
  // releaseDate?: Date; // (Nullable<DateTime>)
  // releaseYear?: number; // (Nullable<int>)
  rootFolder?: string; // (String)
  // screenshotImagePath?: string; // (String)
  // scummVmAspectCorrection?: boolean; // (Boolean)
  // scummVmFullscreen?: boolean; // (Boolean)
  // scummVmGameDataFolderPath?: string; // (String)
  // scummVmGameType?: string; // (String)
  series?: string; // (String)
  // seriesValues?: string[]; // (String[])
  // showBack?: boolean; // (Boolean)
  sortTitle?: string; // (String)
  // sortTitleOrTitle?: string; // (String)
  source?: string; // (String)
  /** The star rating as an Integer value. Deprecated; please use StarRatingFloat instead. */
  starRating?: number; // (Int32)
  /** The star rating as a Float value. Should be used instead of the original StarRating property. */
  starRatingFloat?: number; // (Float)
  status?: string; // (String)
  // themeVideoPath?: string; // (String)
  title?: string; // (String)
  useDosBox?: boolean; // (Boolean)
  // useScummVm?: boolean; // (Boolean)
  version?: string; // (String)
  videoPath?: number; // (Nullable<int>)
  wikipediaURL?: string; // (String) (wikipediaUrl in the docs)
  // -- Found in the XML(s) but not in the docs -- //
  emulator?: any;
  // SCUMM
  scummVMAspectCorrection?: boolean;
  scummVMFullscreen?: boolean;
  scummVMGameDataFolderPath?: string;
  scummVMGameType?: any;
  useScummVM?: boolean;
  playMode?: string;
  genre?: string;
  // Missing media
  missingVideo?: boolean;
  missingBoxFrontImage?: boolean;
  missingScreenshotImage?: boolean;
  missingClearLogoImage?: boolean;
  missingBackgroundImage?: boolean;
}

/**
 * This interface represents an Additional Application that is associated with an IGame in LaunchBox/Big Box.
 * (Data from a single <AdditionalApplication> tag in a LaunchBox Platform XML)
 * (NOTE: The property names are not necessarily the same as the XML node names, 
 *  so this might not be completely convertable by making the first character lower/upper case)
 * ( http://pluginapi.launchbox-app.com/html/866b513c-9bd8-0d1f-1568-45b3a3c24163.htm )
 */
export interface ILaunchBoxAdditionalApplication {
  /** The application path associated with this Additional Application. */
  applicationPath: string; // (String)
  /** A value specifying whether or not to automatically run this Additional Application after running the main game. */
  autoRunAfter: boolean; // (Boolean)
  /** A value specifying whether or not to automatically run this Additional Application before running the main game. */
  autoRunBefore: boolean; // (Boolean)
  /** The command line parameters used when launching this Additional Application. */
  commandLine: string; // (String)
  /** A value specifying the Developer of the Additional Application. */
  developer: string; // (String)
  // /** The command line parameters used when launching this Additional Application. */
  // disc: number; // (Nullable<int>) (Missing?)
  // /** A value specifying the ID of the emulator used for the Additional Application. Maps up directly to the emulator's Id property. */
  // emulatorId: string; // (String) (Missing?) (Not Nullable<*>?)
  /** The ID of the game that is associated with this Additional Application. Maps up directly to the game's Id property. */
  gameID: string; // (String)
  /** The ID of the Additional Application. This ID is automatically generated when a new Additional Application is created. */
  id: string; // (String)
  // /** A value specifying the ID of the emulator used for the Additional Application. Maps up directly to the emulator's Id property. */
  // lastPlayed: DateTime; // (DateTime) (Missing?)
  /** The Name of this Additional Application. */
  name: string; // (String)
  /** The number of times this Additional Application has been played. */
  playCount: number; // (Int32)
  /** A value specifying the Priority of this Additional Application. Priority is used for sorting additional applications. */
  priority: number; // (Int32) (Optional or Missing?)
  // /** A value specifying the Publisher of the Additional Application. */
  // publisher: string; // (String) (Optional or Missing?)
  /** A value specifying the Region of the Additional Application. */
  region: string; // (String)
  /** A value specifying the Release Date of the Additional Application. */
  // releaseDate: DateTime // (Nullable<DateTime>) (Optional or Missing?)
  /** A value specifying whether this Additional Application represents Side A or not. */
  sideA: boolean; // (Boolean)
  /** A value specifying whether this Additional Application represents Side B or not. */
  sideB: boolean; // (Boolean)
  /** A value specifying the Status of the Additional Application. */
  status: boolean; // (String)
  /** A value specifying whether this Additional Application should use DOSBox or not when launching. */
  useDosBox: boolean; // (Boolean)
  /** A value specifying whether this Additional Application should use an emulator or not when launching. */
  useEmulator: boolean; // (Boolean)
  /** A value specifying the Version of the Additional Application. */
  version: string; // (String)
  /** A value specifying whether this Additional Application should wait for exit before launching the game. */
  waitForExit: boolean; // (Boolean)
}

/** Root object in a LaunchBox Platform XML */
export interface ILaunchBoxPlatform {
  games: ILaunchBoxGame[];
  additionalApplications: ILaunchBoxAdditionalApplication[];
}
