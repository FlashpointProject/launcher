import { ILaunchBoxPlatform } from "./interfaces";
import { LaunchBoxGame } from "./LaunchBoxGame";

export class LaunchBoxPlatform {
  /**
   * Parse a LaunchBox Platform XML Document
   * @param xml LaunchBox Platform XML Document
   */
  public static parse(xml: Document): ILaunchBoxPlatform {
    const launchBox: ILaunchBoxPlatform = {
      games: [],
      additionalApplications: [],
    }
    // Parse Games
    const games = xml.getElementsByTagName('Game');
    for (let i = 0; i < games.length; i++) {
      launchBox.games.push(LaunchBoxGame.parse(games[i]));
    }
    // Parse Additional Applications
    // @TODO Parse the additional applications!!!
    // Return
    return launchBox;
  }
}
