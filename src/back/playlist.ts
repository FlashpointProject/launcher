import * as GameManager from '@back/game/GameManager';
import { BackOut } from '@shared/back/types';
import { deepCopy } from '@shared/Util';
import { sanitizeFilename } from '@shared/utils/sanitizeFilename';
import { formatString } from '@shared/utils/StringFormatter';
import { Playlist, PlaylistGame } from 'flashpoint-launcher';
import * as fs from 'fs';
import { PlaylistFile } from './PlaylistFile';
import { MsgEvent } from './SocketServer';
import { BackState } from './types';
import { uuid } from './util/uuid';
import path = require('path');

export function filterPlaylists(playlist: Playlist[], extreme: boolean): Playlist[] {
  return playlist.filter(p => {
    if (!extreme && p.extreme) {
      return false;
    }
    return true;
  });
}

export function findPlaylist(state: BackState, playlistId: string): Playlist {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (playlist) {
    return playlist;
  } else {
    throw 'Playlist does not exist';
  }
}

export function findPlaylistByName(state: BackState, playlistName: string): Playlist {
  const playlist = state.playlists.find(p => p.title === playlistName);
  if (playlist) {
    return playlist;
  } else {
    throw 'Playlist does not exist';
  }
}

export async function getPlaylistGame(state: BackState, playlistId: string, gameId: string): Promise<PlaylistGame> {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (playlist) {
    const game = playlist.games.find(g => g.gameId === gameId);
    if (game) {
      return game;
    } else {
      throw 'Game not found';
    }
  } else {
    throw 'Playlist not found';
  }
}

export async function addPlaylistGame(state: BackState, playlistId: string, gameId: string): Promise<void> {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (playlist) {
    const game = playlist.games.find(g => g.gameId === gameId);
    if (game) {
      throw 'Game already exists in playlist';
    } else {
      const oldPlaylist = deepCopy(playlist);
      playlist.games.push(
        {
          gameId,
          order: playlist.games.reduce<number>((prev, cur) => Math.max(cur.order, prev), 0) + 1,
          notes: ''
        }
      );
      await updatePlaylist(state, oldPlaylist, playlist);
    }
  } else {
    throw 'Playlist not found';
  }
}

export async function savePlaylistGame(state: BackState, playlistId: string, playlistGame: PlaylistGame): Promise<PlaylistGame> {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (playlist) {
    const gameIdx = playlist.games.findIndex(g => g.gameId === playlistGame.gameId);
    if (gameIdx !== -1) {
      const oldPlaylist = deepCopy(playlist);
      playlist.games[gameIdx] = playlistGame;
      await updatePlaylist(state, oldPlaylist, playlist);
      return playlist.games[gameIdx];
    } else {
      throw 'Game does not exist in playlist';
    }
  } else {
    throw 'Playlist not found';
  }
}

export async function deletePlaylistGame(state: BackState, playlistId: string, gameId: string): Promise<PlaylistGame> {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (playlist) {
    const gameIdx = playlist.games.findIndex(g => g.gameId === gameId);
    if (gameIdx !== -1) {
      const oldPlaylist = deepCopy(playlist);
      const removedGame = playlist.games.splice(gameIdx, 1);
      await updatePlaylist(state, oldPlaylist, playlist);
      return removedGame[0];
    } else {
      throw 'Game does not exist in playlist';
    }
  } else {
    throw 'Playlist not found';
  }
}

export async function importPlaylist(state: BackState, filePath: string, library?: string, event?: MsgEvent) {
  try {
    const newPlaylist = await PlaylistFile.readFile(filePath);
    newPlaylist.filePath = path.join(state.config.flashpointPath, state.preferences.playlistFolderPath, `${sanitizeFilename(newPlaylist.title)} - ${(new Date()).getTime()}.json`);
    const existingPlaylist = state.playlists.find(p => p.title === newPlaylist.title);
    if (existingPlaylist) {
      newPlaylist.title += ' - New';
      newPlaylist.id = uuid();
      if (library) {
        newPlaylist.library = library;
      }
      // Conflict, resolve with user if run by frontend
      if (event) {
        const dialogFunc = state.socketServer.showMessageBoxBack(event.client);
        const strings = state.languageContainer;
        const result = await dialogFunc({
          title: strings.dialog.playlistConflict,
          message:  `${formatString(strings.dialog.importedPlaylistAlreadyExists, existingPlaylist.title)}\n\n${strings.dialog.importPlaylistAs} ${newPlaylist.title}?`,
          buttons: [strings.misc.yes, strings.misc.no, strings.dialog.cancel]
        });
        switch (result) {
          case 0: {
            // Continue importing
            break;
          }
          default:
            // Cancel or No
            throw 'User Cancelled';
        }
      }
    }
    await updatePlaylist(state, newPlaylist, newPlaylist);
    log.info('Launcher', `Imported playlist - ${newPlaylist.title}`);
    if (event) {
      state.socketServer.send(event.client, BackOut.IMPORT_PLAYLIST, newPlaylist);
    }
  } catch (e) {
    console.log(e);
  }
}

export async function duplicatePlaylist(state: BackState, playlistId: string): Promise<Playlist> {
  const playlist = state.playlists.find(p => p.id === playlistId);
  if (playlist) {
    const newPlaylist = deepCopy(playlist);
    const newPlaylistId = uuid();
    newPlaylist.filePath = path.join(state.config.flashpointPath, state.preferences.playlistFolderPath, `${sanitizeFilename(playlist.title)} - ${(new Date()).getTime()}.json`);
    newPlaylist.id = newPlaylistId;
    newPlaylist.title += ' - Copy';
    newPlaylist.games = deepCopy(playlist.games);
    // Save new playlist
    await updatePlaylist(state, newPlaylist, newPlaylist);
    return playlist;
  } else {
    throw 'Playlist does not exist';
  }
}

export async function deletePlaylist(state: BackState, playlistId: string): Promise<Playlist> {
  const playlistIdx = state.playlists.findIndex(p => p.id === playlistId);
  if (playlistIdx !== -1) {
    const playlist = state.playlists[playlistIdx];
    await fs.promises.unlink(playlist.filePath);
    state.playlists.splice(playlistIdx, 1);
    return playlist;
  } else {
    throw 'Playlist does not exist';
  }
}

export async function updatePlaylist(state: BackState, oldPlaylist: Playlist, playlist: Playlist) {
  if (playlist.filePath === '') {
    // Creating new playlist
    playlist.filePath = path.join(state.config.flashpointPath, state.preferences.playlistFolderPath, `${sanitizeFilename(playlist.title)} - ${(new Date()).getTime()}.json`);
  }
  await PlaylistFile.saveFile(playlist.filePath, playlist);
  const existingIdx = state.playlists.findIndex(p => p.id === playlist.id);
  if (existingIdx !== -1) {
    state.playlists[existingIdx] = playlist;
  } else {
    state.playlists.push(playlist);
  }
  GameManager.onDidUpdatePlaylist.fire({ oldPlaylist: oldPlaylist, newPlaylist: playlist });
  state.socketServer.broadcast(BackOut.PLAYLISTS_CHANGE, filterPlaylists(state.playlists, state.preferences.browsePageShowExtreme));
  return playlist;
}
