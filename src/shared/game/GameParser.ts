import { IRawLaunchBoxGame, IRawLaunchBoxPlatformRoot } from "../launchbox/interfaces";
import { IGameCollection, IGameInfo, GameInfoStatus } from "./interfaces";

export class GameParser {
  public static parse(data: IRawLaunchBoxPlatformRoot): IGameCollection {
    const collection: IGameCollection = {
      games: []
    };
    if (data.LaunchBox) {
      const games = data.LaunchBox.Game;
      if (Array.isArray(games)) {
        for (let i = games.length-1; i >= 0; i--) {
          collection.games[i] = GameParser.parseGame(games[i]);
        }
      }
      const apps = data.LaunchBox.AdditionalApplication;
      if (Array.isArray(apps)) {
        // @TODO
      }
    }
    return collection;
  }

  private static parseGame(data: IRawLaunchBoxGame): IGameInfo {
    return {
      id: data.ID + '',
      title: GameParser.decodeString(data.Title + ''),
      series: data.Series + '',
      developer: data.Developer + '',
      platform: data.Platform + '',
      broken: !!data.Broken,
      extreme: !!data.Hide,
      playMode: data.PlayMode + '',
      status: data.Status + '',
      notes: data.Notes + '',
      genre: data.Genre + '',
      source: data.Source + '',
      applicationPath: GameParser.parseApplicationPath(data.ApplicationPath + ''),
      launchCommand: data.CommandLine + '',
    };
  }

  /**
   * Replace the application path with the platform specific version is
   * required.
   * 
   * The value provided in Flash.xml is only accurate in windows.
   * We hardcode the value in linux.
   *
   * Note that this assumes that `flash_player_sa_linux.x86_64.tar.gz` has been
   * extracted using:
   *   $ cd Arcade/Games
   *   $ tar xf flash_player_sa_linux.x86_64.tar.gz flashplayer
   *
   * @param value The value of the ApplicationPath XML node.
   */
  private static parseApplicationPath(value: string): string {
    switch (window.External.platform) {
      case 'win32':
        return value;
      case 'linux':
        // TODO(nloomans): Automatically extract the flash_player tarball.
        return 'Games/flashplayer';
      default:
        // TODO: Figure out the required path for other platforms.
        return value;
    }
  }

  private static decodeString(str: string): string {
    return str.replace(/&amp;/g, '&');
  }
}
