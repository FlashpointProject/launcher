import { LoadedCuration } from '@shared/curate/types';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';

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
  'Additional Applications'?: CurationFormatAddApps;
  'Curation Notes'?: string;
  'UUID'?: string;
  'Group'?: string;
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


export async function saveCuration(fullCurationPath: string, curation: LoadedCuration): Promise<void> {
  const metaPath = path.join(fullCurationPath, 'meta.yaml');
  const meta = YAML.stringify(convertEditToCurationMetaFile(curation));
  await fs.promises.writeFile(metaPath, meta);
}

function convertEditToCurationMetaFile(curation: LoadedCuration): CurationMetaFile {
  const parsed: CurationMetaFile = {};
  const tagCategories = curation.game.tags ? curation.game.tags.map(t => {
    // @TODO Save Tag Category names
    return 'default';
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
  parsed['UUID']                 = curation.uuid;
  parsed['Group']                = curation.group;
  // Add-apps meta
  const parsedAddApps: CurationFormatAddApps = {};
  const addApps = curation.addApps;
  if (addApps) {
    for (let i = 0; i < addApps.length; i++) {
      const addApp = addApps[i];
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
