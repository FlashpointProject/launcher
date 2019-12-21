/** Data contained in the Config file */
export type IAppConfigData = {
  /** Path to the FlashPoint root folder (relative or absolute) */
  flashpointPath: string;
  /** Path to the image folder (relative to the flashpoint path) */
  imageFolderPath: string;
  /** Path to the logo folder (relative to the flashpoint path) */
  logoFolderPath: string;
  /** Path to the playlist folder (relative to the flashpoint path) */
  playlistFolderPath: string;
  /** Path to the json folder (relative to the flashpoint path) */
  jsonFolderPath: string;
  /** Path to the platform folder (relative to the flashpoint path) */
  platformFolderPath: string;
  /** Path to the theme folder (relative to the flashpoint path) */
  themeFolderPath: string;
  /** If the custom title bar should be used in MainWindow */
  useCustomTitlebar: boolean;
  /**
   * If the Server should be started, and closed, together with this application.
   * The "server" is defined in "services.json".
   */
  startServer: boolean;
  /**
   * If the Redirector should be started, and closed, together with this application.
   * The "redirector" (and "fiddler") is defined in "services.json".
   */
  startRedirector: boolean;
  /** If Fiddler should be used instead of the Redirector (Windows only) */
  useFiddler: boolean;
  /** If games flagged as "extreme" should be hidden (mainly for parental control) */
  disableExtremeGames: boolean;
  /** If games flagged as "broken" should be hidden */
  showBrokenGames: boolean;
  /** Array of native locked platforms */
  nativePlatforms: string[];
  /** Lower limit of the range of ports that the back should listen on. */
  backPortMin: number;
  /** Upper limit of the range of ports that the back should listen on. */
  backPortMax: number;
  /** Lower limit of the range of ports that the back image server should listen on. */
  imagesPortMin: number;
  /** Upper limit of the range of ports that the back image server should listen on. */
  imagesPortMax: number;
};
