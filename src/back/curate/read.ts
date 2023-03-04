import { CURATION_META_FILENAMES } from '@shared/constants';
import { CurationMeta } from '@shared/curate/types';
import { stripBOM } from '@shared/Util';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import * as TagManager from '../game/TagManager';
import { parseCurationMetaFile, parseCurationMetaOld, ParsedCurationMeta } from './parse';

export async function readCurationMeta(folderPath: string, appPaths: { [platform: string]: string; }): Promise<ParsedCurationMeta | undefined> {
  const defaultMetaData: GameMetaDefaults = {
    // @TODO Make this value not hard-coded (maybe it should be loaded from the preferences file?)
    appPaths: appPaths,
    language: 'en',
    platform: 'Flash',
    playMode: 'Single Player',
    status:   'Playable',
    library:  'Arcade'.toLowerCase() // must be lower case
  };

  const folderName = path.basename(folderPath);

  try {
    const stats = await fs.promises.lstat(folderPath);
    if (!stats.isDirectory()) { return; }

    // Find meta file(s)
    const metaNames: string[] = [];
    const fileNames = await fs.promises.readdir(folderPath);
    for (const fileName of fileNames) {
      if (CURATION_META_FILENAMES.indexOf(fileName.toLowerCase()) !== -1) {
        metaNames.push(fileName);
      }
    }

    metaNames.sort(); // Alphabetical order

    if (metaNames.length < 1) { log.warn('Launcher', `No meta file was found for curation "${folderName}"`); return; }
    if (metaNames.length > 1) { log.warn('Launcher', `Multiple meta files was found for curation "${folderName}" (Meta names: ${metaNames.map(m => `"${m}"`).join(', ')})`); return; }

    // Parse meta file(s) (the first file that parses is the one we stick with)
    let parsedMeta: ParsedCurationMeta | undefined;
    for (const metaName of metaNames) {
      const lcMetaName = metaName.toLowerCase();

      let fileType: 'old' | 'new' | undefined;

      if (lcMetaName.endsWith('.txt')) {
        fileType = 'old';
      } else if (lcMetaName.endsWith('.yaml') || lcMetaName.endsWith('.yml')) {
        fileType = 'new';
      }

      if (fileType) {
        const fileData = await fs.promises.readFile(path.join(folderPath, metaName));
        let parsed: ParsedCurationMeta;
        if (fileType === 'old') {
          parsed = await parseCurationMetaOld(stripBOM(fileData.toString()));
          // @TODO Resave as new file
        } else {
          parsed = await parseCurationMetaFile(YAML.parse(stripBOM(fileData.toString())));
        }
        await setGameMetaDefaults(parsed.game, defaultMetaData);
        parsedMeta = parsed;
      } else {
        log.error('Launcher', `BUG! Tried to parse a curation's meta file with an unsupported file extension! (curation: "${folderName}", meta file: "${metaName}")`);
      }
    }

    if (parsedMeta === undefined) { log.warn('Launcher', `No meta file was succesfully parsed from curation "${folderName}"`); return; }

    return parsedMeta;
  } catch (error: any) {
    log.error('Launcher', `Failed to load curation "${folderName}"\n${error.toString()}`);
  }
}

type GameMetaDefaults = {
  /** Default application paths (ordered after each platform). */
  appPaths: { [platform: string]: string; };
  language: string;
  platform: string;
  playMode: string;
  status: string;
  library: string;
}

async function setGameMetaDefaults(meta: CurationMeta, defaults?: GameMetaDefaults): Promise<void> {
  if (defaults) {
    const platformDefault = await TagManager.findPlatform(defaults.platform);
    // Set default meta values
    if (!meta.language)  { meta.language = defaults.language; }
    if (!meta.playMode)  { meta.playMode = defaults.playMode; }
    if (!meta.status)    { meta.status   = defaults.status;   }
    if (!meta.platforms) { meta.platforms = platformDefault ? [platformDefault]: []; }
    if (!meta.library)   { meta.library  = defaults.library;  }
    // Set default application path
    // (Note: This has to be set after the default platform)
    if (!meta.applicationPath) {
      meta.applicationPath = platformDefault ? defaults.appPaths[platformDefault.primaryAlias.name] || '' : '';
    }
  }
}
