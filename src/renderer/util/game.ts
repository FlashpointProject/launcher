import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { IGameInfo } from '../../shared/game/interfaces';
import { ImageFolderCache } from '../image/ImageFolderCache';
import { formatImageFilename } from '../image/util';
import { getFileExtension } from '../Util';

const copyFile = promisify(fs.copyFile);
const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);

/**
 * Delete all image files of a game in the specified cache.
 * @param game The game to delete all the image files of.
 * @param cache Cache of the image folder to delete the files from.
 */
export async function deleteGameImageFiles(game: IGameInfo, cache: ImageFolderCache): Promise<void> {
  // Find and delete all of the games images in the cache
  const filenames = [ ...cache.getFilePaths(game.id), ...cache.getFilePaths(game.title) ];
  for (let filename of filenames) {
    await unlink(path.join(cache.getFolderPath(), filename));
  }
  if (filenames.length > 0) { await cache.refresh(); }
}

/**
 * Copy an image file from anywhere to the folder of an "image cache" and for a specific game.
 * @param source File path of the image to copy.
 * @param game Game that the image will "belong" to.
 * @param cache Image cache to store the image in (it is copied to this caches folder).
 */
export async function copyGameImageFile(source: string, game: IGameInfo, cache: ImageFolderCache): Promise<void> {
  // Delete the current image(s)
  await deleteGameImageFiles(game, cache);
  // Copy image file
  const outputPath = getOutputPath(game, cache, getFileExtension(source));
  return await copyFile(source, outputPath, fs.constants.COPYFILE_EXCL)
  .then(() => cache.refresh())
  .catch(error => { throw error; });
}

/**
 * Create an image file from a raw data and put it in the folder of an "image cache" and for a specific game.
 * @param data Raw data of the image file (this will be directly inserted into the file).
 * @param extension File extension to use on the image file.
 * @param game Game that the image will "belong" to.
 * @param cache Image cache to store the image in (it is copied to this caches folder).
 */
export async function createGameImageFileFromData(data: Buffer, extension: string, game: IGameInfo, cache: ImageFolderCache): Promise<void> {
  // Delete the current image(s)
  await deleteGameImageFiles(game, cache);
  // Create image file
  const outputPath = getOutputPath(game, cache, extension);
  return writeFile(outputPath, data);
}

/** Get the path to save an image to. */
function getOutputPath(game: IGameInfo, cache: ImageFolderCache, extension: string): string {
  // (Give it index 1, since only one thumbnail/screenshot per game is supported at the moment)
  return path.join(
    cache.getFolderPath(),
    formatImageFilename(game.id, 1) + extension
  );
}
