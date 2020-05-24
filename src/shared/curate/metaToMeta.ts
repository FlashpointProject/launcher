import { Game } from '@database/entity/Game';
import { TagCategory } from '@database/entity/TagCategory';
import { ParsedCurationMeta } from './parse';
import { EditAddAppCuration, EditCurationMeta } from './types';

/**
 * Convert game and its additional applications into a raw object representation in the curation format.
 * @param game Game to convert.
 * @param addApps Additional applications of the game.
 */
export function convertToCurationMeta(game: Game, categories: TagCategory[]): CurationFormatMeta {
  const parsed: CurationFormatMeta = {};
  const tagCategories = game.tags.map(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    return cat ? cat.name : 'default';
  });
  // Game meta
  parsed['Title']                = game.title;
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
  // Add-apps meta
  const parsedAddApps: CurationFormatAddApps = {};
  for (let i = 0; i < game.addApps.length; i++) {
    const addApp = game.addApps[i];
    if (addApp.applicationPath === ':extras:') {
      parsedAddApps['Extras'] = addApp.launchCommand;
    } else if (addApp.applicationPath === ':message:') {
      parsedAddApps['Message'] = addApp.launchCommand;
    } else {
      let heading = addApp.name;
      // Check if the property name is already in use
      if (parsedAddApps[heading] !== undefined) {
        // Look for an available name (by appending a number after it)
        let index = 2;
        while (true) {
          const testHeading = `${heading} (${index})`;
          if (parsedAddApps[testHeading] === undefined) {
            heading = testHeading;
            break;
          }
          index += 1;
        }
      }
      // Add add-app
      parsedAddApps[heading] = {
        'Heading': addApp.name,
        'Application Path': addApp.applicationPath,
        'Launch Command': addApp.launchCommand,
      };
    }
  }
  parsed['Additional Applications'] = parsedAddApps;
  // Return
  return parsed;
}

/**
 * Convert curation and its additional applications into a raw object representation in the curation meta format. (for saving)
 * @param curation Curation to convert.
 * @param addApps Additional applications of the curation.
 */
export function convertEditToCurationMeta(curation: EditCurationMeta, categories: TagCategory[], addApps?: EditAddAppCuration[]): CurationFormatMeta {
  const parsed: CurationFormatMeta = {};
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
  parsed['Extreme']              = curation.extreme;
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
  // Add-apps meta
  const parsedAddApps: CurationFormatAddApps = {};
  if (addApps) {
    for (let i = 0; i < addApps.length; i++) {
      const addApp = addApps[i].meta;
      if (addApp.applicationPath === ':extras:') {
        parsedAddApps['Extras'] = addApp.launchCommand;
      } else if (addApp.applicationPath === ':message:') {
        parsedAddApps['Message'] = addApp.launchCommand;
      } else {
        let heading = addApp.heading;
        if (heading) {
          // Check if the property name is already in use
          if (parsedAddApps[heading] !== undefined) {
            // Look for an available name (by appending a number after it)
            let index = 2;
            while (true) {
              const testHeading = `${heading} (${index})`;
              if (parsedAddApps[testHeading] === undefined) {
                heading = testHeading;
                break;
              }
              index += 1;
            }
          }
          // Add add-app
          parsedAddApps[heading] = {
            'Heading': addApp.heading,
            'Application Path': addApp.applicationPath,
            'Launch Command': addApp.launchCommand,
          };
        }
      }
    }
  }
  parsed['Additional Applications'] = parsedAddApps;
  // Return
  return parsed;
}

/**
 * Convert parsed meta and its additional applications into a raw object representation in the curation meta format. (for saving)
 * @param curation Parsed meta to convert.
 * @param addApps Additional applications of the curation.
 */
export function convertParsedToCurationMeta(curation: ParsedCurationMeta, categories: TagCategory[]): CurationFormatMeta {
  const parsed: CurationFormatMeta = {};
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
  parsed['Extreme']              = curation.game.extreme;
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
  // Add-apps meta
  const parsedAddApps: CurationFormatAddApps = {};
  if (curation.addApps) {
    for (let i = 0; i < curation.addApps.length; i++) {
      const addApp = curation.addApps[i];
      if (addApp.applicationPath === ':extras:') {
        parsedAddApps['Extras'] = addApp.launchCommand;
      } else if (addApp.applicationPath === ':message:') {
        parsedAddApps['Message'] = addApp.launchCommand;
      } else {
        let heading = addApp.heading;
        if (heading) {
          // Check if the property name is already in use
          if (parsedAddApps[heading] !== undefined) {
            // Look for an available name (by appending a number after it)
            let index = 2;
            while (true) {
              const testHeading = `${heading} (${index})`;
              if (parsedAddApps[testHeading] === undefined) {
                heading = testHeading;
                break;
              }
              index += 1;
            }
          }
          // Add add-app
          parsedAddApps[heading] = {
            'Heading': addApp.heading,
            'Application Path': addApp.applicationPath,
            'Launch Command': addApp.launchCommand,
          };
        }
      }
    }
  }
  parsed['Additional Applications'] = parsedAddApps;
  // Return
  return parsed;
}

type CurationFormatMeta = {
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
  'Additional Applications'?: CurationFormatAddApps;
  'Curation Notes'?: string;
};

type CurationFormatAddApps = {
  [key: string]: CurationFormatAddApp;
} & {
  'Extras'?: string;
  'Message'?: string;
};

type CurationFormatAddApp = {
  'Application Path'?: string;
  'Heading'?: string;
  'Launch Command'?: string;
};
