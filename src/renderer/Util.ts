import { Game } from '@database/entity/Game';
import { AddLogData, BackIn } from '@shared/back/types';
import { htdocsPath } from '@shared/constants';
import { getFileServerURL } from '@shared/Util';
import { remote } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Paths } from './Paths';

export const gameIdDataType: string = 'text/game-id';

/** How much the maximum/minimum game scale will scale the games up/down */
export const gameScaleSpan = 0.6;

export function easterEgg(search: string) {
  if (search === '\x44\x61\x72\x6b\x4d\x6f\x65') {
    // spell-checker: disable
    window.Shared.back.send<any, AddLogData>(BackIn.ADD_LOG, {
      source: '',
      content: '\n    Y    O    U    W    I    L    L   N    E    V    E    R    F    I    N    D    H    I    M\nmmmmmmmmmmmmmmNNmmmmmNNNNNNNNNNNNNNNNNNNNNNNNmds+-``                                    `-+ydddddddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNms:.`                                          `-+hdddddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNms.`               `                               `-shdddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm/`           `.+y+-sh/`                              -oddmd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNo`          -++ohhyohNm:`                              -yddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNd.          `sNosdmd/yMNd:                              `+ddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNo           /mNyo+ymdNNd-                                .ydd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm-           :hNNNNNMmy+-`                                `sdd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNs`           ``.-:-:/-`                                   .ydd\nNNNNNNNNNNNNNNNNNNNNNNNMMMMMNNNNNNNNNN+                                                         .hdm\nNNNNNNNNNNNNNNNNNNNNNNNMMMMMNNNNNNNNNN:                                                         .hmm\nNNNNNNNNNNNNNNNNNMMNNNMMMMMMNNNNNNNNNN:                                                         :dmm\nNNNNNNNNNNNNNNNNNMMNNNMMMMMMNNNNNNNNNN:                                                         sdmm\nNNNNNNNNNNNNNNNNMMNNNNMMMNMMMNNNNNNNNN/                                                        `hmmm\nNNNNNNNNNNNNNNNNMMMMNNMMMMMMNNNNNNNNNNs`        ``......````````                               -dmmm\nNNNNNNNNNNNNNNNNMMNNNNNNNNNNNNNNNNNNNNd.      `-/+osooo+++/:---.```                            odmmm\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNy.    `..-/+syysso+/:-.````                             /dmmm\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN+    -+:://ossss+/:-..```.`````                        -hmmm\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNo    ://:://ooo+::-..``...-.--..````                    +dmm\nmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm-    .-/-.../ys:..`````.-..``....```                    +dmm\nmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN+     -ss:``.oys:--..``:os:``````````                   `ydmm\nmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNy`    `/+/-:+yhs+////++++o/.`........``                  `sdmm\nmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm-     :s+++shhs/:://++oo+/:-------:--.`                   :dmm\nmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNd.    .yyyyydhy+/:-::/+oooo+++++++//:-.`                  `sdmd\nmmmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNy`    -yyyyhhs+/::---/ossyyyysso++/:-..`                  -ddmd\nmmmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm:     .yyyy+/-....---/syyyssso+//::-.```                  odmmd\nmmmmmmmmmmmmmmNNNNNNNmmNNNNNNNNNNNNm/ `     oyhhs-.`` `..-+yyysoo+/::--..```                   +dmmd\nmmmmmmmmmmmmmmmmmmmmmmmmNNNNNNNNNNmy`       +hhy/..````..:oyyso++/::--..````                   `yddd\nmmmmmmmmmmmmmmmmmmmmmmmmNmmmmmmNmNm:        :yo-.``````.:+osoo+//::--..````                     -hdd\nmmmmmmmmmmmmmmmmmmmmmmmmNmmmmmmmmmm.        ./-/:::-.```.-:////::--...````                       -hd\nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmh`        `.-:-----..````.----.....`````         `-`            :h\nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm+          .--.`  `````````.....````````         .++`            -\nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm-          `:///:---.```````..`````````         `.:+.             \nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmd.           .:://:--..`````````````````         `.:/.             \nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmd.          `...````````````     `` ````   `.::-``..`              \nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmd:        `/+/`-.`   ``````          ````./ohy+-``                 \ndmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmy`       +::o`.-.```..```            ``//-.oo-`                   \ndddddddmmmmmmmmmmmmmmddmmmmmmmmmmmds. `    s:+/.`..``...``            `-//-.`:s.                    \ndddddddddddddmmmmmmmdddmmmmmmmmmmmmdhs+`//+y+ys+-```````             .//:..``+/                     \ndddddddddddddddddddddddddddmmmmmddddmh-sdhyysyoso.``               `-::-.``.++`                     \nddddddddddddddddddddddddddddddddddddd/-+/-.-hyo:`````..`          `-:-.`.`.o+`                      \ndddddddddhhyyhdddddddddddddddddddhy+:`..````+-```````+s:.`` `````.--...`.-+:                        \nddddhhhyooo+//hddddddddddddddhss+:..``````....`````.`:do:-.````.---.....++.      `````              \nyhhdys/.`....-sdddddddddddds+-.....` ````....`````..`-dho/--.-----....``.``   `````````````         \n++oo/:.`     `-+shhyhhhddy/.......````````..```````.`-dmdyo+/:----....`````````````````````         \n....`           `....-:+o-`......`` ``````````````..`-dmmdo//::/:-...````````````````               \n .-`            ```````````.....```` `````````````..`:mmmho+oydh/:/:.```````````````          ````  \n`/o:              `````````````.```` ``` `` `````...`/mmmhohmmmoyys-`````````````````````````````   \n-:-             ```.`.```-+y.````.:`     `    ```````/mmdyomNNNohs-````````````````````````````    `\n``          `````````````````````-.``        ````````+dmyshNNNmoy-```````````````````````````    ```\n           ````.oddy/````````````             ```````/ddhhmNNNh/-```````````````````    ````    ```` ',
    });
  }
}

/**
 * Copy and shuffle an array.
 * @param {Array} array The array to copy and shuffle
 * @returns Shuffled copy of the given array
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[j];
    shuffled[j] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled;
}

/**
 * Join a library route with the browse route
 * @param route Library route
 */
export function joinLibraryRoute(route: string): string {
  let cleanRoute = (
    route
    .replace(/\//g, '')
    .replace(/\\/g, '')
  );
  if (cleanRoute === '..') { cleanRoute = ''; }
  return path.posix.join(Paths.BROWSE, cleanRoute);
}

/** (HTML)Element but only with the "parentElement" property. */
type ElementBase<T extends ElementBase<T>> = { parentElement: T | null; };

/**
 * @param target Current target element for testing.
 * @param count Number of steps up the ancestry chain the target is (0 means it's the input element, 1 means it's the input element's parent).
 * @param input The element the search started from.
 * @returns If the target element is the ancestor the function is looking for.
 */
export type ElementAncestorFunction<T extends ElementBase<T>> = (target: T, count: number, input: T) => boolean;

/**
 * Find the first ancestor of an element where "fn" returns true (starting with the parent of the input element).
 * @param element The input element.
 * @param fn Function that is called for each ancestor of element until it returns true, or runs out of ancestors.
 * @param checkElement If the input element should also be checked. Defaults to false.
 * @returns The found ancestor, or undefined if "fn" returned false for all ancestors (or if the element has no ancestors).
 */
export function findElementAncestor<T extends ElementBase<T>>(element: T, fn: ElementAncestorFunction<T>, checkElement: boolean = false): T | undefined {
  let current = checkElement ? element : element.parentElement;
  let count = 0;
  while (true) {
    if (!current) { break; }
    if (fn(current, count, element)) { return current; }
    current = current.parentElement;
    count += 1;
  }
  return undefined;
}

/**
 * Check if an element is the same as another element, or an ancestor of it.
 * @param start First element to compare to (it will climb up the parents of this recursively).
 * @param target Element to find.
 * @returns If the "target" element was found.
 */
export function checkIfAncestor(start: Element | null, target: Element | null): boolean {
  let element: Element | null = start;
  while (element) {
    if (element === target) { return true; }
    element = element.parentElement;
  }
  return false;
}

export function getGameImageURL(folderName: string, gameId: string): string {
  return `${getFileServerURL()}/images/${folderName}/${gameId.substr(0, 2)}/${gameId.substr(2, 2)}/${gameId}.png`;
}

export function getPlatformIconURL(platform: string): string {
  return `${getFileServerURL()}/logos/${platform}.png`;
}

export function getGameImagePath(folderName: string, gameId: string): string {
  return path.join(
    window.Shared.config.fullFlashpointPath,
    window.Shared.config.data.imageFolderPath,
    folderName,
    `${gameId.substr(0, 2)}/${gameId.substr(2, 2)}/${gameId}.png`
  );
}

type IGamePathInfo = Pick<Game, 'platform' | 'launchCommand'>;

/* istanbul ignore next */
export function getGamePath(game: IGamePathInfo, fpPath: string): string | undefined {
  // @TODO Because some strings can be interpreted as different paths/URLs, maybe this should return an array
  //       of strings with all the possible paths of the "main" file?
  //       Example: Some web server files are stored in "Server/htdocs" while other are stored in "Server/cgi-bin".
  const shockwavePath = 'FPSoftware/Shockwave/PJX'; // (Path to a shockwave executable)
  const groovePath = 'FPSoftware/3DGrooveGX'; // (Path to the 3D Groove GZ executable)
  // Extract file path from the game's launch command
  const platform = game.platform.toLowerCase();
  switch (platform) {
    // Example: 5.x http://example.com/games/cool_game.html
    case 'unity': {
      // Extract the URL (get the content after the first space, or the whole string if there is no space)
      let str: string | undefined = undefined;
      const index = game.launchCommand.indexOf(' ');
      if (index >= 0) { str = game.launchCommand.substring(index + 1); }
      else            { str = game.launchCommand; }
      // Create URL
      const url = toForcedURL(str);
      if (url) { return path.join(fpPath, htdocsPath, urlToFilePath(url)); }
    } break;
    // Relative path to a ".ini" file
    // Example: game.ini
    case '3d groove gx':
      return path.join(fpPath, groovePath, game.launchCommand);
    // Examples: -J-Dfile.encoding=UTF8 -J-Duser.language=ja -J-Duser.country=JP http://www.example.jp/game.html
    //           http://www.example.com/game.html
    //           "http://www.example.com/game.html"
    case 'java': {
      // Extract the path/url from the launch command
      let str: string | undefined = undefined;
      if (game.launchCommand[0] === '"') { // (URL wrappen in quotation marks)
        // Get the contents between the first pair of quotation marks
        const index = game.launchCommand.indexOf('"', 1);
        if (index >= 0) { str = game.launchCommand.substring(1, index); }
      } else {
        // Get the content after the last space (or the while string if there is no space)
        const index = game.launchCommand.lastIndexOf(' ');
        if (index >= 0) { str = game.launchCommand.substring(index); }
        else            { str = game.launchCommand; }
      }
      // Create a full path from the extracted url
      if (str !== undefined) {
        const url = toForcedURL(str);
        if (url) { return path.join(fpPath, htdocsPath, urlToFilePath(url)); }
      }
    } break;
    // Examples: http://example.com/game.dcr --forceTheExitLock 0
    //           "http://example.com/game.dcr" --do "member('gameUrl').text = 'http://example.com/other_thing.dcr'"
    //           ..\Games\game_folder\game_file.dcr
    case 'shockwave': {
      // Extract the path/url from the launch command
      let str: string | undefined = undefined;
      if (game.launchCommand[0] === '"') { // (Path/URL wrappen in quotation marks)
        // Get the contents between the first pair of quotation marks
        const index = game.launchCommand.indexOf('"', 1);
        if (index >= 0) { str = game.launchCommand.substring(1, index); }
      } else {
        // Get the content before the first space (or the while string if there is no space)
        const index = game.launchCommand.indexOf(' ');
        if (index >= 0) { str = game.launchCommand.substring(0, index); }
        else            { str = game.launchCommand; }
      }
      // Create a full path from the extracted path/url
      if (str !== undefined) {
        // Note: Because some strings could either be a path or URL ("localflash/game.swf" for example), this will assume that
        //       all URLs start with a protocol ("http://"). This will probably make this function not work for some games.
        const url = toURL(str);
        if (url) { return path.join(fpPath, htdocsPath, urlToFilePath(url)); }
        else     { return path.join(fpPath, shockwavePath, str); }
      }
    } break;
    // Launch Command contains
    // Example: http://www.example.com/game.html example\game.dll
    case 'activex': {
      // Extract everything before the first space
      let str: string | undefined = undefined;
      const index = game.launchCommand.lastIndexOf(' ');
      if (index >= 0) { str = game.launchCommand.substring(0, index); }
      else            { str = game.launchCommand; }
      // Create a full path from the extracted url
      const url = toForcedURL(str);
      if (url) { return path.join(fpPath, htdocsPath, urlToFilePath(url)); }
    } break;
    // Launch Commands that only contain a URL
    // Example: http://example.com/games/cool_game.html
    case '3dvia player':
    case 'flash':
    case 'html5':
    case 'popcap plugin':
    case 'silverlight':
    default: {
      const urlObj = toForcedURL(game.launchCommand);
      return urlObj
        ? path.join(fpPath, htdocsPath, urlToFilePath(urlObj))
        : undefined;
    }
  }
}

/** Convert a URL to a path, where the hostname is the first folder, and the pathname the folders afterwards. */
function urlToFilePath(url: URL): string {
  return decodeURIComponent(path.join(url.hostname, url.pathname));
}

/** Try to create a URL object (both with the unedited string and a protocol). */
export function toForcedURL(str: string): URL | undefined {
  return toURL(str) || toURL('http://'+str);
}

/** Try to create a URL object (returns undefined if the string is not valid). */
export function toURL(str: string): URL | undefined {
  try { return new URL(str); }
  catch { return undefined; }
}

/** Open a confirmation box, returning true if Yes, false if No, throwing if Cancelled. */
export async function openConfirmDialog(title: string, message: string, cancel: boolean = false): Promise<boolean> {
  const buttons = ['Yes', 'No'];
  if (cancel) { buttons.push('Cancel'); }
  const res = await remote.dialog.showMessageBox({
    title: title,
    message: message,
    buttons: buttons
  });
  if (res.response === 0) { return true; }
  if (res.response === 1) { return false; }
  else { throw 'Cancelled'; }
}

// @TODO Move this to the back process
export function isFlashpointValidCheck(flashpointPath: string): Promise<boolean> {
  return new Promise(resolve => fs.stat(path.join(flashpointPath, 'Data/Platforms'), error => resolve(!error)));
}