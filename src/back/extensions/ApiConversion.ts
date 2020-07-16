import * as flashpoint from 'flashpoint';
import { Game } from '@database/entity/Game';

export namespace ApiConversion {
  export function getApiGame(game: Game): flashpoint.Game {
    return {
      id: game.id,
      parentGameId: game.parentGame ? game.parentGame.id : game.parentGameId,
      title: game.title,
      alternateTitles: game.alternateTitles,
      series: game.series,
      developer: game.developer,
      publisher: game.publisher,
      dateAdded: game.dateAdded,
      dateModified: game.dateModified,
      platform: game.platform,
      broken: game.broken,
      extreme: game.extreme,
      playMode: game.playMode,
      status: game.status,
      notes: game.notes,
      tags: game.tags.map(t => t.primaryAlias.name),
      source: game.source,
      applicationPath: game.applicationPath,
      launchCommand: game.launchCommand,
      releaseDate: game.releaseDate,
      version: game.version,
      originalDescription: game.originalDescription,
      language: game.language,
      library: game.library
    };
  }
}
