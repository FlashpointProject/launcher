import * as fs from 'fs';
import * as path from 'path';
import { uuid } from '../uuid';
import { IGamePlaylist, IGamePlaylistEntry } from './interfaces';
import { tryParseJSON, stringifyJsonDataFile } from '../../shared/Util';
import { ObjectParser } from '../../shared/utils/ObjectParser';

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
export function parseGamePlaylist(data: any, onError?: (error: string) => void): IGamePlaylist {
  const playlist: IGamePlaylist = {
    id: '',
    games: [],
    title: '',
    description: '',
    author: '',
    icon: undefined,
  };
  const parser = new ObjectParser({
    input: data,
    onError: onError ? (e) => { onError(e.toString()) } : noop,
  });
  parser.prop('id',          id          => playlist.id          = id+''         );
  parser.prop('title',       title       => playlist.title       = title+''      );
  parser.prop('description', description => playlist.description = description+'');
  parser.prop('author',      author      => playlist.author      = author+''     );
  parser.prop('icon',        icon        => playlist.icon        = icon+''       );
  parser.prop('games').array(gameParser => {
    const game = createGamePlaylistEntry();
    gameParser.prop('id',    id    => game.id    = id+''   );
    gameParser.prop('notes', notes => game.notes = notes+'');
    playlist.games.push(game);
  });
  return playlist;
}

function createGamePlaylistEntry(): IGamePlaylistEntry {
  return {
    id: '',
    notes: ''
  };
}

export function loadGamePlaylist(filename: string, onError?: (error: string) => void): Promise<IGamePlaylist|LoadGamePlaylistError> {
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
      resolve(parseGamePlaylist(jsonOrError, onError));
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
    const json: string = stringifyJsonDataFile(playlist);
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

function noop() {}
