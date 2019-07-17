import { IRawLaunchBoxAdditionalApplication, IRawLaunchBoxGame, IRawLaunchBoxPlatformRoot } from '../launchbox/interfaces';
import { IAdditionalApplicationInfo, IGameCollection, IGameInfo } from './interfaces';

export class GameParser {
  public static parse(data: IRawLaunchBoxPlatformRoot, filename: string): IGameCollection {
    const collection: IGameCollection = {
      games: [],
      additionalApplications: [],
    };
    let games = data.LaunchBox.Game;
    if (games) {
      if (!Array.isArray(games)) { games = [ games ]; }
      for (let i = games.length - 1; i >= 0; i--) {
        collection.games[i] = GameParser.parseGame(games[i], filename);
      }
    }
    let apps = data.LaunchBox.AdditionalApplication;
    if (apps) {
      if (!Array.isArray(apps)) { apps = [ apps ]; }
      for (let i = apps.length - 1; i >= 0; i--) {
        collection.additionalApplications[i] = GameParser.parseAdditionalApplication(apps[i]);
      }
    }
    return collection;
  }

  public static parseGame(data: Partial<IRawLaunchBoxGame>, filename: string): IGameInfo {
    const title: string = unescapeHTML(data.Title);
    return {
      id: unescapeHTML(data.ID),
      title: title,
      series: unescapeHTML(data.Series),
      developer: unescapeHTML(data.Developer),
      publisher: unescapeHTML(data.Publisher),
      platform: unescapeHTML(data.Platform),
      dateAdded: unescapeHTML(data.DateAdded),
      broken: !!data.Broken,
      extreme: !!data.Hide,
      playMode: unescapeHTML(data.PlayMode),
      status: unescapeHTML(data.Status),
      notes: unescapeHTML(data.Notes),
      genre: unescapeHTML(data.Genre),
      source: unescapeHTML(data.Source),
      applicationPath: unescapeHTML(data.ApplicationPath),
      launchCommand: unescapeHTML(data.CommandLine),
      releaseDate: unescapeHTML(data.ReleaseDate),
      version: unescapeHTML(data.Version),
      originalDescription: unescapeHTML(data.OriginalDescription),
      language: unescapeHTML(data.Language),
      filename: filename,
      orderTitle: generateGameOrderTitle(title),
      placeholder: false, // (No loaded game is a placeholder)
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

  public static reverseParseGame(game: IGameInfo): IRawLaunchBoxGame {
    return {
      ID: escapeHTML(game.id),
      Title: escapeHTML(game.title),
      Series: escapeHTML(game.series),
      Developer: escapeHTML(game.developer),
      Publisher: escapeHTML(game.publisher),
      Platform: escapeHTML(game.platform),
      DateAdded: escapeHTML(game.dateAdded),
      Broken: !!game.broken,
      Hide: !!game.extreme,
      PlayMode: escapeHTML(game.playMode),
      Status: escapeHTML(game.status),
      Notes: escapeHTML(game.notes),
      Genre: escapeHTML(game.genre),
      Source: escapeHTML(game.source),
      ApplicationPath: escapeHTML(game.applicationPath),
      CommandLine: escapeHTML(game.launchCommand),
      ReleaseDate: unescapeHTML(game.releaseDate),
      Version: unescapeHTML(game.version),
      OriginalDescription: unescapeHTML(game.originalDescription),
      Language: unescapeHTML(game.language),
    };
  }

  public static reverseParseAdditionalApplication(addapp: IAdditionalApplicationInfo): Partial<IRawLaunchBoxAdditionalApplication> {
    return {
      Id: escapeHTML(addapp.id),
      GameID: escapeHTML(addapp.gameId),
      ApplicationPath: escapeHTML(addapp.applicationPath),
      AutoRunBefore: !!addapp.autoRunBefore,
      CommandLine: escapeHTML(addapp.commandLine),
      Name: escapeHTML(addapp.name),
      WaitForExit: !!addapp.waitForExit,
    };
  }

  public static readonly emptyRawAdditionalApplication: IRawLaunchBoxAdditionalApplication = {
    ApplicationPath: '',
    AutoRunAfter: false,
    AutoRunBefore: false,
    CommandLine: '',
    Developer: '',
    GameID: '',
    Id: '',
    Name: '',
    PlayCount: 0,
    Priority: 0,
    Region: '',
    SideA: false,
    SideB: false,
    Status: false,
    UseDosBox: false,
    UseEmulator: false,
    Version: '',
    WaitForExit: false,
  };

  /**
   * Split a field value from a game into an array.
   * Some field values store multiple values, each value separated by a semicolon.
   * @param value Value to split.
   */
  public static splitFieldValue(value: string): string[] {
    return value.split(/\s?;\s?/);
  }

  /**
   * Join multiple values into a single field value.
   * Some field values store multiple values, each value separated by a semicolon.
   * @param value Value to join.
   */
  public static joinFieldValue(value: string[]): string {
    return value.join('; ');
  }
}

/** Generate a title suitable for ordering (only used for ordering and sorting, not visual) */
export function generateGameOrderTitle(title: string): string {
  return title.toLowerCase();
}

// Escape / Unescape some HTML characters
// ( From: https://stackoverflow.com/questions/18749591/encode-html-entities-in-javascript/39243641#39243641 )
// spell-checker: disable
const unescapeHTML = (function() {
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
  return function(str?: string): string {
    return ((str||'')+'').replace(/\&([^;]+);/g, function (entity: string, entityCode: string): string {
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
})();
const escapeHTML = (function() {
  const escapeChars = {
    '¢' : 'cent',
    '£' : 'pound',
    '¥' : 'yen',
    '€': 'euro',
    '©' :'copy',
    '®' : 'reg',
    '<' : 'lt',
    '>' : 'gt',
    '"' : 'quot',
    '&' : 'amp',
    '\'' : '#39'
  };
  let regexString = '[';
  for(let key in escapeChars) {
    regexString += key;
  }
  regexString += ']';
  const regex = new RegExp( regexString, 'g');
  return function escapeHTML(str: string): string {
    return str.replace(regex, function(m) {
      return '&' + (escapeChars as any)[m] + ';';
    });
  };
})();
