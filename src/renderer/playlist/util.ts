import * as path from 'path';
import { uuid } from '../uuid';
import { GamePlaylist } from './types';

export function createGamePlaylist(): GamePlaylist {
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
 * Get the path of the Playlist folder from a Flashpoint folder.
 * If no flashpoint folder is given, the Flashpoint path from the config will be used.
 */
export function getPlaylistFolder(flashpointFolder?: string): string {
  if (!flashpointFolder) { flashpointFolder = window.External.config.fullFlashpointPath; }
  return path.join(flashpointFolder, window.External.config.data.playlistFolderPath);
}
