import { deepCopy, overwritePlaylistData, readJsonFile, readJsonFileSync, stringifyJsonDataFile } from '@shared/Util';
import { Playlist } from 'flashpoint-launcher';
import * as fs from 'fs';

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
