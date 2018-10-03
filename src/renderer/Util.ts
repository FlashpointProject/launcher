import * as path from 'path';

/**
 * Calls a defined callback function on each property of an object, and returns an array that contains the results.
 * Similar to Array#map but iterates over the properties of an object.
 * @param source The object who's properties this will iterate over
 * @param callbackfn This is called once per property in the object.
 * @param thisArg What the "this" keyword will refer to inside the callback function (undefined if omitted)
 */
export function forEach<T, U>(source: any, callbackfn: (value: T, key: string) => U, thisArg?: any): any[] {
  const array: any[] = [];
  let index:number = 0;
  for (let key in source) {
    array[index++] = callbackfn.call(thisArg, source[key], key);
  }
  return array;
};

/** Linear interpolation between (and beyond) two values */
export function lerp(from: number, to: number, value: number): number {
  return from + (to - from) * value;
}

/**
 * Get the path of the icon for a given platform (could point to a non-existing file)
 * @param platform Platform to get icon of (case sensitive)
 */
export function getPlatformIconPath(platform: string): string {
  return path.join(window.External.config.fullFlashpointPath, '/Logos/', platform+'.png').replace(/\\/g, '/');
}

export function easterEgg(search: string) {
  if (search === 'DarkMoe') {
    // spell-checker: disable
    window.External.appendLogData('\n    Y    O    U    W    I    L    L   N    E    V    E    R    F    I    N    D    H    I    M\nmmmmmmmmmmmmmmNNmmmmmNNNNNNNNNNNNNNNNNNNNNNNNmds+-``                                    `-+ydddddddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNms:.`                                          `-+hdddddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNms.`               `                               `-shdddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm/`           `.+y+-sh/`                              -oddmd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNo`          -++ohhyohNm:`                              -yddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNd.          `sNosdmd/yMNd:                              `+ddd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNo           /mNyo+ymdNNd-                                .ydd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm-           :hNNNNNMmy+-`                                `sdd\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNs`           ``.-:-:/-`                                   .ydd\nNNNNNNNNNNNNNNNNNNNNNNNMMMMMNNNNNNNNNN+                                                         .hdm\nNNNNNNNNNNNNNNNNNNNNNNNMMMMMNNNNNNNNNN:                                                         .hmm\nNNNNNNNNNNNNNNNNNMMNNNMMMMMMNNNNNNNNNN:                                                         :dmm\nNNNNNNNNNNNNNNNNNMMNNNMMMMMMNNNNNNNNNN:                                                         sdmm\nNNNNNNNNNNNNNNNNMMNNNNMMMNMMMNNNNNNNNN/                                                        `hmmm\nNNNNNNNNNNNNNNNNMMMMNNMMMMMMNNNNNNNNNNs`        ``......````````                               -dmmm\nNNNNNNNNNNNNNNNNMMNNNNNNNNNNNNNNNNNNNNd.      `-/+osooo+++/:---.```                            odmmm\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNy.    `..-/+syysso+/:-.````                             /dmmm\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN+    -+:://ossss+/:-..```.`````                        -hmmm\nNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNo    ://:://ooo+::-..``...-.--..````                    +dmm\nmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm-    .-/-.../ys:..`````.-..``....```                    +dmm\nmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN+     -ss:``.oys:--..``:os:``````````                   `ydmm\nmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNy`    `/+/-:+yhs+////++++o/.`........``                  `sdmm\nmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm-     :s+++shhs/:://++oo+/:-------:--.`                   :dmm\nmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNd.    .yyyyydhy+/:-::/+oooo+++++++//:-.`                  `sdmd\nmmmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNy`    -yyyyhhs+/::---/ossyyyysso++/:-..`                  -ddmd\nmmmmmmmNNNNNNNNNNNNNNNNNNNNNNNNNNNNNm:     .yyyy+/-....---/syyyssso+//::-.```                  odmmd\nmmmmmmmmmmmmmmNNNNNNNmmNNNNNNNNNNNNm/ `     oyhhs-.`` `..-+yyysoo+/::--..```                   +dmmd\nmmmmmmmmmmmmmmmmmmmmmmmmNNNNNNNNNNmy`       +hhy/..````..:oyyso++/::--..````                   `yddd\nmmmmmmmmmmmmmmmmmmmmmmmmNmmmmmmNmNm:        :yo-.``````.:+osoo+//::--..````                     -hdd\nmmmmmmmmmmmmmmmmmmmmmmmmNmmmmmmmmmm.        ./-/:::-.```.-:////::--...````                       -hd\nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmh`        `.-:-----..````.----.....`````         `-`            :h\nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm+          .--.`  `````````.....````````         .++`            -\nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm-          `:///:---.```````..`````````         `.:+.             \nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmd.           .:://:--..`````````````````         `.:/.             \nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmd.          `...````````````     `` ````   `.::-``..`              \nmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmd:        `/+/`-.`   ``````          ````./ohy+-``                 \ndmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmy`       +::o`.-.```..```            ``//-.oo-`                   \ndddddddmmmmmmmmmmmmmmddmmmmmmmmmmmds. `    s:+/.`..``...``            `-//-.`:s.                    \ndddddddddddddmmmmmmmdddmmmmmmmmmmmmdhs+`//+y+ys+-```````             .//:..``+/                     \ndddddddddddddddddddddddddddmmmmmddddmh-sdhyysyoso.``               `-::-.``.++`                     \nddddddddddddddddddddddddddddddddddddd/-+/-.-hyo:`````..`          `-:-.`.`.o+`                      \ndddddddddhhyyhdddddddddddddddddddhy+:`..````+-```````+s:.`` `````.--...`.-+:                        \nddddhhhyooo+//hddddddddddddddhss+:..``````....`````.`:do:-.````.---.....++.      `````              \nyhhdys/.`....-sdddddddddddds+-.....` ````....`````..`-dho/--.-----....``.``   `````````````         \n++oo/:.`     `-+shhyhhhddy/.......````````..```````.`-dmdyo+/:----....`````````````````````         \n....`           `....-:+o-`......`` ``````````````..`-dmmdo//::/:-...````````````````               \n .-`            ```````````.....```` `````````````..`:mmmho+oydh/:/:.```````````````          ````  \n`/o:              `````````````.```` ``` `` `````...`/mmmhohmmmoyys-`````````````````````````````   \n-:-             ```.`.```-+y.````.:`     `    ```````/mmdyomNNNohs-````````````````````````````    `\n``          `````````````````````-.``        ````````+dmyshNNNmoy-```````````````````````````    ```\n           ````.oddy/````````````             ```````/ddhhmNNNh/-```````````````````    ````    ```` \n\n');
  }
}
