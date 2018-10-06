import * as fs from 'fs';
import * as path from 'path';
import { IGamePlaylist } from './interfaces';
import { loadGamePlaylist, createGamePlaylist, LoadGamePlaylistError, getPlaylistFolder, saveGamePlaylist } from './GamePlaylist';
import { recursiveDirectory } from '../../shared/Util';
import { promisify } from 'util';

const unlink = promisify(fs.unlink);

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

  /** Load all playlists in the playlist folder */
  public load(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (this.hasStartedLoading) { throw new Error('This has already loaded the playlists.'); }
      this.hasStartedLoading = true;
      // Load and parse all playlist files
      const vals: Array<{
        playlist: IGamePlaylist;
        filename: string;
      }> = [];
      await recursiveDirectory({
        directoryPath: getPlaylistFolder(),
        fileCallback: async (obj) => {
          const fullPath = path.join(obj.shared.options.directoryPath, obj.relativePath, obj.filename);
          const result = await loadGamePlaylist(fullPath);
          if (result !== LoadGamePlaylistError.FileNotFound &&
              result !== LoadGamePlaylistError.JSONError) {
            vals.push({
              playlist: result,
              filename: fullPath,
            });
          }
        }
      });
      // Add playlists and paths to this
      for (let i = vals.length-1; i >= 0; i--) {
        const item = vals[i];
        this.playlists[i] = item.playlist;
        this.fileMap[item.playlist.id] = item.filename;
      }
      // Done!
      resolve();
    });
  }

  /**
   * Save a playlist to a file
   * @param playlistId ID of playlist to save
   */
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

  /**
   * Delete the file of a playlist (does NOT remove it from this manager)
   * @param playlistId ID of playlist to delete file of
   * @returns If the playlist file was found and deleted
   */
  public async delete(playlistId: string): Promise<boolean> {
    // Check if the file the playlist was loaded from still exists and has the same id
    // (This is only to save performance by not having to recurse through the entire folder)
    let fullPath = this.fileMap[playlistId];
    if (fullPath) {
      switch(await checkIfSame(fullPath, playlistId)) {
        case CheckIfSameResult.SameID:
          await unlink(fullPath);
          return true;
      }
    }
    // Check all other files in the playlists folder (and sub-folders)
    // (This should find it if it exists - unless something else is editing the folder at the same time)
    let wasFound = false;
    await recursiveDirectory({
      directoryPath: getPlaylistFolder(),
      fileCallback: async (obj) => {
        const fullPath = path.join(obj.shared.options.directoryPath, obj.relativePath, obj.filename);
        const result = await checkIfSame(fullPath, playlistId);
        if (result === CheckIfSameResult.SameID) {
          await unlink(fullPath);
          obj.shared.abort = true;
          wasFound = true;
        }
      }
    });
    if (wasFound) { return true; }
    // Playlist not found
    return false;
  }

  /**
   * Remove a playlist from this manager (does NOT delete the playlist file)
   * @param playlistId ID of playlist to remove
   * @returns If the playlist was found and removed
   */
  public remove(playlistId: string): boolean {
    // Try to find the playlist in the 
    for (let i = this.playlists.length - 1; i >= 0; i--) {
      const playlist = this.playlists[i];
      if (playlist.id === playlistId) {
        // Remove playlist from array
        this.playlists.splice(i, 1);
        // Remove playlist from filemap
        if (this.fileMap[playlistId]) {
          delete this.fileMap[playlistId];
        }
        return true;
      }
    }
    // Playlist not found
    return false;
  }

  /**
   * Create a new playlist and add it to this manager then return it
   * @returns Newly created playlist
   */
  public create(): IGamePlaylist {
    const playlist = createGamePlaylist();
    this.playlists.push(playlist);
    return playlist;
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
