import * as fs from 'fs-extra';
import { stringifyJsonDataFile, tryParseJSON } from '../../shared/Util';
import { Coerce } from '../../shared/utils/Coerce';
import { IObjectParserProp, ObjectParser } from '../../shared/utils/ObjectParser';
import { GamePlaylist, GamePlaylistEntry } from './types';

const { str } = Coerce;

export namespace PlaylistFile {
  /** Encoding used by the file. */
  const fileEncoding: string = 'utf8';

  /**
   * Read and parse the file asynchronously.
   * @param filePath Path of the file.
   * @param onError Called for each error that occurs while parsing.
   */
  export function readFile(filePath: string, onError?: (error: string) => void): Promise<GamePlaylist | LoadGamePlaylistError> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, { encoding: fileEncoding }, (error, data) => {
        // Check if reading file failed
        if (error) {
          if (error.code === 'ENOENT') { return resolve(LoadGamePlaylistError.FileNotFound); }
          reject(error);
        }
        // Try to parse json (and callback error if it fails)
        const jsonOrError: string | Error = tryParseJSON(data.toString(fileEncoding));
        if (jsonOrError instanceof Error) { return resolve(LoadGamePlaylistError.JSONError); }
        // Parse object
        return resolve(parseGamePlaylist(jsonOrError));
      });
    });
  }

  /**
   * Save the data to a file asynchronously.
   * @param filePath Path of the file.
   * @param data Data to save to the file.
   */
  export function saveFile(filePath: string, data: GamePlaylist): Promise<void> {
    return fs.writeFile(filePath, stringifyJsonDataFile(data), fileEncoding);
  }

  function parseGamePlaylist(data: any, onError?: (error: string) => void): GamePlaylist {
    const playlist: GamePlaylist = {
      id: '',
      games: [],
      title: '',
      description: '',
      author: '',
      icon: undefined,
      library: undefined,
    };
    const parser = new ObjectParser({
      input: data,
      onError: onError && (e => onError(`Error while converting Playlist: ${e.toString()}`))
    });
    parser.prop('id',          v => playlist.id          = str(v));
    parser.prop('title',       v => playlist.title       = str(v));
    parser.prop('description', v => playlist.description = str(v));
    parser.prop('author',      v => playlist.author      = str(v));
    parser.prop('icon',        v => playlist.icon        = str(v), true);
    parser.prop('library',     v => playlist.library     = str(v), true);
    parser.prop('games').array(item => { playlist.games.push(parseGamePlaylistEntry(item)); });
    return playlist;
  }

  function parseGamePlaylistEntry(parser: IObjectParserProp<any>): GamePlaylistEntry {
    let parsed: GamePlaylistEntry = {
      id: '',
      notes: ''
    };
    parser.prop('id',    v => parsed.id    = str(v));
    parser.prop('notes', v => parsed.notes = str(v));
    return parsed;
  }
}

export enum LoadGamePlaylistError {
  FileNotFound,
  JSONError,
}
