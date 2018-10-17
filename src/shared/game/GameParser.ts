import { IRawLaunchBoxGame, IRawLaunchBoxPlatformRoot, IRawLaunchBoxAdditionalApplication } from '../launchbox/interfaces';
import { IGameCollection, IGameInfo, IAdditionalApplicationInfo } from './interfaces';

export class GameParser {
  public static parse(data: IRawLaunchBoxPlatformRoot): IGameCollection {
    const collection: IGameCollection = {
      games: [],
      additionalApplications: [],
    };
    if (data.LaunchBox) {
      let games = data.LaunchBox.Game;
      if (games) {
        if (!Array.isArray(games)) { games = [ games ]; }
        for (let i = games.length - 1; i >= 0; i--) {
          collection.games[i] = GameParser.parseGame(games[i]);
        }
      }
      let apps = data.LaunchBox.AdditionalApplication;
      if (apps) {
        if (!Array.isArray(apps)) { apps = [ apps ]; }
        for (let i = apps.length - 1; i >= 0; i--) {
          collection.additionalApplications[i] = GameParser.parseAdditionalApplication(apps[i]);
        }
      }
    }
    return collection;
  }

  private static parseGame(data: IRawLaunchBoxGame): IGameInfo {
    const title: string = unescapeHTML(data.Title);
    return {
      id: unescapeHTML(data.ID),
      title: title,
      series: unescapeHTML(data.Series),
      developer: unescapeHTML(data.Developer),
      publisher: unescapeHTML(data.Publisher),
      platform: unescapeHTML(data.Platform),
      dateAdded: Date.parse(unescapeHTML(data.DateAdded)),
      broken: !!data.Broken,
      extreme: !!data.Hide,
      playMode: unescapeHTML(data.PlayMode),
      status: unescapeHTML(data.Status),
      notes: unescapeHTML(data.Notes),
      genre: unescapeHTML(data.Genre),
      source: unescapeHTML(data.Source),
      applicationPath: unescapeHTML(data.ApplicationPath),
      launchCommand: unescapeHTML(data.CommandLine),
      orderTitle: generateOrderTitle(title),
    };
  }

  private static parseAdditionalApplication(data: IRawLaunchBoxAdditionalApplication): IAdditionalApplicationInfo {
    return {
      id: unescapeHTML(data.Id),
      gameId: unescapeHTML(data.GameID),
      applicationPath: unescapeHTML(data.ApplicationPath),
      autoRunBefore: !!data.AutoRunBefore,
      commandLine: unescapeHTML(data.CommandLine),
      name: unescapeHTML(data.Name),
      waitForExit: !!data.WaitForExit,
    };
  }
}

/** Generate a title suitable for ordering (only used for ordering and sorting, not visual) */
function generateOrderTitle(title: string): string {
  return title.toLowerCase();
}

// Unescape some HTML characters
// ( From: https://stackoverflow.com/questions/18749591/encode-html-entities-in-javascript/39243641#39243641 )
// spell-checker: disable
const htmlEntities: any = Object.freeze({
  nbsp: ' ',
  cent: '¢',
  pound: '£',
  yen: '¥',
  euro: '€',
  copy: '©',
  reg: '®',
  lt: '<',
  gt: '>',
  quot: '"',
  amp: '&',
  apos: '\''
});
function unescapeHTML(str?: string): string {
  return (str+'').replace(/\&([^;]+);/g, function (entity: string, entityCode: string): string {
    let match;
    if (entityCode in htmlEntities) {
      return htmlEntities[entityCode];
    } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
      return String.fromCharCode(parseInt(match[1], 16));
    } else if (match = entityCode.match(/^#(\d+)$/)) {
      return String.fromCharCode(~~match[1]);
    } else {
      return entity;
    }
  });
};
