/** Data from a single <Game> tag in a LaunchBox Platform XML */
export interface ILaunchBoxGame {
  applicationPath?: string;
  commandLine?: string;
  completed?: boolean;
  configurationCommandLine?: any;
  configurationPath?: string;
  dateAdded?: Date;
  dateModified?: Date;
  developer?: string;
  emulator?: any;
  favorite?: boolean;
  id?: string;
  manualPath?: string;
  musicPath?: string;
  notes?: any;
  platform?: string;
  publisher?: string;
  rating?: any;
  rootFolder?: string;
  // SCUMM
  scummVMAspectCorrection?: boolean;
  ScummVMFullscreen?: boolean;
  ScummVMGameDataFolderPath?: string;
  ScummVMGameType?: any;
  // ...
  sortTitle?: any;
  source?: string;
  starRatingFloat?: number; // integer
  starRating?: number;
  communityStarRating?: number;
  communityStarRatingTotalVotes?: number;
  status?: string;
  wikipediaURL?: string;
  title?: string;
  useDosBox?: boolean;
  useScummVM?: boolean;
  version?: any;
  series?: any;
  playMode?: string;
  region?: any;
  playCount?: number; // integer
  portable?: boolean;
  videoPath?: string;
  hide?: boolean;
  broken?: boolean;
  genre?: string;
  // Missing media
  missingVideo?: boolean;
  missingBoxFrontImage?: boolean;
  missingScreenshotImage?: boolean;
  missingClearLogoImage?: boolean;
  missingBackgroundImage?: boolean;
}

/** Data from a single <AdditionalApplication> tag in a LaunchBox Platform XML */
export interface ILaunchBoxAdditionalApplication {
  id: string;
  playCount: number; // integer
  gameID: string;
  applicationPath: string;
  autoRunAfter: boolean;
  autoRunBefore: boolean;
  commandLine: string;
  name: string;
  useDosBox: boolean;
  useEmulator: boolean;
  waitForExit: boolean;
  developer: any;
  region: any;
  version: any;
  status: any;
  sideA: boolean;
  sideB: boolean;
  priority: number;
}

/** Root object in a LaunchBox Platform XML */
export interface ILaunchBoxPlatform {
  games: ILaunchBoxGame[];
  additionalApplications: ILaunchBoxAdditionalApplication[];
}
