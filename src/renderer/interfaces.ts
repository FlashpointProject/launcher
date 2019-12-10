import { ViewGame } from '../shared/back/types';
import { UpgradeData } from './upgrade/types';

export type GAMES = Record<number, ViewGame | undefined>;
export type SUGGESTIONS = Partial<any>;

/**
 * An object created and managed by the "root" component (App) and is passed down deep into many different components.
 * This is sort of a hacky and temporary solution. It should be phased out.
 */
export type CentralState = {
  /** Data and state used for the upgrade system (optional install-able downloads from the HomePage). */
  upgrade: UpgradeState;
};

/** Data and state used for the upgrade system. */
export type UpgradeState = {
  /** Data from the upgrade file (or the defaults if it failed to load or parse). */
  data?: UpgradeData;
  /** State of the tech stage. */
  techState: UpgradeStageState;
  /** State of the screenshots stage. */
  screenshotsState: UpgradeStageState;
  /** If the upgrade JSON is done loading (even if it was unsuccessful). */
  doneLoading: boolean;
};

/** State of a single "stage" in the upgrade system (each individual downloadable upgrade is called a "stage"). */
export type UpgradeStageState = {
  /** If the stage was already installed when the launcher started up (this value is only meaningful if the stage checks are done). */
  alreadyInstalled: boolean;
  /** If the checks has been performed (this is to check if the stage has already been installed). */
  checksDone: boolean;
  /** If the stage is currently being downloaded or installed. */
  isInstalling: boolean;
  /** If the stage was installed during this session (this is so the user can be told to restart the application). */
  isInstallationComplete: boolean;
  /** Current progress note of the installation (visible text meant to inform the user about the current progress of the download or install). */
  installProgressNote: string;
};
