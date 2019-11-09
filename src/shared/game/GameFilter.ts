import { IGamePlaylist } from '../../renderer/playlist/interfaces';
import { GameOrderBy, GameOrderReverse } from '../order/interfaces';
import { GameInfo } from './GameInfo';
import { IGameInfo } from './interfaces';

type OrderFn = (a: IGameInfo, b: IGameInfo) => number;

/** Order games by their order title alphabetically (ascending) */
function orderByTitle(a: IGameInfo, b: IGameInfo): number {
  if (a.orderTitle < b.orderTitle) { return -1; }
  if (a.orderTitle > b.orderTitle) { return  1; }
  return 0;
}

/** Order games by their first tag alphabetically (ascending) */
function orderByTags(a: IGameInfo, b: IGameInfo): number {
  if (a.tags < b.tags) { return -1; }
  if (a.tags > b.tags) { return  1; }
  return orderByTitle(a, b);
}

/** Order games by the date-time they were added (ascending) */
function orderByDateAdded(a: IGameInfo, b: IGameInfo): number {
  if (a.dateAdded < b.dateAdded) { return -1; }
  if (a.dateAdded > b.dateAdded) { return  1; }
  return orderByTitle(a, b);
}

/** Order games by their series alphabetically (ascending) */
function orderBySeries(a: IGameInfo, b: IGameInfo): number {
  if (a.series < b.series) { return -1; }
  if (a.series > b.series) { return  1; }
  return orderByTitle(a, b);
}

/** Order games by their platform alphabetically (ascending) */
function orderByPlatform(a: IGameInfo, b: IGameInfo): number {
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
function reverseOrder(compareFn: OrderFn): OrderFn {
  return (a: IGameInfo, b: IGameInfo) => {
    const ret: number = compareFn(a, b);
    if (ret ===  1) { return -1; }
    if (ret === -1) { return  1; }
    return 0;
  };
}

/** Get the order function for a given game order */
function getOrderFunction(orderBy: GameOrderBy, orderReverse: GameOrderReverse): OrderFn {
  let orderFn: OrderFn;
  switch (orderBy) {
    case 'dateAdded': orderFn = orderByDateAdded; break;
    case 'tags':      orderFn = orderByTags;      break;
    case 'platform':  orderFn = orderByPlatform;  break;
    case 'series':    orderFn = orderBySeries;    break;
    case 'developer': orderFn = orderByDeveloper; break;
    case 'publisher': orderFn = orderByPublisher; break;
    default: /* case 'title': */ orderFn = orderByTitle; break;
  }
  if (orderReverse === 'descending') {
    orderFn = reverseOrder(orderFn);
  }
  return orderFn;
}

function filterPlatforms(platforms: string[] | undefined, games: IGameInfo[]): IGameInfo[] {
  if (!platforms) { return games; }
  if (platforms.length === 0) { return []; }
  const filteredGames: IGameInfo[] = [];
  for (let game of games) {
    if (platforms.indexOf(game.platform) !== -1) {
      filteredGames.push(game);
    }
  }
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
function filterPlaylist(playlist: IGamePlaylist | undefined, games: IGameInfo[]): IGameInfo[] {
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
    // Add a placeholder if the game was not found
    if (!gameFound) { filteredGames.push({ ...notFoundGame, id }); }
  }
  return filteredGames;
}

/**
 * Parse a "quick search" into an object.
 * @param text Quick search text to parse.
 */
function parseQuickSearch(text: string): FieldFilter | undefined {
  switch (text.charAt(0)) {
    case '-':
      const filter = parseQuickSearch(text.substring(1));
      if (filter) {
        filter.inverse = !filter.inverse;
        return filter;
      }
      break;
    case '@':
      return { field: 'developer', phrase: text.substring(1), inverse: false };
    case '#':
      return { field: 'tags', phrase: text.substring(1), inverse: false };
    case '!':
      return { field: 'platform', phrase: text.substring(1), inverse: false };
  }
}

/** Return a new array with all games that doesn't match the search removed (if there is a search) */
function filterSearch(text: string, games: IGameInfo[]): IGameInfo[] {
  const filteredGames: Array<IGameInfo | undefined> = games.slice();
  // Parse search text
  const { titleFilters, fieldFilters } = parseSearchText(text);
  // Filter the titles out
  for (let i = filteredGames.length - 1; i >= 0; i--) {
    const game = filteredGames[i];
    if (game) {
      for (let j = titleFilters.length - 1; j >= 0; j--) {
        const filter = titleFilters[j];
        const word = filter.phrase.toLowerCase();
        if (game.title.toLowerCase().indexOf(word)     === -1 &&
            game.developer.toLowerCase().indexOf(word) === -1 &&
            game.publisher.toLowerCase().indexOf(word) === -1 &&
            game.series.toLowerCase().indexOf(word)    === -1) {
          if (!filter.inverse) {
            filteredGames[i] = undefined;
            break;
          }
        } else if (filter.inverse) {
          filteredGames[i] = undefined;
          break;
        }
      }
    }
  }
  // Filter the fields out
  for (let i = filteredGames.length - 1; i >= 0; i--) {
    const game = filteredGames[i];
    if (game) {
      filterBreak:
      for (let j = fieldFilters.length - 1; j >= 0; j--) {
        const filter = fieldFilters[j];
        let gameField;
        // Special filters
        switch (filter.field) {
          case 'has':
          case 'is':
            gameField = game[filter.phrase as keyof typeof game];
            if (!gameField) {
              filteredGames[i] = undefined;
              break filterBreak;
            }
            continue;
          case 'missing':
          case 'not':
            gameField = game[filter.phrase as keyof typeof game];
            if (gameField) {
              filteredGames[i] = undefined;
              break filterBreak;
            }
            continue;
          default:
        }
        // Generic filter
        gameField = game[filter.field as keyof typeof game];
        if (gameField === undefined || gameField.toString().toLowerCase().indexOf(filter.phrase.toLowerCase()) === -1) {
          if (!filter.inverse) {
            filteredGames[i] = undefined;
            break;
          }
        } else if (filter.inverse) {
          filteredGames[i] = undefined;
          break;
        }
      }
    }
  }
  // Remove nulled entries
  const finalFilteredGames: IGameInfo[] = [];
  for (let game of filteredGames) {
    if (game) { finalFilteredGames.push(game); }
  }
  return finalFilteredGames;
}

/**
 * Parse a search query text into an object.
 * @param text Search query text.
 */
function parseSearchText(text: string): ParsedSearch {
  const parsed: ParsedSearch = {
    titleFilters: [],
    fieldFilters: [],
  };
  /**
   * Stick it in regex101 so it's readable, it won't make sense otherwise
   * Special characters are left outside of matches (-!"sonic" matches "sonic")
   * Group 1 - Field name (source, developer...)
   * Group 2 - Field phrase
   * Group 3 - Field phrase (was wrapped in "")
   * Group 4 - Title phrase
   * Group 5 - Title phrase (was wrapped in "")
   */
  const regex = /(?:(\b\w+)?:(?:"(.+?)"|([^\s]+))?(?=\s?)|([^\s\-"!@#][^\s"]+)(?:$|\s)|"([^"]+)")/gu;
  // Parse search string
  let match;
  while (match = regex.exec(text)) { // eslint-disable-line no-cond-assign
    const preIndex = match.index - 1;
    // Field filter matches
    if (match[1]) {
      const field = match[1];
      const phrase = match[2] || match[3];
      let inverse = false;
      if (preIndex >= 0 && text.charAt(preIndex) === '-') { inverse = true; }
      if (field && phrase) {
        parsed.fieldFilters.push({ field, phrase, inverse });
      }
      // Title filter matches
    } else {
      const phrase = match[4] || match[5]; // Group 3 can appear, ignore, more confusing when search is wrong than invalid
      if (phrase) {
        if (preIndex >= 0) {
          // Create temp phrase including preceding specials (e.g --!"sonic" -> --!sonic)
          let i = preIndex;
          let tempPhrase = phrase;
          while (i >= 0) {
            if (text.charAt(i).trim() === '') { break; }
            tempPhrase = text.charAt(i) + tempPhrase;
            i--;
          }
          // Get quick search from created temp phrase (If undefined, there is no quick search)
          const filter = parseQuickSearch(tempPhrase);
          if (filter) { parsed.fieldFilters.push(filter); }
          else { parsed.titleFilters.push({ phrase, inverse: text.charAt(preIndex) === '-' }); }
          continue;
        } else {
          parsed.titleFilters.push({ phrase, inverse: false });
        }
      }
    }
  }
  return parsed;
}

/** Object representation of a parsed search query. */
type ParsedSearch = {
  /** Generic filter to apply to some predetermined field(s). */
  titleFilters: TitleFilter[];
  /** Filters to apply to specific fields. */
  fieldFilters: FieldFilter[];
};

/** A filter that applies some predetermined field(s). */
type TitleFilter = {
  /** Text to search for in the field(s). */
  phrase: string;
  /** If the phrase should be applied inversely. */
  inverse: boolean;
};

/** A filter that applies to a specific field. */
type FieldFilter = {
  /** The field the filter applies to. */
  field: string;
  /** Text to search for in the field. */
  phrase: string;
  /** If the phrase should be applied inversely. */
  inverse: boolean;
};

/** Options for ordering games. */
export type FilterAndOrderGamesOpts = {
  /** Search query to filter games by. */
  search: string;
  /** If extreme games should be included in the result. */
  extreme: boolean;
  /** If broken games should be included in the result. */
  broken: boolean;
  /** Playlist to limit the results to (no playlist limit will be applied if undefined). */
  playlist?: IGamePlaylist;
  /** Platforms to limit the results to (games from all platforms will be filtered if undefined). */
  platforms?: string[];
  /** The field to order the games by. */
  orderBy: GameOrderBy;
  /** The way to order the games. */
  orderReverse: GameOrderReverse;
};

/**
 * Filter and order an array of games.
 * @param games Games to filter and order (this array will NOT be manipulated).
 * @param opts Options to filter and order by.
 */
export function filterAndOrderGames(games: IGameInfo[], opts: FilterAndOrderGamesOpts): IGameInfo[] {
  // @TODO Perhaps the new search system (filterSearch) could be used exclusively, so all the other
  //       filter functions could be removed?
  // Filter games
  const filteredGames = (
    filterSearch(opts.search,
      filterBroken(opts.broken,
        filterExtreme(opts.extreme,
          filterPlatforms(opts.platforms,
            filterPlaylist(opts.playlist, games)
          )))));
  // Order games
  let orderedGames = filteredGames;
  if (!opts.playlist) { // (Don't order if a playlist is selected - kind of a hack to preserve the playlist's order)
    orderedGames = filteredGames.sort(getOrderFunction(opts.orderBy, opts.orderReverse));
  }
  return orderedGames;
}

/**
 * Wrap a search term in quotes if they are needed (to keep it as a single search term).
 * @param text Search term to wrap.
 */
export function wrapSearchTerm(text: string): string {
  return ((text === '') || /\s/.test(text))
    ? `"${text}"`
    : text;
}

/* "Game" used for displaying games that are not found. */
const notFoundGame: IGameInfo = Object.freeze({
  ...GameInfo.create(),
  title: 'Game not found',
  placeholder: true, // (This game is not an "actual" game - it just shows the actual game was not found)
});
