import { IRawLaunchBoxGame, IRawLaunchBoxPlatformRoot } from '../launchbox/interfaces';
import { IGameCollection, IGameInfo } from './interfaces';

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
      series: GameParser.decodeString(data.Series + ''),
      developer: GameParser.decodeString(data.Developer + ''),
      platform: GameParser.decodeString(data.Platform + ''),
      broken: !!data.Broken,
      extreme: !!data.Hide,
      playMode: GameParser.decodeString(data.PlayMode + ''),
      status: GameParser.decodeString(data.Status + ''),
      notes: GameParser.decodeString(data.Notes + ''),
      genre: GameParser.decodeString(data.Genre + ''),
      source: GameParser.decodeString(data.Source + ''),
      applicationPath: GameParser.decodeString(data.ApplicationPath + ''),
      launchCommand: GameParser.decodeString(data.CommandLine + ''),
    };
  }

  private static decodeString(str: string): string {
    return str.replace(/&amp;/g, '&');
  }
}
