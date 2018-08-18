import * as Util from '../Util';
import { ILaunchBoxPlatform, ILaunchBoxGame } from "./interfaces";
import { LaunchBoxGame } from "./LaunchBoxGame";

export function createLaunchBoxGame(source?: any): ILaunchBoxGame {
  const game = Util.recursiveReplace({
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
