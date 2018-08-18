import { ILaunchBoxGame } from "./launchbox/interfaces";
import { IAppConfigData } from "./config/IAppConfigData";

export interface IMainWindowExternal {
  /**
   * Launch a LaunchBox Game (using its settings)
   * (WARNING: This will run an arbitrary program file with arbitrary arguments)
   * @param game 
   */
  launchGameSync(game: ILaunchBoxGame): void;

  /** Get the config object (async) */
  getConfig(callback: (config: IAppConfigData) => void): void;

  /** Get the config object (sync) */
  getConfigSync(): IAppConfigData;
  
  // -- Window functions --
  
  /** Minimize the window */
  minimize(): void;

  /** Maximize the window (or un-maximize if already maximized) */
  maximize(): void;

  /** Close the window */
  close(): void;
}
