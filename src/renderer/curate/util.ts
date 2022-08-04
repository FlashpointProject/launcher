import * as remote from '@electron/remote';
import { GameMetaDefaults } from '@shared/curate/defaultValues';
import { parseCurationMetaNew, parseCurationMetaOld, ParsedCurationMeta } from '@shared/curate/parse';
import { CurationIndexImage, EditCurationMeta } from '@shared/curate/OLD_types';
import { stripBOM } from '@shared/Util';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as YAML from 'yaml';
import { createCurationIndexImage } from './importCuration';

const access = promisify(fs.access);
const readFile = promisify(fs.readFile);

/** Returns a new curation image given a path to an image */
export async function createCurationImage(filePath: string): Promise<CurationIndexImage> {
  const image = createCurationIndexImage();
  image.fileName = path.basename(filePath);
  image.filePath = filePath;
  try {
    await access(filePath, fs.constants.F_OK);
    image.exists = true;
  } catch (error) {
    image.exists = false;
  }
  return image;
}

/** Returns the parsed meta given the path to a meta file */
export async function readCurationMeta(filePath: string, defaultMetaData?: GameMetaDefaults): Promise<ParsedCurationMeta> {
  const metaFileData = await readFile(filePath);
  if (filePath.toLowerCase().endsWith('.txt')) {
    const parsedMeta = await parseCurationMetaOld(stripBOM(metaFileData.toString()));
    setGameMetaDefaults(parsedMeta.game, defaultMetaData);
    return parsedMeta;
  } else if (filePath.toLowerCase().endsWith('.yaml') || filePath.toLowerCase().endsWith('.yml')) {
    // Will fail to call during parseCurationMetaNew for some reason?
    const rawMeta = YAML.parse(stripBOM(metaFileData.toString()));
    const parsedMeta = await parseCurationMetaNew(rawMeta);
    setGameMetaDefaults(parsedMeta.game, defaultMetaData);
    return parsedMeta;
  } else {
    throw new Error('Unsupported Meta File Format. Must be .txt (old style) or .yaml/.yml (new style)');
  }
}

/** Warning box with given message*/
export function showWarningBox(str: string): void {
  remote.dialog.showMessageBox({
    type: 'warning',
    message: str,
    buttons: ['OK']
  });
}

/** Log function for the 'Curation' heading */
export function curationLog(content: string): void {
  log.info('Curation', content);
}

/**
 * Set the default values of a game's meta (if they are missing).
 * @param meta Meta to set values of.
 * @param defaults Container of default values.
 */
export function setGameMetaDefaults(meta: EditCurationMeta, defaults?: GameMetaDefaults): void {
  if (defaults) {
    // Set default meta values
    if (!meta.language) { meta.language = defaults.language; }
    if (!meta.playMode) { meta.playMode = defaults.playMode; }
    if (!meta.status)   { meta.status   = defaults.status;   }
    if (!meta.platform) { meta.platform = defaults.platform; }
    if (!meta.library)  { meta.library  = defaults.library;  }
    // Set default application path
    // (Note: This has to be set after the default platform)
    if (!meta.applicationPath) {
      meta.applicationPath = defaults.appPaths[meta.platform || ''] || '';
    }
  }
}
