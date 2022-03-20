import { Game } from '@database/entity/Game';
import { TagCategory } from '@database/entity/TagCategory';
import { ParsedCurationMeta } from './parse';
import { EditCurationMeta } from './types';

/**
 * Convert game and its additional applications into a raw object representation in the curation format.
 * @param game Game to convert.
 * @param addApps Additional applications of the game.
 */
export function convertGameToCurationMetaFile(game: Game, categories: TagCategory[]): CurationMetaFile {
  const parsed: CurationMetaFile = {};
  const tagCategories = game.tags.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    return cat ? cat.name : 'default';
  });
  // Game meta
  parsed['Title']                = game.title;
  parsed['Alternate Titles']     = game.alternateTitles;
  parsed['Series']               = game.series;
  parsed['Developer']            = game.developer;
  parsed['Publisher']            = game.publisher;
  parsed['Play Mode']            = game.playMode;
  parsed['Release Date']         = game.releaseDate;
  parsed['Version']              = game.version;
  parsed['Languages']            = game.language;
  parsed['Extreme']              = game.extreme ? 'Yes' : 'No';
  parsed['Tags']                 = game.tags.map(t => t.primaryAlias.name).join('; ');
  parsed['Tag Categories']       = tagCategories.join('; ');
  parsed['Source']               = game.source;
  parsed['Platform']             = game.platform;
  parsed['Status']               = game.status;
  parsed['Application Path']     = game.applicationPath;
  parsed['Launch Command']       = game.launchCommand;
  parsed['Game Notes']           = game.notes;
  parsed['Original Description'] = game.originalDescription;
  parsed['Parent Game ID']       = game.parentGameId;
  parsed['Extras']               = game.extras;
  parsed['Extras Name']          = game.extrasName;
  parsed['Message']              = game.message;
  // Return
  return parsed;
}

/**
 * Convert curation and its additional applications into a raw object representation in the curation meta format. (for saving)
 * @param curation Curation to convert.
 * @param addApps Additional applications of the curation.
 */
export function convertEditToCurationMetaFile(curation: EditCurationMeta, categories: TagCategory[]): CurationMetaFile {
  const parsed: CurationMetaFile = {};
  const tagCategories = curation.tags ? curation.tags.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    return cat ? cat.name : 'default';
  }) : [''];
  // Edit curation meta
  parsed['Title']                = curation.title;
  parsed['Alternate Titles']     = curation.alternateTitles;
  parsed['Library']              = curation.library;
  parsed['Series']               = curation.series;
  parsed['Developer']            = curation.developer;
  parsed['Publisher']            = curation.publisher;
  parsed['Play Mode']            = curation.playMode;
  parsed['Release Date']         = curation.releaseDate;
  parsed['Version']              = curation.version;
  parsed['Languages']            = curation.language;
  parsed['Extreme']              = curation.extreme ? 'Yes' : 'No';
  parsed['Tags']                 = curation.tags ? curation.tags.map(t => t.primaryAlias.name).join('; ') : '';
  parsed['Tag Categories']       = tagCategories.join('; ');
  parsed['Source']               = curation.source;
  parsed['Platform']             = curation.platform;
  parsed['Status']               = curation.status;
  parsed['Application Path']     = curation.applicationPath;
  parsed['Launch Command']       = curation.launchCommand;
  parsed['Game Notes']           = curation.notes;
  parsed['Original Description'] = curation.originalDescription;
  parsed['Curation Notes']       = curation.curationNotes;
  parsed['Mount Parameters']     = curation.mountParameters;
  parsed['Parent Game ID']       = curation.parentGameId;
  parsed['Extras']               = curation.extras;
  parsed['Extras Name']          = curation.extrasName;
  parsed['Message']              = curation.message;
  // Return
  return parsed;
}

/**
 * Convert parsed meta and its additional applications into a raw object representation in the curation meta format. (for saving)
 * @param curation Parsed meta to convert.
 * @param addApps Additional applications of the curation.
 */
export function convertParsedToCurationMeta(curation: ParsedCurationMeta, categories: TagCategory[]): CurationMetaFile {
  const parsed: CurationMetaFile = {};
  const tagCategories = curation.game.tags ? curation.game.tags.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    return cat ? cat.name : 'default';
  }) : [''];
  // Edit curation meta
  parsed['Title']                = curation.game.title;
  parsed['Alternate Titles']     = curation.game.alternateTitles;
  parsed['Library']              = curation.game.library;
  parsed['Series']               = curation.game.series;
  parsed['Developer']            = curation.game.developer;
  parsed['Publisher']            = curation.game.publisher;
  parsed['Play Mode']            = curation.game.playMode;
  parsed['Release Date']         = curation.game.releaseDate;
  parsed['Version']              = curation.game.version;
  parsed['Languages']            = curation.game.language;
  parsed['Extreme']              = curation.game.extreme ? 'Yes' : 'No';
  parsed['Tags']                 = curation.game.tags ? curation.game.tags.map(t => t.primaryAlias.name).join('; ') : '';
  parsed['Tag Categories']       = tagCategories.join('; ');
  parsed['Source']               = curation.game.source;
  parsed['Platform']             = curation.game.platform;
  parsed['Status']               = curation.game.status;
  parsed['Application Path']     = curation.game.applicationPath;
  parsed['Launch Command']       = curation.game.launchCommand;
  parsed['Game Notes']           = curation.game.notes;
  parsed['Original Description'] = curation.game.originalDescription;
  parsed['Curation Notes']       = curation.game.curationNotes;
  parsed['Mount Parameters']     = curation.game.mountParameters;
  parsed['Extras']               = curation.game.extras;
  parsed['Extras Name']          = curation.game.extrasName;
  parsed['Message']              = curation.game.message;
  parsed['Parent Game ID']       = curation.game.parentGameId;
  // Return
  return parsed;
}

type CurationMetaFile = {
  'Application Path'?: string;
  'Developer'?: string;
  'Extreme'?: string;
  'Game Notes'?: string;
  'Languages'?: string;
  'Launch Command'?: string;
  'Original Description'?: string;
  'Play Mode'?: string;
  'Platform'?: string;
  'Publisher'?: string;
  'Release Date'?: string;
  'Series'?: string;
  'Source'?: string;
  'Status'?: string;
  'Tags'?: string;
  'Tag Categories'?: string;
  'Title'?: string;
  'Alternate Titles'?: string;
  'Library'?: string;
  'Version'?: string;
  'Curation Notes'?: string;
  'Mount Parameters'?: string;
  'Extras'?: string;
  'Extras Name'?: string;
  'Message'?: string;
  'Parent Game ID'?: string;
};