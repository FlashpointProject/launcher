import { IDataFactory } from '@tests/util/types';
import { syncRunManyFactory } from '@tests/util/util';
import uuid = require('uuid');
import { AppDataSource } from '@back/index';
import { Playlist } from '@database/entity/Playlist';
import { GameFactory } from '@tests/util/factories/game';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import * as crypto from 'crypto';

export type PlaylistImportFactoryOptions = {
  gameCount?: number,
  data?: Partial<Playlist>,
}

export class PlaylistImportFactory implements IDataFactory<PlaylistImportFactoryOptions, {}, Playlist> {
  async run(options?: PlaylistImportFactoryOptions) {
    const gameFactory = new GameFactory();
    const playlist = createTestPlaylist(options?.data);
    await AppDataSource.getRepository(Playlist).save(playlist);
    if (options?.gameCount) {
      const games = [];
      for (let i = 0; i < options.gameCount; i++) {
        games.push(await gameFactory.run());
      }
      playlist.games = [];
      for (let i = 0; i < games.length; i++) {
        playlist.games.push(await AppDataSource.getRepository(PlaylistGame).save(createTestPlaylistGame(playlist.id, games[i].id, i)));
      }
    }
    return playlist;
  }
  public runMany = syncRunManyFactory(this.run);
}

export function createTestPlaylist(data?: Partial<Playlist>): Playlist {
  const id = uuid.v4();
  const playlist = new Playlist();
  Object.assign(playlist, {
    id: id,
    title: crypto.randomBytes(32).toString('hex'),
    description: '',
    author: '',
    library: 'arcade',
    ...data
  });
  return playlist;
}

export function createTestPlaylistGame(playlistId: string, gameId: string, order: number): PlaylistGame {
  const playlistGame = new PlaylistGame();
  Object.assign(playlistGame, {
    playlistId,
    order,
    notes: '',
    gameId
  });
  return playlistGame;
}
