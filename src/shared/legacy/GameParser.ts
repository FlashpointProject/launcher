import { Legacy_IAdditionalApplicationInfo, Legacy_IGameCollection, Legacy_IGameInfo, Legacy_IRawPlatformFile, Legacy_IRawGameInfo, Legacy_IRawAdditionalApplicationInfo } from './interfaces';

export class Legacy_GameParser {
  public static parse(data: Legacy_IRawPlatformFile, filename: string): Legacy_IGameCollection {
    const collection: Legacy_IGameCollection = {
      games: [],
      additionalApplications: [],
    };
    let games = data.LaunchBox.Game;
    if (games) {
      if (!Array.isArray(games)) { games = [ games ]; }
      for (let i = games.length - 1; i >= 0; i--) {
        collection.games[i] = Legacy_GameParser.parseRawGame(games[i], filename);
      }
    }
    let apps = data.LaunchBox.AdditionalApplication;
    if (apps) {
      if (!Array.isArray(apps)) { apps = [ apps ]; }
      for (let i = apps.length - 1; i >= 0; i--) {
        collection.additionalApplications[i] = Legacy_GameParser.parseRawAdditionalApplication(apps[i]);
      }
    }
    return collection;
  }


  public static parseRawGame(data: Partial<Legacy_IRawGameInfo>, library: string): Legacy_IGameInfo {
    const title: string = Legacy_unescapeHTML(data.Title);
    return {
      id: Legacy_unescapeHTML(data.ID),
      title: title,
      alternateTitles: Legacy_unescapeHTML(data.AlternateTitles),
      series: Legacy_unescapeHTML(data.Series),
      developer: Legacy_unescapeHTML(data.Developer),
      publisher: Legacy_unescapeHTML(data.Publisher),
      platform: Legacy_unescapeHTML(data.Platform),
      dateAdded: Legacy_unescapeHTML(data.DateAdded),
      broken: !!data.Broken,
      extreme: !!data.Hide,
      playMode: Legacy_unescapeHTML(data.PlayMode),
      status: Legacy_unescapeHTML(data.Status),
      notes: Legacy_unescapeHTML(data.Notes),
      tags: Legacy_unescapeHTML(data.Genre),
      source: Legacy_unescapeHTML(data.Source),
      applicationPath: Legacy_unescapeHTML(data.ApplicationPath),
      launchCommand: Legacy_unescapeHTML(data.CommandLine),
      releaseDate: Legacy_unescapeHTML(data.ReleaseDate),
      version: Legacy_unescapeHTML(data.Version),
      originalDescription: Legacy_unescapeHTML(data.OriginalDescription),
      language: Legacy_unescapeHTML(data.Language),
      library: library,
      orderTitle: title.toLowerCase(),
      placeholder: false, // (No loaded game is a placeholder)
    };
  }

  private static parseRawAdditionalApplication(data: Legacy_IRawAdditionalApplicationInfo): Legacy_IAdditionalApplicationInfo {
    return {
      id: Legacy_unescapeHTML(data.Id),
      gameId: Legacy_unescapeHTML(data.GameID),
      applicationPath: Legacy_unescapeHTML(data.ApplicationPath),
      autoRunBefore: !!data.AutoRunBefore,
      launchCommand: Legacy_unescapeHTML(data.CommandLine),
      name: Legacy_unescapeHTML(data.Name),
      waitForExit: !!data.WaitForExit,
    };
  }

  public static reverseParseGame(game: Legacy_IGameInfo): Legacy_IRawGameInfo {
    return {
      ID: escapeHTML(game.id),
      Title: escapeHTML(game.title),
      AlternateTitles: escapeHTML(game.alternateTitles),
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
      Genre: escapeHTML(game.tags),
      Source: escapeHTML(game.source),
      ApplicationPath: escapeHTML(game.applicationPath),
      CommandLine: escapeHTML(game.launchCommand),
      ReleaseDate: escapeHTML(game.releaseDate),
      Version: escapeHTML(game.version),
      OriginalDescription: escapeHTML(game.originalDescription),
      Language: escapeHTML(game.language),
    };
  }

  public static reverseParseAdditionalApplication(addapp: Legacy_IAdditionalApplicationInfo): Legacy_IRawAdditionalApplicationInfo {
    return {
      Id: escapeHTML(addapp.id),
      GameID: escapeHTML(addapp.gameId),
      ApplicationPath: escapeHTML(addapp.applicationPath),
      AutoRunBefore: !!addapp.autoRunBefore,
      CommandLine: escapeHTML(addapp.launchCommand),
      Name: escapeHTML(addapp.name),
      WaitForExit: !!addapp.waitForExit,
    };
  }

  public static readonly emptyRawAdditionalApplication: Legacy_IRawAdditionalApplicationInfo = {
    Id: '',
    GameID: '',
    ApplicationPath: '',
    AutoRunBefore: false,
    CommandLine: '',
    Name: '',
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

// Escape / Unescape some HTML characters
// ( From: https://stackoverflow.com/questions/18749591/encode-html-entities-in-javascript/39243641#39243641 )
// spell-checker: disable
export const Legacy_unescapeHTML = (function() {
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
    return ((str||'')+'').replace(/&([^;]+);/g, function (entity: string, entityCode: string): string {
      let match;
      if (entityCode in htmlEntities) {
        return htmlEntities[entityCode];
      } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) { // eslint-disable-line no-cond-assign
        return String.fromCharCode(parseInt(match[1], 16));
      } else if (match = entityCode.match(/^#(\d+)$/)) { // eslint-disable-line no-cond-assign
        return String.fromCharCode(~~match[1]);
      } else {
        return entity;
      }
    });
  };
}());
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
  for (let key in escapeChars) {
    regexString += key;
  }
  regexString += ']';
  const regex = new RegExp(regexString, 'g');
  return function escapeHTML(str: string): string {
    return str.replace(regex, function(m) {
      return '&' + (escapeChars as any)[m] + ';';
    });
  };
}());
