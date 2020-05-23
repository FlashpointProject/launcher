import { Game } from '@database/entity/Game';
import { GameOrderBy, GameOrderReverse } from '../order/interfaces';

const blacklistFields = ['not', 'no', 'missing'];
const whitelistFields = ['is', 'has'];

/**
 * Parse a search query text into an object.
 * @param text Search query text.
 */
export function parseSearchText(text: string): ParsedSearch {
  const parsed: ParsedSearch = {
    genericBlacklist: [],
    genericWhitelist: [],
    blacklist: [],
    whitelist: [],
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
  const regex = /(?:(\b\w+)?:(?:"(.+?)"|([^\s]+))?(?=\s?)|([^-\s"!@#][^\s"]*)(?:$|\s)|"([^"]+)")/gu;
  // Parse search string
  let match;

  while (match = regex.exec(text)) { // eslint-disable-line no-cond-assign
    console.log(`Match - ${match}`);
    const preIndex = match.index - 1;
    // Field filter matches
    if (match[1]) {
      const field = match[1];
      const phrase = match[2] || match[3];
      let inverse = preIndex >= 0 && text.charAt(preIndex) === '-';
      if (field && phrase) {
        handleFieldFilter(field, phrase, inverse, parsed);
      }
    // Generic filter matches
    } else {
      const phrase = match[4] || match[5]; // Group 3 can appear, ignore, more confusing when search is wrong than invalid
      if (phrase) {
        console.log(phrase);
        if (preIndex >= 0) {
          // Create temp phrase including preceding specials (e.g --!"sonic" -> --!sonic)
          let i = preIndex;
          let tempPhrase = phrase;
          while (i >= 0) {
            if (text.charAt(i).trim() === '') { break; }
            tempPhrase = text.charAt(i) + tempPhrase;
            i--;
          }
          let inverse = preIndex >= 0 && text.charAt(preIndex) === '-';
          // Get quick search from created temp phrase (If undefined, there is no quick search)
          const filter = parseQuickSearch(tempPhrase.substr(1));
          // Process as a field filter
          if (filter) {
            if (inverse) { parsed.blacklist.push(filter); }
            else         { parsed.whitelist.push(filter); }
          }
          // Process as a generic filter
          else {
            if (inverse) { parsed.genericBlacklist.push(phrase); }
            else         { parsed.genericWhitelist.push(phrase); }
          }
          continue;
        } else {
          parsed.genericWhitelist.push(phrase);
        }
      }
    }
  }
  return parsed;
}

/**
 * Parse a "quick search" into an object.
 * @param text Quick search text to parse.
 */
function parseQuickSearch(text: string): FieldFilter | undefined {
  switch (text.charAt(0)) {
    case '@':
      return { field: 'developer', value: text.substring(1) };
    case '#':
      return { field: 'tag', value: text.substring(1) };
    case '!':
      return { field: 'platform', value: text.substring(1) };
  }
}

/** Outputs the correct field filter onto `parsed` */
function handleFieldFilter(field: string, phrase: string, inverse: boolean, parsed: ParsedSearch) {
  if (blacklistFields.includes(field)) {
    parsed.whitelist.push({field: phrase, value: ''});
  } else if (whitelistFields.includes(field)) {
    parsed.blacklist.push({field: phrase, value: ''});
  } else {
    const gameField = field as keyof Game;
    if (inverse) {
      parsed.blacklist.push({field: gameField, value: phrase});
    } else {
      parsed.whitelist.push({field: gameField, value: phrase});
    }
  }
}

/** Object representation of a parsed search query. */
export type ParsedSearch = {
  /** Generic filter to blacklist some predetermined field(s). */
  genericBlacklist: string[];
  /** Generic filter to whitelist some predetermined field(s). */
  genericWhitelist: string[];
  /** Whitelists to apply */
  blacklist: FieldFilter[];
  /** Blacklists to apply */
  whitelist: FieldFilter[];
};

/** A filter that applies to a specific field. */
type FieldFilter = {
  /** The field the filter applies to. */
  field: string;
  /** Value to search for in the field. */
  value: any;
};

/** Options for ordering games. */
export type FilterGameOpts = {
  /** Search query to filter by */
  searchQuery?: ParsedSearch;
  /** Playlist to limit the results to (no playlist limit will be applied if undefined). */
  playlistId?: string;
};

export type OrderGamesOpts = {
  /** The field to order the games by. */
  orderBy: GameOrderBy;
  /** The way to order the games. */
  orderReverse: GameOrderReverse;
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
