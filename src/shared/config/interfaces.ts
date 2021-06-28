/** Data contained in the Config file */
export type AppConfigData = {
  /** Path to the FlashPoint root folder (relative or absolute) */
  flashpointPath: string;
  /** If the custom title bar should be used in MainWindow */
  useCustomTitlebar: boolean;
  /**
   * If the Server should be started, and closed, together with this application.
   * The "server" is defined in "services.json".
   */
  startServer: boolean;
  // Name of the Server process to run
  server: string;
  /** Lower limit of the range of ports that the back should listen on. */
  backPortMin: number;
  /** Upper limit of the range of ports that the back should listen on. */
  backPortMax: number;
  /** Lower limit of the range of ports that the back image server should listen on. */
  imagesPortMin: number;
  /** Upper limit of the range of ports that the back image server should listen on. */
  imagesPortMax: number;
  /** Base URL of the server to do pastes of the Logs to. */
  logsBaseUrl: string;
  /** Whether to notify that launcher updates are available */
  updatesEnabled: boolean;
};

export type AppExtConfigData = {
  [key: string]: any;
}
