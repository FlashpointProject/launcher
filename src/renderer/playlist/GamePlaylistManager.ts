import * as path from 'path';
import { IGamePlaylist } from './interfaces';
import { loadGamePlaylists, loadGamePlaylist, createGamePlaylist, LoadGamePlaylistError, getPlaylistFolder, saveGamePlaylist } from './GamePlaylist';
import { recursiveDirectory } from '../../shared/Util';

interface IPlaylistIdToFilenameMap {
  [playlistId: string]: string|undefined;
}

/** Is in charge of creating, loading, saving and storing the game playlists. */
export class GamePlaylistManager {
  /** All playlists */
  public playlists: IGamePlaylist[] = [];
  /** Map of playlist IDs to the file they were loaded from */
  private fileMap: IPlaylistIdToFilenameMap = {};

  private hasStartedLoading: boolean = false;

  public load(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (this.hasStartedLoading) { throw new Error('This has already loaded the playlists.'); }
      this.hasStartedLoading = true;
      // Load playlists
      const vals = await loadGamePlaylists();
      for (let i = vals.length-1; i >= 0; i--) {
        const item = vals[i];
        this.playlists[i] = item.playlist;
        this.fileMap[item.playlist.id] = item.filename;
      }
      resolve();
    });
  }

  public async save(playlist: IGamePlaylist): Promise<void> {
    // Check if the file the playlist was loaded from still exists and has the same id
    // (This is only to save performance by not having to recurse through the entire folder)
    let fullPath = this.fileMap[playlist.id];
    if (fullPath) {
      switch(await checkIfSame(fullPath, playlist.id)) {
        case CheckIfSameResult.FileNotFound:
        case CheckIfSameResult.SameID:
          saveGamePlaylist(fullPath, playlist);
          return;
      }
    }
    // Check all other files in the playlists folder (and sub-folders)
    // (This should find it if it exists - unless something else is editing the folder at the same time)
    let wasFound = false;
    await recursiveDirectory({
      directoryPath: getPlaylistFolder(),
      fileCallback: async (obj) => {
        const fullPath = path.join(obj.shared.options.directoryPath, obj.relativePath, obj.filename);
        const result = await checkIfSame(fullPath, playlist.id);
        if (result === CheckIfSameResult.SameID) {
          await saveGamePlaylist(fullPath, playlist);
          obj.shared.abort = true;
          wasFound = true;
        }
      }
    });
    if (wasFound) { return; }
    // Create a new file
    await saveGamePlaylist(path.join(getPlaylistFolder(), playlist.id+'.json'), playlist);
  }

  /** Create a new playlist (then add it to this's collection and save it in a new file) then return it */
  public create(): Promise<IGamePlaylist> {
    return new Promise<IGamePlaylist>(async (resolve, reject) => {
      const playlist = createGamePlaylist();
      this.playlists.push(playlist);
      this.save(playlist);
      resolve(playlist);
    });
  }
}

/**
 * Load a playlist file, check if it is valid, then check if it has the given id.
 * @param filename Path of the playlist file to check
 * @param id ID to check if playlist has
 */
async function checkIfSame(filename: string, id: string): Promise<CheckIfSameResult> {
  let loaded: IGamePlaylist|LoadGamePlaylistError|undefined;
  try {
    loaded = await loadGamePlaylist(filename);
  } catch(error) {
    console.log(error);
    return CheckIfSameResult.FileOtherError;
  }
  switch(loaded) {
    case LoadGamePlaylistError.FileNotFound:
      return CheckIfSameResult.FileNotFound;
    case LoadGamePlaylistError.JSONError:
      return CheckIfSameResult.FileInvalid;
  }
  if (loaded.id === id) { return CheckIfSameResult.SameID; }
  return CheckIfSameResult.DifferentID;
}

/** Results for the function "checkIfSame" */
enum CheckIfSameResult {
  FileNotFound,
  FileInvalid,
  FileOtherError,
  SameID,
  DifferentID,
}
