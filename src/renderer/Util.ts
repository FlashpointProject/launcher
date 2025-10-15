import { BackIn } from '@shared/back/types';
import { getFileServerURL } from '@shared/Util';
import { Game, Playlist, TagFilterGroup } from 'flashpoint-launcher';
import * as fs from 'fs';
import * as path from 'path';
import { GameOrderChangeEvent } from './components/GameOrder';
import { Paths } from '@shared/Paths';
import { GameDragEventData } from './components/pages/BrowsePage';
import { GameGridItem } from './components/GameGridItem';
import { GameListItem } from './components/GameListItem';
import { ViewQuery } from '@shared/library/util';
import { getGameDataFilename } from '@shared/utils/misc';
import { GENERAL_VIEW_ID } from '@renderer/store/search/slice';
import _axios from 'axios';

export const gameDragDataType = 'json/game-drag';

/** How much the maximum/minimum game scale will scale the games up/down */
export const gameScaleSpan = 0.6;

export function easterEgg(search: string) {
  if (search === '\x44\x61\x72\x6b\x4d\x6f\x65') {
    // spell-checker: disable
    log.error('ERROR', '\n    Y    O    U    W    I    L    L   N    E    V    E    R    F    I    N    D    H    I    M\nmmmmmmmmmmmmmmNNmmmmmNNNNNNNNNNNNNNNNNNNNNNNNmds+-``                                    `-+ydddddddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNms:.`                                          `-+hdddddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNms.`               `                               `-shdddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm/`           `.+y+-sh/`                              -oddmd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNo`          -++ohhyohNm:`                              -yddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNd.          `sNosdmd/yMNd:                              `+ddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNo           /mNyo+ymdNNd-                                .ydd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm-           :hNNNNNMmy+-`                                `sdd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNs`           ``.-:-:/-`                                   .ydd\nNNNNNNNNNNNNNNNNNNNNNNNMMMMMNNNNNNNNNN+                                                         .hdm\nNNNNNNNNNNNNNNNNNNNNNNNMMMMMNNNNNNNNNN:                                                         .hmm\nNNNNNNNNNNNNNNNNNMMNNNMMMMMMNNNNNNNNNN:                                                         :dmm\nNNNNNNNNNNNNNNNNNMMNNNMMMMMMNNNNNNNNNN:                                                         sdmm\nNNNNNNNNNNNNNNNNMMNNNNMMMNMMMNNNNNNNNN/                                                        `hmmm\nNNNNNNNNNNNNNNNNMMMMNNMMMMMMNNNNNNNNNNs`        ``......````````                               -dmmm\nNNNNNNNNNNNNNNNNMMNNNNNNNNNNNNNNNNNNNNd.      `-/+osooo+++/:---.```                            odmmm\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNy.    `..-/+syysso+/:-.````                             /dmmm\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN+    -+:://ossss+/:-..```.`````                        -hmmm\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNo    ://:://ooo+::-..``...-.--..````                    +dmm\nmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm-    .-/-.../ys:..`````.-..``....```                    +dmm\nmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN+     -ss:``.oys:--..``:os:``````````                   `ydmm\nmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNy`    `/+/-:+yhs+////++++o/.`........``                  `sdmm\nmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm-     :s+++shhs/:://++oo+/:-------:--.`                   :dmm\nmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNd.    .yyyyydhy+/:-::/+oooo+++++++//:-.`                  `sdmd\nmmmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNy`    -yyyyhhs+/::---/ossyyyysso++/:-..`                  -ddmd\nmmmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm:     .yyyy+/-....---/syyyssso+//::-.```                  odmmd\nmmmmmmmmmmmmmmNNNNNNNmmNNNNNNNNNNNNm/ `     oyhhs-.`` `..-+yyysoo+/::--..```                   +dmmd\nmmmmmmmmmmmmmmmmmmmmmmmmNNNNNNNNNNmy`       +hhy/..````..:oyyso++/::--..````                   `yddd\nmmmmmmmmmmmmmmmmmmmmmmmmNmmmmmmNmNm:        :yo-.``````.:+osoo+//::--..````                     -hdd\nmmmmmmmmmmmmmmmmmmmmmmmmNmmmmmmmmmm.        ./-/:::-.```.-:////::--...````                       -hd\nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmh`        `.-:-----..````.----.....`````         `-`            :h\nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm+          .--.`  `````````.....````````         .++`            -\nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm-          `:///:---.```````..`````````         `.:+.             \nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmd.           .:://:--..`````````````````         `.:/.             \nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmd.          `...````````````     `` ````   `.::-``..`              \nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmd:        `/+/`-.`   ``````          ````./ohy+-``                 \ndmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmy`       +::o`.-.```..```            ``//-.oo-`                   \ndddddddmmmmmmmmmmmmmmddmmmmmmmmmmmds. `    s:+/.`..``...``            `-//-.`:s.                    \ndddddddddddddmmmmmmmdddmmmmmmmmmmmmdhs+`//+y+ys+-```````             .//:..``+/                     \ndddddddddddddddddddddddddddmmmmmddddmh-sdhyysyoso.``               `-::-.``.++`                     \nddddddddddddddddddddddddddddddddddddd/-+/-.-hyo:`````..`          `-:-.`.`.o+`                      \ndddddddddhhyyhdddddddddddddddddddhy+:`..````+-```````+s:.`` `````.--...`.-+:                        \nddddhhhyooo+//hddddddddddddddhss+:..``````....`````.`:do:-.````.---.....++.      `````              \nyhhdys/.`....-sdddddddddddds+-.....` ````....`````..`-dho/--.-----....``.``   `````````````         \n++oo/:.`     `-+shhyhhhddy/.......````````..```````.`-dmdyo+/:----....`````````````````````         \n....`           `....-:+o-`......`` ``````````````..`-dmmdo//::/:-...````````````````               \n .-`            ```````````.....```` `````````````..`:mmmho+oydh/:/:.```````````````          ````  \n`/o:              `````````````.```` ``` `` `````...`/mmmhohmmmoyys-`````````````````````````````   \n-:-             ```.`.```-+y.````.:`     `    ```````/mmdyomNNNohs-````````````````````````````    `\n``          `````````````````````-.``        ````````+dmyshNNNmoy-```````````````````````````    ```\n           ````.oddy/````````````             ```````/ddhhmNNNh/-```````````````````    ````    ```` ');
  }
}

/**
 * Join a library route with the browse route
 *
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
 *
 * @param element The input element.
 * @param fn Function that is called for each ancestor of element until it returns true, or runs out of ancestors.
 * @param checkElement If the input element should also be checked. Defaults to false.
 * @returns The found ancestor, or undefined if "fn" returned false for all ancestors (or if the element has no ancestors).
 */
export function findElementAncestor<T extends ElementBase<T>>(element: T, fn: ElementAncestorFunction<T>, checkElement = false): T | undefined {
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
 *
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

export function getGameImageURL(logoPath: string): string {
  return `${getFileServerURL()}/images/${logoPath}`;
}

export function getPlatformIconURL(platform: string, version: number): string {
  return `${getFileServerURL()}/logos/${platform}.png?v=${version}`;
}

export function getExtremeIconURL(version: number): string {
  return `${getFileServerURL()}/logos/Extreme.png?v=${version}`;
}

export function getExtIconURL(id: string): string {
  return `${getFileServerURL()}/exticons/${id}`;
}

export function getCurationURL(folder: string): string {
  return `${getFileServerURL()}/curations/${folder}`;
}

export function getCurationPostURL(): string {
  return `${getFileServerURL()}/curation`;
}

export function getGameImagePath(logoPath: string): string {
  return path.join(
    window.Shared.config.fullFlashpointPath,
    window.Shared.preferences.data.imageFolderPath,
    logoPath
  );
}

/* istanbul ignore next */
export async function getGamePath(game: Game, fpPath: string, htdocsPath: string, dataPacksPath: string): Promise<string | undefined> {
  // Check for GameData first
  if (game.activeDataId) {
    const gameData = await window.Shared.back.request(BackIn.GET_GAME_DATA, game.activeDataId);
    if (gameData) {
      return path.resolve(fpPath, dataPacksPath, getGameDataFilename(gameData));
    } else {
      return undefined;
    }
  }
  // @TODO Because some strings can be interpreted as different paths/URLs, maybe this should return an array
  //       of strings with all the possible paths of the "main" file?
  //       Example: Some web server files are stored in "Server/htdocs" while other are stored in "Server/cgi-bin".
  const shockwavePath = 'FPSoftware/Shockwave/PJX'; // (Path to a shockwave executable)
  const groovePath = 'FPSoftware/3DGrooveGX'; // (Path to the 3D Groove GZ executable)
  // Extract file path from the game's launch command
  const platform = game.primaryPlatform.toLowerCase();
  switch (platform) {
    // Example: 5.x http://example.com/games/cool_game.html
    case 'unity': {
      // Extract the URL (get the content after the first space, or the whole string if there is no space)
      let str: string | undefined = undefined;
      const index = game.legacyLaunchCommand.indexOf(' ');
      if (index >= 0) { str = game.legacyLaunchCommand.substring(index + 1); }
      else            { str = game.legacyLaunchCommand; }
      // Create URL
      const url = toForcedURL(str);
      if (url) { return path.join(fpPath, htdocsPath, urlToFilePath(url)); }
    } break;
    // Relative path to a ".ini" file
    // Example: game.ini
    case '3d groove gx':
      return path.join(fpPath, groovePath, game.legacyLaunchCommand);
    // Examples: -J-Dfile.encoding=UTF8 -J-Duser.language=ja -J-Duser.country=JP http://www.example.jp/game.html
    //           http://www.example.com/game.html
    //           "http://www.example.com/game.html"
    case 'java': {
      // Extract the path/url from the launch command
      let str: string | undefined = undefined;
      if (game.legacyLaunchCommand[0] === '"') { // (URL wrappen in quotation marks)
        // Get the contents between the first pair of quotation marks
        const index = game.legacyLaunchCommand.indexOf('"', 1);
        if (index >= 0) { str = game.legacyLaunchCommand.substring(1, index); }
      } else {
        // Get the content after the last space (or the while string if there is no space)
        const index = game.legacyLaunchCommand.lastIndexOf(' ');
        if (index >= 0) { str = game.legacyLaunchCommand.substring(index); }
        else            { str = game.legacyLaunchCommand; }
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
      if (game.legacyLaunchCommand[0] === '"') { // (Path/URL wrappen in quotation marks)
        // Get the contents between the first pair of quotation marks
        const index = game.legacyLaunchCommand.indexOf('"', 1);
        if (index >= 0) { str = game.legacyLaunchCommand.substring(1, index); }
      } else {
        // Get the content before the first space (or the while string if there is no space)
        const index = game.legacyLaunchCommand.indexOf(' ');
        if (index >= 0) { str = game.legacyLaunchCommand.substring(0, index); }
        else            { str = game.legacyLaunchCommand; }
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
      const index = game.legacyLaunchCommand.lastIndexOf(' ');
      if (index >= 0) { str = game.legacyLaunchCommand.substring(0, index); }
      else            { str = game.legacyLaunchCommand; }
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
      const urlObj = toForcedURL(game.legacyLaunchCommand);
      return urlObj
        ? path.join(fpPath, htdocsPath, urlToFilePath(urlObj))
        : undefined;
    }
  }
}

/**
 * Convert a URL to a path, where the hostname is the first folder, and the pathname the folders afterwards.
 *
 * @param url Url to convert
 */
function urlToFilePath(url: URL): string {
  return decodeURIComponent(path.join(url.hostname, url.pathname));
}

/**
 * Try to create a URL object (both with the unedited string and a protocol).
 *
 * @param str String to convert into a URL
 */
export function toForcedURL(str: string): URL | undefined {
  return toURL(str) || toURL('http://'+str);
}

/**
 * Try to create a URL object (returns undefined if the string is not valid).
 *
 * @param str String to try and convert to a URL
 */
export function toURL(str: string): URL | undefined {
  try { return new URL(str); }
  catch { return undefined; }
}

// @TODO Move this to the back process
export function isFlashpointValidCheck(flashpointPath: string): Promise<boolean> {
  return new Promise(resolve => fs.stat(path.join(flashpointPath, 'FPSoftware'), error => resolve(!error)));
}

type RebuildQueryOpts = {
  text: string;
  extreme: boolean;
  library: string;
  searchLimit: number;
  playlist?: Playlist;
  order: GameOrderChangeEvent;
  tagFilters: TagFilterGroup[];
}

export function rebuildQuery(opts: RebuildQueryOpts): ViewQuery {
  return {
    text: opts.text,
    extreme: opts.extreme,
    playlistId: opts.playlist?.id,
    orderBy: opts.order.orderBy,
    orderReverse: opts.order.orderReverse,
  };
}

/**
 * Get the "library route" of a URL (returns general string if URL is not a valid "sub-browse path")
 *
 * @param urlPath URL to check
 */
export function getViewName(urlPath: string): string {
  if (urlPath.startsWith(Paths.BROWSE)) {
    let str = urlPath.substring(Paths.BROWSE.length);
    if (str[0] === '/') { str = str.substring(1); }
    return str;
  }
  return GENERAL_VIEW_ID;
}

export function findGameDragEventDataGrid(element: EventTarget): GameDragEventData | undefined {
  const game = findElementAncestor(element as Element, target => GameGridItem.isElement(target), true);
  if (game) { return GameGridItem.getDragEventData(game); }
}

export function findGameDragEventDataList(element: EventTarget): GameDragEventData | undefined {
  const game = findElementAncestor(element as Element, target => GameListItem.isElement(target), true);
  if (game) { return GameListItem.getDragEventData(game); }
}

export function wrapSearchTerm(text: string): string {
  return ((text === '') || /\s/.test(text))
    ? `"${text}"`
    : text;
}

export const axios = _axios.create({
  headers: {
    'User-Agent': 'Flashpoint Launcher'
  }
});
