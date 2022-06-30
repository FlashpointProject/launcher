import { DbHelper } from './DbHelper';
import * as GameManager from '@back/game/GameManager';
import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { getManager } from 'typeorm';

describe('Games', () => {
  beforeAll(async () => {
    await DbHelper.instance.setupTestDB();
  });

  afterAll(() => {
    DbHelper.instance.teardownTestDB();
  });

  it('save game' , async () => {
    const game = createPlaceholderGame({
      id: '12345',
      title: 'Test Game'
    });
    const savedGame = await GameManager.save(game);
    expect(savedGame.id).toEqual(game.id);
  });

  it('find game', async() => {
    const game = await GameManager.findGame('12345');
    expect(game).toBeTruthy();
    if (game) {
      expect(game.title).toEqual('Test Game');
    }
  });

  it('count games', async () => {
    const count = await GameManager.countGames();
    expect(count).toEqual(1);
  });
});

describe('Playlists',  () => {
  const testGame = createPlaceholderGame({
    id: '12345',
    title: 'Test Game'
  });

  beforeAll(async () => {
    await DbHelper.instance.setupTestDB();
    await GameManager.save(testGame);
  });

  afterAll(() => {
    DbHelper.instance.teardownTestDB();
  });

  it('create playlist', async () => {
    const playlist = new Playlist();
    playlist.id = '12345';
    playlist.author = 'generic';
    playlist.title = 'testPlaylist';
    playlist.description = '';
    playlist.library = 'arcade';
    playlist.extreme = false;
    const savedPlaylist = await GameManager.updatePlaylist(playlist);
    expect(savedPlaylist.title).toEqual('testPlaylist');
  });

  it('find playlist', async () => {
    const playlist = await GameManager.findPlaylist('12345');
    expect(playlist).toBeTruthy();
    if (playlist) {
      expect(playlist.title).toEqual('testPlaylist');
    }
  });

  it('find playlist by name', async () => {
    // const playlist = await GameManager.findPlaylistByName('testPlaylist');
    const playlist = await getManager().getRepository(Playlist).findOne({ where: {
      title: 'testPlaylist'
    }});
    expect(playlist).toBeTruthy();
    if (playlist) {
      expect(playlist.id).toEqual('12345');
    }
  });

  it('save playlist game', async () => {

  });
});

function createPlaceholderGame(data: Partial<Game>): Game {
  const id = '12345';
  const game = new Game();
  Object.assign(game, {
    id: id,
    parentGameId: id,
    title: 'Test Game',
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
    placeholder: true,
    activeDataOnDisk: false,
    ...data
  });
  return game;
}
