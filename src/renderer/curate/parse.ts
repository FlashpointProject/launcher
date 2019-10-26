import * as YAML from 'yaml';
import { IObjectParserProp, ObjectParser } from '../../shared/utils/ObjectParser';
import { EditAddAppCurationMeta, EditCurationMeta } from '../context/CurationContext';
import { CurationFormatObject, parseCurationFormat } from './format/parser';
import { CFTokenizer, tokenizeCurationFormat } from './format/tokenizer';

/** Return value type of the parseCurationMeta function. */
export type ParsedCurationMeta = {
  /** Meta data of the game. */
  game: EditCurationMeta;
  /** Meta data of the additional applications. */
  addApps: EditAddAppCurationMeta[];
};

/**
 * Parse a string containing meta for an old style curation
 * @param text A string of curation meta.
 */
export function parseCurationMetaOld(text: string): ParsedCurationMeta {
  // Try parsing the meta text
  let tokens: CFTokenizer.AnyToken[] | undefined = undefined;
  let rawMeta: CurationFormatObject | undefined = undefined;
  tokens = tokenizeCurationFormat(text);
  rawMeta = parseCurationFormat(tokens);
  // Convert the raw meta to a programmer friendly object
  return convertMeta(rawMeta);
}

/**
 * Parse a string containing meta for an new style (YAML) curation
 * @param text A string of curation meta.
 */
export function parseCurationMetaNew(text: string): ParsedCurationMeta {
  // Try parsing yaml file
  const rawMeta = YAML.parse(text);
  // Convert raw meta into a ParsedCurationMeta object
  return convertMeta(rawMeta);
}

/**
 * Convert a "raw" curation meta object into a more programmer friendly object.
 * @param data "Raw" meta object to convert.
 * @param onError Called whenever an error occurs.
 */
export function convertMeta(data: any, onError?: (error: string) => void): ParsedCurationMeta {
  const parsed: ParsedCurationMeta = {
    game: {},
    addApps: [],
  };
  const parser = new ObjectParser({
    input: data,
    onError: onError && (error => onError(`Error while converting Curation Meta: ${error.toString()}`))
  });
  // -- Old curation format --
  parser.prop('Author Notes',         v => parsed.game.authorNotes         = str(v));
  parser.prop('Genre',                v => parsed.game.genre               = str(v));
  parser.prop('Notes',                v => parsed.game.notes               = str(v));
  // -- New curation format --
  // Single value properties
  parser.prop('Application Path',     v => parsed.game.applicationPath     = str(v));
  parser.prop('Curation Notes',       v => parsed.game.authorNotes         = str(v));
  parser.prop('Developer',            v => parsed.game.developer           = str(v));
  parser.prop('Extreme',              v => parsed.game.extreme             = str(v));
  parser.prop('Game Notes',           v => parsed.game.notes               = str(v));
  parser.prop('Genres',               v => parsed.game.genre               = str(v));
  parser.prop('Languages',            v => parsed.game.language            = str(v));
  parser.prop('Launch Command',       v => parsed.game.launchCommand       = str(v));
  parser.prop('Original Description', v => parsed.game.originalDescription = str(v));
  parser.prop('Play Mode',            v => parsed.game.playMode            = str(v));
  parser.prop('Platform',             v => parsed.game.platform            = str(v));
  parser.prop('Publisher',            v => parsed.game.publisher           = str(v));
  parser.prop('Release Date',         v => parsed.game.releaseDate         = str(v));
  parser.prop('Series',               v => parsed.game.series              = str(v));
  parser.prop('Source',               v => parsed.game.source              = str(v));
  parser.prop('Status',               v => parsed.game.status              = str(v));
  parser.prop('Tags',                 v => parsed.game.genre               = str(v));
  parser.prop('Title',                v => parsed.game.title               = str(v));
  parser.prop('Library',              v => parsed.game.library             = str(v).toLowerCase()); // must be lower case
  parser.prop('Version',              v => parsed.game.version             = str(v));
  // property aliases
  parser.prop('Animation Notes',      v => parsed.game.notes               = str(v));
  // Add-apps
  parser.prop('Additional Applications').map((item, label, map) => {
    parsed.addApps.push(convertAddApp(item, label, map[label]));
  });
  // Return
  return parsed;
}

/**
 * Convert a "raw" curation additional application meta object into a more programmer friendly object.
 * @param item Object parser, wrapped around the "raw" add-app meta object to convert.
 * @param label Label of the object.
 */
function convertAddApp(item: IObjectParserProp<any>, label: string | number | symbol, rawValue: any): EditAddAppCurationMeta {
  const addApp: EditAddAppCurationMeta = {};
  const labelStr = str(label);
  switch (labelStr.toLowerCase()) {
    case 'extras': // (Extras add-app)
      addApp.heading = 'Extras';
      addApp.applicationPath = ':extras:';
      addApp.launchCommand = str(rawValue);
      break;
    case 'message': // (Message add-app)
      addApp.heading = 'Message';
      addApp.applicationPath = ':message:';
      addApp.launchCommand = str(rawValue);
      break;
    default: // (Normal add-app)
      addApp.heading = labelStr;
      item.prop('Heading',          v => addApp.heading         = str(v), true);
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
