import { Coerce } from '@shared/utils/Coerce';
import * as YAML from 'yaml';
import { IObjectParserProp, ObjectParser } from '../utils/ObjectParser';
import { CurationFormatObject, parseCurationFormat } from './format/parser';
import { CFTokenizer, tokenizeCurationFormat } from './format/tokenizer';
import { EditAddAppCurationMeta, EditCurationMeta } from './types';
import { getTagsFromStr } from './util';

const { str } = Coerce;

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
export async function parseCurationMetaOld(text: string): Promise<ParsedCurationMeta> {
  // Try parsing the meta text
  let tokens: CFTokenizer.AnyToken[] | undefined = undefined;
  let rawMeta: CurationFormatObject | undefined = undefined;
  tokens = tokenizeCurationFormat(text);
  rawMeta = parseCurationFormat(tokens);
  // Convert the raw meta to a programmer friendly object
  return await convertMeta(rawMeta);
}

/**
 * Parse a string containing meta for an new style (YAML) curation
 * @param text A string of curation meta.
 */
export async function parseCurationMetaNew(rawMeta: any): Promise<ParsedCurationMeta> {
  // Try parsing yaml file
  // Convert raw meta into a ParsedCurationMeta object
  return await convertMeta(rawMeta);
}

/**
 * Convert a "raw" curation meta object into a more programmer friendly object.
 * @param data "Raw" meta object to convert.
 * @param onError Called whenever an error occurs.
 */
export async function convertMeta(data: any, onError?: (error: string) => void): Promise<ParsedCurationMeta> {
  // Default parsed data
  const parsed: ParsedCurationMeta = {
    game: {},
    addApps: [],
  };
  // Make sure it exists before calling Object.keys
  if (!data) {
    console.log('Meta empty');
    return parsed;
  }
  // Treat field names case-insensitively
  const lowerCaseData: any = {};
  for (let key of Object.keys(data)) {
    if (data[key]) {
      // Don't copy undefined data - will convert to string, bad!
      lowerCaseData[key.toLowerCase()] = data[key];
    }
  }
  const parser = new ObjectParser({
    input: lowerCaseData,
    onError: onError && (e => onError(`Error while converting Curation Meta: ${e.toString()}`))
  });
  // -- Old curation format --
  parser.prop('author notes',         v => parsed.game.curationNotes       = str(v));
  parser.prop('notes',                v => parsed.game.notes               = str(v));
  // -- New curation format --
  // Single value properties
  parser.prop('application path',     v => parsed.game.applicationPath     = str(v));
  parser.prop('curation notes',       v => parsed.game.curationNotes       = str(v));
  parser.prop('developer',            v => parsed.game.developer           = arrayStr(v));
  parser.prop('extreme',              v => parsed.game.extreme             = str(v));
  parser.prop('game notes',           v => parsed.game.notes               = str(v));
  parser.prop('languages',            v => parsed.game.language            = str(v));
  parser.prop('launch command',       v => parsed.game.launchCommand       = str(v));
  parser.prop('original description', v => parsed.game.originalDescription = str(v));
  parser.prop('play mode',            v => parsed.game.playMode            = arrayStr(v));
  parser.prop('platform',             v => parsed.game.platform            = str(v));
  parser.prop('publisher',            v => parsed.game.publisher           = arrayStr(v));
  parser.prop('release date',         v => parsed.game.releaseDate         = str(v));
  parser.prop('series',               v => parsed.game.series              = str(v));
  parser.prop('source',               v => parsed.game.source              = str(v));
  parser.prop('status',               v => parsed.game.status              = str(v));
  parser.prop('title',                v => parsed.game.title               = str(v));
  parser.prop('alternate titles',     v => parsed.game.alternateTitles     = arrayStr(v));
  parser.prop('version',              v => parsed.game.version             = str(v));
  parser.prop('library',              v => parsed.game.library             = str(v).toLowerCase()); // must be lower case
  if (lowerCaseData.genre)  { parsed.game.tags = await getTagsFromStr(str(lowerCaseData.genre), str(lowerCaseData['tag categories']));  }
  if (lowerCaseData.genres) { parsed.game.tags = await getTagsFromStr(str(lowerCaseData.genres), str(lowerCaseData['tag categories'])); }
  if (lowerCaseData.tags)   { parsed.game.tags = await getTagsFromStr(str(lowerCaseData.tags), str(lowerCaseData['tag categories']));   }
  // property aliases
  parser.prop('animation notes',      v => parsed.game.notes               = str(v));
  // Add-apps
  parser.prop('additional applications').map((item, label, map) => {
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
      return generateExtrasAddApp(str(rawValue));
    case 'message': // (Message add-app)
      return generateMessageAddApp(str(rawValue));
    default: // (Normal add-app)
      addApp.heading = labelStr;
      item.prop('Heading',          v => addApp.heading         = str(v), true);
      item.prop('Application Path', v => addApp.applicationPath = str(v));
      item.prop('Launch Command',   v => addApp.launchCommand   = str(v));
      break;
  }
  return addApp;
}

// Coerce an object into a sensible string
function arrayStr(rawStr: any): string {
  if (Array.isArray(rawStr)) {
    // Convert lists to ; seperated strings
    return rawStr.join('; ');
  }
  return str(rawStr);
}

export function generateExtrasAddApp(folderName: string) : EditAddAppCurationMeta {
  return {
    heading: 'Extras',
    applicationPath: ':extras:',
    launchCommand: folderName
  };
}

export function generateMessageAddApp(message: string) : EditAddAppCurationMeta {
  return {
    heading: 'Message',
    applicationPath: ':message:',
    launchCommand: message
  };
}