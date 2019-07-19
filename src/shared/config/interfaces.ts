/** Data contained in the Config file */
export interface IAppConfigData {
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
  /** Path to the theme folder (relative to the flashpoint path) */
  themeFolderPath: string;
  /** If the custom title bar should be used in MainWindow */
  useCustomTitlebar: boolean;
  /** If the Router should be started, and closed, together with this application */
  startRouter: boolean;
  /** If the Redirector should be started, and closed, together with this application */
  startRedirector: boolean;
  /** If Fiddler should be used instead of the Redirector (Windows only) */
  useFiddler: boolean;
  /** If games flagged as "extreme" should be hidden (mainly for parental control) */
  disableExtremeGames: boolean;
  /** If games flagged as "broken" should be hidden */
  showBrokenGames: boolean;
}

/** Data fetched from the Main by the Renderer */
export interface IAppConfigApiFetchData {
  /** Raw config data from the config file */
  data: IAppConfigData;
  /** Full path to the flashpoint folder */
  fullFlashpointPath: string;
  /** Launcher installed (Read only directory) */
  installed: boolean;
}
