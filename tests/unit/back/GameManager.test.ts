import * as GameManager from '@back/game/GameManager';
import { createTestGame, GameFactory, GameImportFactory } from '@tests/util/factories/game';
import { cleanMemoryDb } from '@back/index';
import { PlaylistImportFactory } from '@tests/util/factories/playlist';
import { Playlist } from '@database/entity/Playlist';

describe('Game', () => {
  beforeAll(async () => {
    await cleanMemoryDb();
    await (new GameImportFactory()).runMany(25);
  });

  test('Save and fetch many games', async () => {
    let games = await GameManager.findAllGames();
    expect(games.length).toEqual(25);

    const newGames = await (new GameFactory()).runMany(10);
    await GameManager.updateGames(newGames);
    games = await GameManager.findAllGames();
    expect(games.length).toEqual(35);
  });

  test('Save and fetch game', async () => {
    const id = 'test-game';
    const game = createTestGame({ id });
    await GameManager.save(game);
    const foundGame = await GameManager.findGame(id);
    expect(foundGame).not.toBeNull();
    expect(foundGame?.id).toEqual(id);
  });
});

describe('Playlist', () => {
  let firstPlaylist: Playlist;

  beforeAll(async () => {
    await cleanMemoryDb();
    await (new PlaylistImportFactory()).runMany(10, { gameCount: 10 });
  });

  test('Fetch all playlist', async () => {
    const playlists = await GameManager.findPlaylists(true);
    expect(playlists.length).toEqual(10);
    expect(true).toEqual(false);
    firstPlaylist = playlists[0];
  });

  test('Fetch playlist and games', async () => {
    const playlist = await GameManager.findPlaylist(firstPlaylist.id, true);
    expect(playlist).not.toBeNull();
    expect(firstPlaylist.id).toEqual(playlist?.id);

    if (playlist) {
      // Check Join works
      expect(playlist.games.length).toEqual(10);
    }
  });

  test('Fetch playlist by name', async () => {
    const playlist = await GameManager.findPlaylistByName(firstPlaylist.title);
    expect(playlist).not.toBeNull();
    expect(firstPlaylist.id).toEqual(playlist?.id);
  });
});
