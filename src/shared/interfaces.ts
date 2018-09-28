import { AppPreferencesApi } from './preferences/AppPreferencesApi';
import { AppConfigApi } from './config/AppConfigApi';

export interface IMainWindowExternal {
  /** Append a string to the end of the log */
  appendLogData(data: string): void;

  /** Ask the main to resend the log-data-update event */
  resendLogDataUpdate(): void;

  /** Get the OS name */
  platform: NodeJS.Platform;

  /** Minimize the window */
  minimize(): void;

  /** Maximize the window (or un-maximize if already maximized) */
  maximize(): void;

  /** Close the window */
  close(): void;

  /** Restart the application (closes all windows) */
  restart(): void;

  /** Wrapper of Electron.dialog.showOpenDialog() */
  showOpenDialog(options: Electron.OpenDialogOptions, callback?: ElectronOpenDialogCallback): string[]|undefined;

  /** Open/Close the DevTools for this window */
  toggleDevtools(): void;

  /** Renderer's interface for the Preferences data */
  preferences: AppPreferencesApi;

  /** Renderer's interface for the Config data */
  config: AppConfigApi;
}

/** Callback for Electron.dialog.showOpenDialog */
export type ElectronOpenDialogCallback = (filePaths?: string[], bookmarks?: string[]) => void;
