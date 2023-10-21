import { deepCopy, readJsonFile, readJsonFileSync, stringifyJsonDataFile } from '@shared/Util';
import { IObjectParserProp, ObjectParser } from '@shared/utils/ObjectParser';
import { Playlist, PlaylistGame } from 'flashpoint-launcher';
import * as fs from 'fs';
import { uuid } from './util/uuid';
import { str } from '@shared/utils/Coerce';

export namespace PlaylistFile {
  export function readFile(filePath: string, onError?: (error: string) => void): Promise<Playlist> {
    return new Promise((resolve, reject) => {
      readJsonFile(filePath, 'utf8')
      .then(json => {
        const playlist = parse(json, onError);
        playlist.filePath = filePath;
        resolve(playlist);
      })
      .catch(reject);
    });
  }

  export function readFileSync(filePath: string, onError?: (error: string) => void): Playlist {
    const playlist = parse(readJsonFileSync(filePath), onError);
    playlist.filePath = filePath;
    return playlist;
  }

  export async function readOrCreateFile(filePath: string, onError?: (error: string) => void): Promise<Playlist> {
    let error: Error | undefined;
    let data: Playlist | undefined;

    try {
      data = await readFile(filePath, onError);
    } catch (e: any) {
      error = e;
    }

    if (error || !data) {
      data = deepCopy(DEFAULT_PLAYLIST_DATA);
      saveFile(filePath, data).catch(() => console.log('Failed to save default config file!'));
    }

    return data;
  }

  export function readOrCreateFileSync(filePath: string, onError?: (error: string) => void): Playlist {
    let error: Error | undefined;
    let data: Playlist | undefined;

    try {
      data = readFileSync(filePath, onError);
    } catch (e: any) {
      error = e;
    }

    if (error || !data) {
      data = deepCopy(DEFAULT_PLAYLIST_DATA);
      saveFile(filePath, data).catch(() => console.log('Failed to save default config file!'));
    }

    return data;
  }

  export function saveFile(filePath: string, data: Playlist): Promise<void> {
    const playlistToSave = {
      ...data,
      filePath: undefined
    };
    return new Promise((resolve, reject) => {
      // Convert config to json string
      const json: string = stringifyJsonDataFile(playlistToSave);
      // Save the config file
      fs.writeFile(filePath, json, function(error) {
        if (error) { return reject(error); }
        else       { return resolve();     }
      });
    });
  }

  function parse(json: any, onError?: (error: string) => void): Playlist {
    return overwritePlaylistData(deepCopy(DEFAULT_PLAYLIST_DATA), json, onError);
  }
}

const DEFAULT_PLAYLIST_DATA: Playlist = {
  filePath: '',
  id: '',
  games: [],
  title: '',
  description: '',
  author: '',
  library: 'arcade',
  icon: '',
  extreme: false
};

export function overwritePlaylistData(
  source: Playlist,
  data: Partial<Playlist>,
  onError?: (error: string) => void
): Playlist {
  const parser = new ObjectParser({
    input: data,
    onError: onError && (e => onError(`Error while parsing Playlist: ${e.toString()}`)),
  });
  parser.prop('id',          v => source.id          = str(v), true);
  parser.prop('title',       v => source.title       = str(v));
  parser.prop('description', v => source.description = str(v));
  parser.prop('icon',        v => source.icon        = str(v));
  parser.prop('library',     v => source.library     = str(v));
  parser.prop('author',      v => source.author      = str(v));
  parser.prop('extreme',     v => source.extreme     = !!v);
  if (!source.id) {
    source.id = uuid();
  }
  if (data.games) {
    const newGames: PlaylistGame[] = [];
    parser.prop('games').array((item, index) => newGames.push(parsePlaylistGame(item as IObjectParserProp<PlaylistGame>)));
    source.games = newGames;
  }
  return source;
}

function parsePlaylistGame(parser: IObjectParserProp<any>): PlaylistGame {
  const game: PlaylistGame = {
    notes: '',
    gameId: ''
  };
  parser.prop('id',     v => game.gameId = str(v), true);
  parser.prop('gameId', v => game.gameId = str(v), true);
  parser.prop('notes',  v => game.notes  = str(v));
  if (!game.gameId) {
    throw 'No ID for playlist game';
  }
  return game;
}
