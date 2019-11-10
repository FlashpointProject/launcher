import GameManager from './game/GameManager';
import { GamePlaylistManager } from './playlist/GamePlaylistManager';
import { UpgradeStage } from './upgrade/types';

/**
 * An object created and managed by the "root" component (App) and is passed down deep into many different components.
 * This is sort of a hacky and temporary solution. It should be phased out.
 */
export type CentralState = {
  /** Manager of all the games, and container of the loaded and parsed game data. */
  games: GameManager;
  /** Manager of all playlists. */
  playlists: GamePlaylistManager;
  /** Data and state used for the upgrade system (optional install-able downloads from the HomePage). */
  upgrades: UpgradeStage[];
  /** If upgrades files have loaded */
  upgradesDoneLoading: boolean;
  /** If all the games are done loading (even if it was unsuccessful). */
  gamesDoneLoading: boolean;
  /** If the games failed to load (this value is only meaningful after the games are done loading). */
  gamesFailedLoading: boolean;
  /** If all the playlists are done loading (even if it was unsuccessful). */
  playlistsDoneLoading: boolean;
  /** If the playlists failed to load (this value is only meaningful after the playlists are done loading). */
  playlistsFailedLoading: boolean;
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
