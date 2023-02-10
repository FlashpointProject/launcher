import { Game } from '@database/entity/Game';
import { IDataFactory } from '@tests/util/types';
import { syncRunManyFactory } from '@tests/util/util';
import * as crypto from 'crypto';
import uuid = require('uuid');
import { AppDataSource } from '@back/index';

export class GameImportFactory implements IDataFactory<{}, {}> {
  async run() {
    console.log(await AppDataSource.showMigrations());
    await AppDataSource.getRepository(Game).save(createTestGame());
    return undefined;
  }
  public runMany = syncRunManyFactory(this.run);
}

export class GameFactory implements IDataFactory<{}, {}, Game> {
  async run() {
    return createTestGame();
  }
  public runMany = syncRunManyFactory(this.run);
}

export function createTestGame(data?: Partial<Game>): Game {
  const id = uuid.v4();
  const game = new Game();
  Object.assign(game, {
    id: id,
    parentGameId: id,
    title: crypto.randomBytes(32).toString('hex'),
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
    placeholder: false,
    activeDataOnDisk: false,
    ...data
  });
  return game;
}
