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
  /** Path of the meta edits folder (relative to the flashpoint path) */
  metaEditsFolderPath: string;
  /** If the custom title bar should be used in MainWindow */
  useCustomTitlebar: boolean;
  /**
   * If the Server should be started, and closed, together with this application.
   * The "server" is defined in "services.json".
   */
  startServer: boolean;
  // Name of the Server process to run
  server: string;
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
  /** Metadata Server Host (For Online Sync) */
  metadataServerHost: string;
  /** Last time the Metadata Server Host was synced with */
  lastSync: number;
  /** Base URL of the server to download missing thumbnails/screenshots from. */
  onDemandBaseUrl: string;
  /** Base URL of the server to do pastes of the Logs to. */
  logsBaseUrl: string;
  /** Whether to notify that launcher updates are available */
  updatesEnabled: boolean;
};
