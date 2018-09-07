export interface IAppConfigData {
  /** Path to the FlashPoint root folder (relative or absolute) */
  flashpointPath: string;
  /** If the custom title bar should be used in MainWindow */
  useCustomTitlebar: boolean;
  /** If the Router should be started, and closed, together with this application */
  startRouter: boolean;
  /** If the Redirector should be started, and closed, together with this application */
  startRedirector: boolean;
  /** If Fiddler should be used instead of the Redirector (Windows only) */
  useFiddler: boolean;
}
