import { AdditionalApp } from '../../database/entity/AdditionalApp';
import { Game } from '../../database/entity/Game';

export namespace ModelUtils {
  export function createGame(): Game {
    return {
      id: '',
      title: '',
      alternateTitles: '',
      series: '',
      developer: '',
      publisher: '',
      platform: '',
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      broken: false,
      extreme: false,
      playMode: '',
      status: '',
      notes: '',
      tags: [],
      source: '',
      applicationPath: '',
      launchCommand: '',
      releaseDate: '',
      version: '',
      originalDescription: '',
      language: '',
      library: '',
      orderTitle: '',
      addApps: [],
      placeholder: false
    };
  }

  export function createAddApp(game: Game): AdditionalApp {
    return {
      id: '',
      parentGame: game,
      applicationPath: '',
      autoRunBefore: false,
      launchCommand: '',
      name: '',
      waitForExit: false,
    };
  }
}