import { EditCurationMeta, EditAddAppCurationMeta } from '../context/CurationContext';
import { parseCurationFormat, CurationFormatObject } from './format/parser';
import { tokenizeCurationFormat, CFTokenizer } from './format/tokenizer';
import { ObjectParser, IObjectParserProp } from '../../shared/utils/ObjectParser';
import { GameParser } from '../../shared/game/GameParser';

/** Return value type of the parseCurationMeta function. */
export type ParsedCurationMeta = {
  /** Meta data of the game. */
  game: EditCurationMeta;
  /** Meta data of the additional applications. */
  addApps: EditAddAppCurationMeta[];
};

/**
 * Parse a string containing meta for a curation (using either the new or old Curation Format).
 * @param text A string of curation meta.
 */
export function parseCurationMeta(text: string): ParsedCurationMeta {
  // Try parsing the meta text
  let tokens: CFTokenizer.AnyToken[] | undefined = undefined;
  let rawMeta: CurationFormatObject | undefined = undefined;
  try {
    tokens = tokenizeCurationFormat(text);
    rawMeta = parseCurationFormat(tokens);
  }
  catch (error) {
    console.error(
      'Failed to parse curation meta.\n\n',
      'Tokens:', tokens,
      '\n\n',
      error,
    );
    rawMeta = {};
  }
  // Convert the raw meta to a programmer friendly object
  return convertMeta(rawMeta);
}

/**
 * Convert a "raw" curation meta object into a more programmer friendly object.
 * @param data "Raw" meta object to convert.
 * @param onError Called whenever an error occurs.
 */
function convertMeta(data: any, onError?: (error: string) => void): ParsedCurationMeta {
  const parsed: ParsedCurationMeta = {
    game: {},
    addApps: [],
  }
  const parser = new ObjectParser({
    input: data,
    onError: onError && (error => onError(`Error while converting Curation Meta: ${error.toString()}`))
  });
  // -- Old curation format --
  parser.prop('Notes',                v => parsed.game.notes               = str(v));
  parser.prop('Genre',                v => parsed.game.genre               = str(v));
  parser.prop('Author Notes',         v => parsed.game.authorNotes         = str(v));
  // -- New curation format --
  // Single value properties
  parser.prop('Application Path',     v => parsed.game.applicationPath     = str(v));
  parser.prop('Developer',            v => parsed.game.developer           = str(v));
  parser.prop('Extreme',              v => parsed.game.extreme             = str(v));
  parser.prop('Launch Command',       v => parsed.game.launchCommand       = str(v));
  parser.prop('Game Notes',           v => parsed.game.notes               = str(v));
  parser.prop('Platform',             v => parsed.game.platform            = str(v));
  parser.prop('Publisher',            v => parsed.game.publisher           = str(v));
  parser.prop('Series',               v => parsed.game.series              = str(v));
  parser.prop('Source',               v => parsed.game.source              = str(v));
  parser.prop('Status',               v => parsed.game.status              = str(v));
  parser.prop('Title',                v => parsed.game.title               = str(v));
  parser.prop('Curation Notes',       v => parsed.game.authorNotes         = str(v));
  parser.prop('Play Mode',            v => parsed.game.playMode            = str(v));
  parser.prop('Release Date',         v => parsed.game.releaseDate         = str(v));
  parser.prop('Version',              v => parsed.game.version             = str(v));
  parser.prop('Original Description', v => parsed.game.originalDescription = str(v));
  // Genres
  const genres: string[] = [];
  parser.prop('Genres').arrayRaw(v => genres.push(str(v)));
  if (genres.length > 0) { parsed.game.genre = GameParser.joinFieldValue(genres); }
  // Languages
  const language: string[] = [];
  parser.prop('Language').arrayRaw(v => language.push(str(v)));
  if (language.length > 0) { parsed.game.language = GameParser.joinFieldValue(language); }
  // Add-apps
  parser.prop('Additional Applications').map((item, label) => {
    parsed.addApps.push(convertAddApp(item, label));
  });
  // Return
  return parsed;
}

/**
 * Convert a "raw" curation additional application meta object into a more programmer friendly object.
 * @param item Object parser, wrapped around the "raw" add-app meta object to convert.
 * @param label Label of the object.
 */
function convertAddApp(item: IObjectParserProp<any>, label: string | number | symbol): EditAddAppCurationMeta {
  const addApp: EditAddAppCurationMeta = {};
  switch (str(label).toLowerCase()) {
    case 'extras': // (Extras add-app)
      addApp.heading = 'Extras';
      addApp.applicationPath = ':extras:';
      addApp.launchCommand = str(item.value);
      break;
    case 'message': // (Message add-app)
      addApp.heading = 'Message';
      addApp.applicationPath = ':message:';
      addApp.launchCommand = str(item.value);
      break;
    default: // (Normal add-app)
      item.prop('Heading',          v => addApp.heading         = str(v));
      item.prop('Application Path', v => addApp.applicationPath = str(v));
      item.prop('Launch Command',   v => addApp.launchCommand   = str(v));
      break;
  }
  return addApp;
}

/**
 * Convert any value to a string.
 * @param value Value to convert.
 */
function str(value: any): string {
  if (value === undefined || value === null) {
    return '';
  } else {
    return value + '';
  }
}
