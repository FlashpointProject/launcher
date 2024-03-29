import { newGame } from '@shared/utils/misc';
import { AdditionalApp, Game } from 'flashpoint-launcher';

export namespace ModelUtils {
  export function createGame(): Game {
    const game = newGame();
    Object.assign(game, {
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
      tagsStr: '',
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
      placeholder: false,
      activeDataOnDisk: false
    });
    return game;
  }

  export function createAddApp(game: Game): AdditionalApp {
    return {
      id: '',
      parentGameId: game.id,
      applicationPath: '',
      autoRunBefore: false,
      launchCommand: '',
      name: '',
      waitForExit: false,
    };
  }
}
