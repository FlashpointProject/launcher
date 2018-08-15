import { ILaunchBoxPlatform, ILaunchBoxGame } from "./interfaces";
import { LaunchBoxGame } from "./LaunchBoxGame";

export function createLaunchBoxGame(source?: any): ILaunchBoxGame {
  const game = recursiveReplace({
    applicationPath: undefined,
    commandLine: undefined,
    completed: undefined,
    configurationCommandLine: undefined,
    configurationPath: undefined,
    dateAdded: undefined,
    dateModified: undefined,
    developer: undefined,
    emulator: undefined,
    favorite: undefined,
    id: undefined,
    manualPath: undefined,
    musicPath: undefined,
    notes: undefined,
    platform: undefined,
    publisher: undefined,
    rating: undefined,
    rootFolder: undefined,
    scummVMAspectCorrection: undefined,
    ScummVMFullscreen: undefined,
    ScummVMGameDataFolderPath: undefined,
    ScummVMGameType: undefined,
    sortTitle: undefined,
    source: undefined,
    starRatingFloatd: undefined,
    starRatingd: undefined,
    communityStarRatingd: undefined,
    communityStarRatingTotalVotesd: undefined,
    status: undefined,
    wikipediaURL: undefined,
    title: undefined,
    useDosBox: undefined,
    useScummVM: undefined,
    version: undefined,
    series: undefined,
    playMode: undefined,
    region: undefined,
    playCountd: undefined,
    portable: undefined,
    videoPath: undefined,
    hide: undefined,
    broken: undefined,
    genre: undefined,
    missingVideo: undefined,
    missingBoxFrontImage: undefined,
    missingScreenshotImage: undefined,
    missingClearLogoImage: undefined,
    missingBackgroundImage: undefined,
  }, source);
  deleteAllUndefined(game);
  return game;
}

function deleteAllUndefined(target: any) {
  for (let key in target) {
    if (target[key] === undefined) {
      delete target[key];
    }
  }
}

/**
 * Recursively copy values from data to target (for every property of the same name)
 * @param target Target object to copy data to
 * @param source Source object to copy data from
 * @returns Target object
 */
function recursiveReplace(target: any, source: any): any {
  // Skip if either is missing
  if (!target || !source) { return; }
  // Go through all properties of target
  for (let key in source) {
    // Check if data has a property of the same name
    if (key in target) {
      let val = source[key];
      // If the value is an object
      if (val !== null && typeof val === 'object') {
        // Go one object deeper and continue copying
        recursiveReplace(target[key], val);
      } else {
        // Copy the value
        target[key] = val;
      }       
    }
  }
  return target;
}
