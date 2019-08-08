import * as path from 'path';
import { IGameInfo } from '../../shared/game/interfaces';
import { removeFileExtension } from '../../shared/Util';
import { ImageFolderCache } from './ImageFolderCache';

/**
 * Get the image folder name of a game.
 * @param game Game the image belongs to.
 * @param libraryPrefix Prefix of the library the game belongs to.
 * @param isNewGame If the game is newly created (it has not been saved or loaded).
 */
export function getImageFolderName(game: IGameInfo, libraryPrefix: string, isNewGame: boolean): string {
  if (isNewGame) {
    if (game.platform) {
      return (libraryPrefix || '') + game.platform;
    } else {
      return '';
    }
  } else { return removeFileExtension(game.filename); }
}

export function getScreenshotFolderPath(folderName: string, flashpointPath: string): string {
  return path.posix.join(getImageFolderPath(flashpointPath), `./${folderName}/Screenshot - Gameplay`);
}

export function getThumbnailFolderPath(folderName: string, flashpointPath: string): string {
  return path.posix.join(getImageFolderPath(flashpointPath), `./${folderName}/Box - Front`);
}

function getImageFolderPath(flashpointPath: string, imageFolderPath?: string) {
  if (imageFolderPath === undefined) { imageFolderPath = window.External.config.data.imageFolderPath; }
  return path.posix.join(flashpointPath, imageFolderPath);
}

type StringMap = { [key: number]: string };

/**
 * Organize image filepaths by their indices
 * Example: (["test-01.png", "test-03.jpg"]) => { 1: "test-01.png", 3: "test-03.jpg" }
 * @param filenames Image filenames to organize
 */
export function organizeImageFilepaths(filenames: string[]): StringMap {
  const map: StringMap = {};
  filenames.forEach(filename => {
    const match = filename.match(ImageFolderCache.createGetNumberRegex());
    if (match) { map[parseInt(match[1])] = filename; } // (Get the index from the filename)
    else       { map[1]                  = filename; } // (Use 1 as the index for files without one)
  });
  return map;
}

/**
 * Get the index of an image filename (or "defaultValue" if no index was found)
 * @param filename Filename of image
 * @param defaultValue Returned if no index is found
 */
export function getIndexOfImageFilepath(filename: string, defaultValue: number = 1): number {
  const match = filename.match(ImageFolderCache.createGetNumberRegex());
  if (match) { return parseInt(match[1]); }
  else { return defaultValue; }
}

export function firstAvailableImageIndex(map: StringMap): number {
  for (let i = 1; i < 100; i++) {
    if (map[i] === undefined) { return i; }
  }
  return -1;
}

/**
 * Replace all characters that are invalid for image filenames with underscores.
 * This mimics what filenames Launchbox expects from its images.
 * If they are next to each other, turn the entire group into one underscore.
 * (Example: "Te?<|:st" => "Te_st")
 */
export function replaceInvalidImageFilenameChars(str: string): string {
  return str.replace(/[/\\?*:|"<>']+/g, '_');
}

export function formatImageFilename(titleOrId: string, index: number): string {
  const cleanTitleOrId = replaceInvalidImageFilenameChars(titleOrId);
  const indexStr = pad(index | 0);
  return `${cleanTitleOrId}-${indexStr}`;
}

function pad(num: number): string {
  return (num >= 10) ? ''+num : '0'+num;
}
