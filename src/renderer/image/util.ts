import * as path from 'path';
import { ImageFolderCache } from './ImageFolderCache';

export function getScreenshotFolderPath(platform: string, flashpointPath: string): string {
  return path.posix.join(flashpointPath, `./Images/${platform}/Screenshot - Gameplay`);
}

export function getThumbnailFolderPath(platform: string, flashpointPath: string): string {
  return path.posix.join(flashpointPath, `./Images/${platform}/Box - Front`);
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
    if (match) { map[parseFloat(match[1])] = filename; } // (Get the index from the filename)
    else       { map[1]                    = filename; } // (Use 1 as the index for files without one)
  });
  return map;
}

export function firstAvailableImageIndex(map: StringMap): number {
  for (let i = 1; i < 100; i++) {
    if (map[i] === undefined) { return i; }
  }
  return -1;
}

/**
 * Replace all invalid filesystem characters with underscores.
 * If they are next to each other, turn the entire group into one underscore.
 * (Example: "Te?<|:st" => "Te_st")
 */
export function replaceInvalidFilesystemChars(str: string): string {
  return str.replace(/[/\\?*:|"<>']+/g, '_');
}

export function formatImageFilename(titleOrId: string, index: number): string {
  const cleanTitleOrId = titleOrId.replace(/[/\\?*:|"<>']+/g, '_');
  const indexStr = pad(index | 0);
  return `${cleanTitleOrId}-${indexStr}`;
}

function pad(num: number): string {
  return (num >= 10) ? ''+num : '0'+num;
}

/*
export async function getFirstEmptyImageSlot(imageFolder: string, game: IGameInfo): Promise<number> {
  let index = 0;
  while (index < 100) { // (hard cap - in case its an infinite loop)
    const outputPath = path.join(
      imageFolder,
      game.id + '-' + index + getFileExtension(source)
    );
    console.log(outputPath);
    const fileExists = exists(outputPath);
    if (!fileExists) {
      fs.copyFile(source, outputPath, error => {
        if (error) { throw error; }
        this.props.gameImages.refreshPlatform(game.platform);
        this.forceUpdate();
      });   
    }
    index += 1;
  }
}
*/
