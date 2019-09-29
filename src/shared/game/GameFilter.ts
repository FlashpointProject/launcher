import { GameOrderChangeEvent } from '../../renderer/components/GameOrder';
import { IGamePlaylist } from '../../renderer/playlist/interfaces';
import { GameInfo } from './GameInfo';
import { IGameInfo, IGameSearchQuery } from './interfaces';

export type OrderFn = (a: IGameInfo, b: IGameInfo) => number;

/** Order games by their order title alphabetically (ascending) */
export function orderByTitle(a: IGameInfo, b: IGameInfo): number {
  if (a.orderTitle < b.orderTitle) { return -1; }
  if (a.orderTitle > b.orderTitle) { return  1; }
  return 0;
}

/** Order games by their genre alphabetically (ascending) */
export function orderByGenre(a: IGameInfo, b: IGameInfo): number {
  if (a.genre < b.genre) { return -1; }
  if (a.genre > b.genre) { return  1; }
  return orderByTitle(a, b);
}

/** Order games by the date-time they were added (ascending) */
export function orderByDateAdded(a: IGameInfo, b: IGameInfo): number {
  if (a.dateAdded < b.dateAdded) { return -1; }
  if (a.dateAdded > b.dateAdded) { return  1; }
  return 0;
}

/** Order games by their series alphabetically (ascending) */
export function orderBySeries(a: IGameInfo, b: IGameInfo): number {
  if (a.series < b.series) { return -1; }
  if (a.series > b.series) { return  1; }
  return orderByTitle(a, b);
}

/** Order games by their platform alphabetically (ascending) */
export function orderByPlatform(a: IGameInfo, b: IGameInfo): number {
  if (a.platform < b.platform) { return -1; }
  if (a.platform > b.platform) { return  1; }
  return orderByTitle(a, b);
}

/** Order games by their developer alphabetically (ascending) */
export function orderByDeveloper(a: IGameInfo, b: IGameInfo): number {
  if (a.developer < b.developer) { return -1; }
  if (a.developer > b.developer) { return  1; }
  return orderByTitle(a, b);
}

/** Order games by their publisher alphabetically (ascending) */
export function orderByPublisher(a: IGameInfo, b: IGameInfo): number {
  if (a.publisher < b.publisher) { return -1; }
  if (a.publisher > b.publisher) { return  1; }
  return orderByTitle(a, b);
}

/** Reverse the order (makes an ascending order function descending instead) */
export function reverseOrder(compareFn: OrderFn): OrderFn {
  return (a: IGameInfo, b: IGameInfo) => {
    const ret: number = compareFn(a, b);
    if (ret ===  1) { return -1; }
    if (ret === -1) { return  1; }
    return 0;
  };
}

/** Get the order function for a given game order */
export function getOrderFunction(order: GameOrderChangeEvent): OrderFn {
  let orderFn: OrderFn;
  switch (order.orderBy) {
    case 'dateAdded': orderFn = orderByDateAdded; break;
    case 'genre':     orderFn = orderByGenre;     break;
    case 'platform':  orderFn = orderByPlatform;  break;
    case 'series':    orderFn = orderBySeries;    break;
    case 'developer': orderFn = orderByDeveloper; break;
    case 'publisher': orderFn = orderByPublisher; break;
    default: /* case 'title': */ orderFn = orderByTitle; break;
  }
  if (order.orderReverse === 'descending') {
    orderFn = reverseOrder(orderFn);
  }
  return orderFn;
}

export function filterPlatforms(platforms: string[]|undefined, games: IGameInfo[]): IGameInfo[] {
  if (!platforms) { return games; }
  if (platforms.length === 0) { return []; }
  console.time('filterPlatforms');
  const filteredGames: IGameInfo[] = [];
  for (let game of games) {
    if (platforms.indexOf(game.platform) !== -1) {
      filteredGames.push(game);
    }
  }
  console.timeEnd('filterPlatforms');
  return filteredGames;
}

/** Return a new array with all broken games removed (if showBroken is false) */
export function filterBroken(showBroken: boolean, games: IGameInfo[]): IGameInfo[] {
  if (showBroken) { return games; }
  const filteredGames: IGameInfo[] = [];
  for (let game of games) {
    if (!game.broken) {
      filteredGames.push(game);
    }
  }
  return filteredGames;
}

/** Return a new array with all extreme games removed (if showExtreme is false) */
export function filterExtreme(showExtreme: boolean, games: IGameInfo[]): IGameInfo[] {
  if (showExtreme) { return games; }
  const filteredGames: IGameInfo[] = [];
  for (let game of games) {
    if (!game.extreme) {
      filteredGames.push(game);
    }
  }
  return filteredGames;
}

/**
 * Return a new array with all games that are not in the playlist removed (if playlist isn't undefined)
 * (This will add new games for the games in the playlist that are missing,
 *  this will also reorder the games to match the order of the playlist)
 */
export function filterPlaylist(playlist: IGamePlaylist|undefined, games: IGameInfo[]): IGameInfo[] {
  if (!playlist) { return games; }
  const filteredGames: IGameInfo[] = [];
  for (let gameEntry of playlist.games) {
    const id = gameEntry.id;
    let gameFound = false;
    for (let game of games) {
      if (game.id === id) {
        filteredGames.push(game);
        gameFound = true;
        break;
      }
    }
    if (!gameFound) { filteredGames.push(createGameNotFound(id)); }
  }
  return filteredGames;
}

/** Return a new array with all games that doesn't match the search removed (if there is a search) */
export function filterSearch(search: IGameSearchQuery, games: IGameInfo[]): IGameInfo[] {
  const filteredGames: Array<IGameInfo|undefined> = games.slice();
  if (search.text) {
    const text = search.text;
    for (let i = filteredGames.length - 1; i >= 0; i--) {
      const game = filteredGames[i];
      if (game) {
        if (game.title.toLowerCase().indexOf(text)     === -1 &&
            game.developer.toLowerCase().indexOf(text) === -1 &&
            game.publisher.toLowerCase().indexOf(text) === -1 &&
            game.series.toLowerCase().indexOf(text)    === -1) {
          filteredGames[i] = undefined;
        }
      }

    }
  }
  if (search.developers) {
    for (let developer of search.developers) {
      for (let i = filteredGames.length - 1; i >= 0; i--) {
        const game = filteredGames[i];
        if (game && game.developer.toLowerCase().indexOf(developer) === -1) {
          filteredGames[i] = undefined;
        }
      }
    }
  }
  if (search.platforms) {
    for (let platform of search.platforms) {
      for (let i = filteredGames.length - 1; i >= 0; i--) {
        const game = filteredGames[i];
        if (game && game.platform.toLowerCase().indexOf(platform) === -1) {
          filteredGames[i] = undefined;
        }
      }
    }
  }
  if (search.genres) {
    for (let genre of search.genres) {
      for (let i = filteredGames.length - 1; i >= 0; i--) {
        const game = filteredGames[i];
        if (game && game.genre.toLowerCase().indexOf(genre) === -1) {
          filteredGames[i] = undefined;
        }
      }
    }
  }
  const finalFilteredGames = [];
  for (let game of filteredGames) {
    if (game) { finalFilteredGames.push(game); }
  }
  return finalFilteredGames;
}

export interface IOrderGamesArgs {
  games: IGameInfo[];
  search: string;
  extreme: boolean;
  broken: boolean;
  playlist?: IGamePlaylist;
  platforms?: string[];
  order: GameOrderChangeEvent;
}

export function orderGames(args: IOrderGamesArgs): IGameInfo[] {
  // -- Get the array of games --
  let games = args.games;
  if (!games) { return []; } // (No games found)
  games = games.slice(); // (Copy array)
  // -- Filter games --
  const filters = parseFilters(args.search);
  const filteredGames = (
    filterSearch(filters,
    filterBroken(args.broken,
    filterExtreme(args.extreme,
    filterPlatforms(args.platforms,
    filterPlaylist(args.playlist, games)
  )))));
  // -- Order games --
  let orderedGames = filteredGames;
  if (!args.playlist) { // (Dont order if a playlist is selected - kind of a hack)
    orderedGames = filteredGames.sort(getOrderFunction(args.order));
  }
  // -- Return --
  return orderedGames;
}

/**
 * Parse a search string into an object with the different search "types" separated
 * @param input Search string
 */
function parseFilters(input: string): IGameSearchQuery {
  const filter: IGameSearchQuery = {
    text: '',
    platforms: undefined,
    developers: undefined,
    genres: undefined,
  };
  // Abort if string is empty
  if (!input) { return filter; }
  // Do filtering
  const splits = input.replace(/  +/g, ' ').split(' ');
  let str = ''; // Current string that is being built
  let mode = 0; // What "mode" the string current is in (Normal, Platform, Genre etc.)
  for (let i = 0; i < splits.length; i++) {
    const split = splits[i];
    if (!split) { continue; } // Skip if split is empty
    switch (split[0]) {
      case '!': // Platform (1)
        startNewString(split, 1);
        break;
      case '@': // Developer (2)
        startNewString(split, 2);
        break;
      case '#': // Genre (3)
        startNewString(split, 3);
        break;
      default:
        str += split+' ';
        break;
    }
  }
  finishPreviousString();
  return filter;
  // -- Functions --
  /** Start a new string with a given mode */
  function startNewString(split: string, newMode: number) {
    finishPreviousString();
    str = split.substr(1)+' '; // Remove first character and add a space to the end
    mode = newMode;
  }
  /** Add the current string to the filter object where it belongs (depending on its mode) */
  function finishPreviousString() {
    // Clean string up (remove last character which is a space, and turn into lower case)
    let cleanStr = str.substr(0, str.length-1).toLowerCase();
    // Add string at the correct place
    switch (mode) {
      case 0:
        filter.text = cleanStr;
        break;
      case 1:
        if (!filter.platforms) { filter.platforms = []; }
        filter.platforms.push(cleanStr);
        break;
      case 2:
        if (!filter.developers) { filter.developers = []; }
        filter.developers.push(cleanStr);
        break;
      case 3:
        if (!filter.genres) { filter.genres = []; }
        filter.genres.push(cleanStr);
        break;
    }
  }
}

/* "Game" used for displaying games that are not found */
const notFoundGame: IGameInfo = Object.freeze(Object.assign(
  GameInfo.create(),
  {
    title: 'Game not found',
    placeholder: true, // (This game is not an "actual" game - it just shows the actual game was not found)
  }
));

/** Create a placeholder for games that are not found */
function createGameNotFound(id: string): IGameInfo {
  return Object.assign(
    {}, notFoundGame,
    { id }
  );
}
