import { Game } from '../../database/entity/Game';

export namespace ModelUtils {
  export function createGame(): Game {
    const game = new Game();
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
      children: [],
      placeholder: false,
      activeDataOnDisk: false
    });
    return game;
  }
}
