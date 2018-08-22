/** Root object in a LaunchBox Platform XML */
export interface IRawLaunchBoxPlatformRoot {
  LaunchBox?: IRawLaunchBoxPlatform;
}

/** Only child of the root object in a LaunchBox Platform XML */
export interface IRawLaunchBoxPlatform {
  Game?: IRawLaunchBoxGame[];
  AdditionalApplication?: IRawLaunchBoxAdditionalApplication[];
}

/**
 * This interface represents a Game that is used in LaunchBox/Big Box.
 * (Data from a single <Game> tag in a LaunchBox Platform XML)
 * (NOTE: The property names are not necessarily the same as the XML node names,
 *  so this might not be completely convertible by making the first character lower/upper case)
 * ( http://pluginapi.launchbox-app.com/html/b33d2055-e2be-3f42-12c6-adbc5668f454.htm )
 */
export interface IRawLaunchBoxGame {
  ApplicationPath?: string; // (String)
  // BackgroundImagePath?: string; // (String)
  // BackImagePath?: string; // (String)
  Box3DImagePath?: string; // (String)
  Broken?: boolean; // (Boolean)
  // Cart3DImagePath?: string; // (String)
  // CartBackImagePath?: string; // (String)
  // CartFrontImagePath?: string; // (String)
  // ClearLogoImagePath?: string; // (String)
  // CloneOf?: string; // (String)
  CommandLine?: string; // (String)
  // CommunityOrLocalStarRating?: number; // (Float)
  CommunityStarRating?: number; // (Float)
  CommunityStarRatingTotalVotes?: number; // (Int32)
  Completed?: boolean; // (Boolean)
  ConfigurationCommandLine?: string; // (String)
  ConfigurationPath?: string; // (String)
  DateAdded?: Date; // (DateTime)
  DateModified?: Date; // (DateTime)
  // DetailsWithoutPlatform?: string; // (String)
  // DetailsWithPlatform?: string; // (String)
  Developer?: string; // (String)
  // Developers?: string[]; // (String[])
  // DosBoxConfigurationPath?: string; // (String)
  // EmulatorId?: string; // (String)
  Favorite?: boolean; // (Boolean)
  // FrontImagePath?: string; // (String)
  // Genres?: string[]; // (BlockingCollection<String>) (BlockingCollection is just a thread-safe array?)
  // GenresString?: string; // (String)
  Hide?: boolean; // (Boolean)
  ID?: string; // (String)
  // LastPlayedDate?: Date; // (Nullable<DateTime>)
  // LaunchBoxDbId?: number; // (Nullable<Int32>)
  ManualPath?: string; // (String)
  // MarqueeImagePath?: string; // (String)
  MusicPath?: string; // (String)
  Notes?: string; // (String)
  Platform?: string; // (String)
  // PlatformClearLogoImagePath?: string; // (String)
  PlayCount?: number; // (Int32)
  // PlayModes?: string[]; // (String[])
  Portable?: boolean; // (boolean)
  Publisher?: string; // (String)
  // Publishers?: string[]; // (String[])
  Rating?: string; // (String)
  // RatingImage?: Image; // (Image)
  Region?: string; // (String)
  // ReleaseDate?: Date; // (Nullable<DateTime>)
  // ReleaseYear?: number; // (Nullable<int>)
  RootFolder?: string; // (String)
  // ScreenshotImagePath?: string; // (String)
  // ScummVmAspectCorrection?: boolean; // (Boolean)
  // ScummVmFullscreen?: boolean; // (Boolean)
  // ScummVmGameDataFolderPath?: string; // (String)
  // ScummVmGameType?: string; // (String)
  Series?: string; // (String)
  // SeriesValues?: string[]; // (String[])
  // ShowBack?: boolean; // (Boolean)
  SortTitle?: string; // (String)
  // SortTitleOrTitle?: string; // (String)
  Source?: string; // (String)
  /** The star rating as an Integer value. Deprecated; please use StarRatingFloat instead. */
  StarRating?: number; // (Int32)
  /** The star rating as a Float value. Should be used instead of the original StarRating property. */
  StarRatingFloat?: number; // (Float)
  Status?: string; // (String)
  // ThemeVideoPath?: string; // (String)
  Title?: string; // (String)
  UseDosBox?: boolean; // (Boolean)
  // UseScummVm?: boolean; // (Boolean)
  Version?: string; // (String)
  VideoPath?: number; // (Nullable<int>)
  WikipediaURL?: string; // (String) (wikipediaUrl in the docs)
  // -- Found in the XML(s) but not in the docs -- //
  Emulator?: any;
  // SCUMM
  ScummVMAspectCorrection?: boolean;
  ScummVMFullscreen?: boolean;
  ScummVMGameDataFolderPath?: string;
  ScummVMGameType?: any;
  UseScummVM?: boolean;
  PlayMode?: string;
  Genre?: string;
  // Missing media
  MissingVideo?: boolean;
  MissingBoxFrontImage?: boolean;
  MissingScreenshotImage?: boolean;
  MissingClearLogoImage?: boolean;
  MissingBackgroundImage?: boolean;
}

/**
 * This interface represents an Additional Application that is associated with an IGame in LaunchBox/Big Box.
 * (Data from a single <AdditionalApplication> tag in a LaunchBox Platform XML)
 * (NOTE: The property names are not necessarily the same as the XML node names,
 *  so this might not be completely convertable by making the first character lower/upper case)
 * ( http://pluginapi.launchbox-app.com/html/866b513c-9bd8-0d1f-1568-45b3a3c24163.htm )
 */
export interface IRawLaunchBoxAdditionalApplication {
  /** The application path associated with this Additional Application. */
  ApplicationPath: string; // (String)
  /** A value specifying whether or not to automatically run this Additional Application after running the main game. */
  AutoRunAfter: boolean; // (Boolean)
  /** A value specifying whether or not to automatically run this Additional Application before running the main game. */
  AutoRunBefore: boolean; // (Boolean)
  /** The command line parameters used when launching this Additional Application. */
  CommandLine: string; // (String)
  /** A value specifying the Developer of the Additional Application. */
  Developer: string; // (String)
  // /** The command line parameters used when launching this Additional Application. */
  // disc: number; // (Nullable<int>) (Missing?)
  // /** A value specifying the ID of the emulator used for the Additional Application. Maps up directly to the emulator's Id property. */
  // emulatorId: string; // (String) (Missing?) (Not Nullable<*>?)
  /** The ID of the game that is associated with this Additional Application. Maps up directly to the game's Id property. */
  GameID: string; // (String)
  /** The ID of the Additional Application. This ID is automatically generated when a new Additional Application is created. */
  ID: string; // (String)
  // /** A value specifying the ID of the emulator used for the Additional Application. Maps up directly to the emulator's Id property. */
  // lastPlayed: DateTime; // (DateTime) (Missing?)
  /** The Name of this Additional Application. */
  Name: string; // (String)
  /** The number of times this Additional Application has been played. */
  PlayCount: number; // (Int32)
  /** A value specifying the Priority of this Additional Application. Priority is used for sorting additional applications. */
  Priority: number; // (Int32) (Optional or Missing?)
  // /** A value specifying the Publisher of the Additional Application. */
  // publisher: string; // (String) (Optional or Missing?)
  /** A value specifying the Region of the Additional Application. */
  Region: string; // (String)
  /** A value specifying the Release Date of the Additional Application. */
  // releaseDate: DateTime // (Nullable<DateTime>) (Optional or Missing?)
  /** A value specifying whether this Additional Application represents Side A or not. */
  SideA: boolean; // (Boolean)
  /** A value specifying whether this Additional Application represents Side B or not. */
  SideB: boolean; // (Boolean)
  /** A value specifying the Status of the Additional Application. */
  Status: boolean; // (String)
  /** A value specifying whether this Additional Application should use DOSBox or not when launching. */
  UseDosBox: boolean; // (Boolean)
  /** A value specifying whether this Additional Application should use an emulator or not when launching. */
  UseEmulator: boolean; // (Boolean)
  /** A value specifying the Version of the Additional Application. */
  Version: string; // (String)
  /** A value specifying whether this Additional Application should wait for exit before launching the game. */
  WaitForExit: boolean; // (Boolean)
}
