import * as fs from 'fs';
import * as path from 'path';
import { uuid } from '../uuid';
import { IGamePlaylist, IGamePlaylistEntry } from './interfaces';
import { tryParseJSON } from '../../shared/Util';

export function createGamePlaylist(): IGamePlaylist {
  return {
    id: uuid(), // Generate a random id
    games: [],
    title: '',
    description: '',
    author: '',
    icon: undefined,
  };
}

/**
 * Parse an arbitrary object into an IGamePlaylist
 * (presumably an IGamePlaylistRaw, but since its loaded from a JSON we can 
 *  not be sure what properties exists, or what types they are of)
 * @param data IGamePlaylistRaw-like object to copy properties from
 */
export function parseGamePlaylist(data: any): IGamePlaylist {
  const playlist: IGamePlaylist = {
    id: '',
    games: [],
    title: '',
    description: '',
    author: '',
    icon: undefined,
  };
  if (data) {
    if (data.id          !== undefined) { playlist.id          = data.id+'';          }
    if (data.title       !== undefined) { playlist.title       = data.title+'';       }
    if (data.title       !== undefined) { playlist.title       = data.title+'';       }
    if (data.description !== undefined) { playlist.description = data.description+''; }
    if (data.author      !== undefined) { playlist.author      = data.author+'';      }
    if (data.icon        !== undefined) { playlist.icon        = data.icon+'';        }
    // Parse games array
    let games = data.games;
    if (Array.isArray(games)) {
      for (let i = games.length - 1; i >= 0; i--) {
        playlist.games[i] = parseGamePlaylistEntry(games[i]);
      }
    }
  }
  return playlist;
}

function parseGamePlaylistEntry(data: any): IGamePlaylistEntry {
  return {
    id: data.id+'',
    notes: data.notes+'',
  };
}

export function loadGamePlaylist(filename: string): Promise<IGamePlaylist|LoadGamePlaylistError> {
  return new Promise<IGamePlaylist|LoadGamePlaylistError>(function(resolve, reject) {
    fs.readFile(filename, 'utf8', function(error, data) {
      if (error) {
        if (error.code === 'ENOENT') { return resolve(LoadGamePlaylistError.FileNotFound); }
        return reject(error);
      }
      // Try to parse json (and callback error if it fails)
      const jsonOrError: string|Error = tryParseJSON(data as string);
      if (jsonOrError instanceof Error) { return resolve(LoadGamePlaylistError.JSONError); }
      // Parse the JSON object
      resolve(parseGamePlaylist(jsonOrError));
    });
  });
}

/**
 * Save a game playlist to a file
 * @param filePath Path to file
 * @param playlist Playlist to save to file
 */
export function saveGamePlaylist(filePath: string, playlist: IGamePlaylist): Promise<void> {
  return new Promise(function(resolve, reject) {
    const json: string = JSON.stringify(playlist, null, 2);
    fs.writeFile(filePath, json, 'utf8', function(error) {
      if (error) { reject(error); }
      else       { resolve();     }
    });
  });
}

/**
 * Get the path of the Playlist folder from a Flashpoint folder
 * (If no flashpoint folder is given, the Flashpoint path from the config will be used)
 */
export function getPlaylistFolder(flashpointFolder?: string): string {
  if (!flashpointFolder) { flashpointFolder = window.External.config.fullFlashpointPath; }
  return path.join(flashpointFolder, 'Playlists');
}

export enum LoadGamePlaylistError {
  FileNotFound,
  JSONError,
}
