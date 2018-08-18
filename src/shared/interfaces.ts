import { ILaunchBoxGame } from "./launchbox/interfaces";

export interface IMainWindowExternal {
  /**
   * Launch a LaunchBox Game (using its settings)
   * (WARNING: This will run an arbitrary program file with arbitrary arguments)
   * @param game 
   */
  launchGame(game: ILaunchBoxGame): void;
  
  // -- Window functions --
  
  /** Minimize the window */
  minimize(): void;

  /** Maximize the window (or un-maximize if already maximized) */
  maximize(): void;

  /** Close the window */
  close(): void;
}
