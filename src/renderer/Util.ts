import * as path from 'path';
import { AddLogData, BackIn } from '../shared/back/types';
import { Paths } from './Paths';

export const gameIdDataType: string = 'text/game-id';

/** How much the maximum/minimum game scale will scale the games up/down */
export const gameScaleSpan = 0.6;

/**
 * Get the path of the icon for a given platform (could point to a non-existing file)
 * @param platform Platform to get icon of (case sensitive)
 */
export function getPlatformIconPath(platform: string): string {
  return path.join(getLogosFolderPath(window.External.config.fullFlashpointPath), platform+'.png').replace(/\\/g, '/');
}

function getLogosFolderPath(flashpointPath: string, logosFolderPath?: string) {
  if (logosFolderPath === undefined) { logosFolderPath = window.External.config.data.logoFolderPath; }
  return path.join(flashpointPath, logosFolderPath);
}

export function easterEgg(search: string) {
  if (search === '\x44\x61\x72\x6b\x4d\x6f\x65') {
    // spell-checker: disable
    window.External.back.send<any, AddLogData>(BackIn.ADD_LOG, {
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

/**
 * Convert a size (in bytes) to a more human readable format.
 * @param size Size in bytes.
 * @returns Size, but in a more human readable format.
 */
export function sizeToString(size: number, precision: number = 3): string {
  if (size < 1000)       { return `${size}B`; }
  if (size < 1000000)    { return `${(size / 1000).toPrecision(precision)}KB`; }
  if (size < 1000000000) { return `${(size / 1000000).toPrecision(precision)}MB`; }
  return `${(size / 1000000000).toPrecision(precision)}GB`;
}

/** Get the file extension of a file (including the dot). Returns an empty string if none. */
export function getFileExtension(filename: string): string {
  const firstDot = filename.lastIndexOf('.');
  if (firstDot === -1) { return ''; }
  return filename.substr(firstDot);
}
