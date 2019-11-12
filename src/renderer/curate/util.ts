import { remote } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import { stripBOM } from '../../shared/Util';
import { setGameMetaDefaults } from '../components/pages/CuratePage';
import { EditCuration, EditAddAppCurationMeta } from '../context/CurationContext';
import { GameMetaDefaults } from './defaultValues';
import { createCurationIndexImage, CurationIndex, CurationIndexImage, fixSlashes } from './importCuration';
import { parseCurationMetaNew, parseCurationMetaOld, ParsedCurationMeta } from './parse';

/** Full path to a Curation's folder
 * @param curation: Curation to fetch folder from
 */
export function getCurationFolder(curation: CurationIndex|EditCuration): string {
  return path.join(window.External.config.fullFlashpointPath, 'Curations', curation.key);
}

/** Full path to a Curation's content folder
 * @param key: Key to use
 */
export function getContentFolderByKey(key: string): string {
  return path.join(window.External.config.fullFlashpointPath, 'Curations', key, 'content');
}

/** Returns a new curation image given a path to an image */
export async function createCurationImage(filePath: string): Promise<CurationIndexImage> {
  const image = createCurationIndexImage();
  image.fileName = path.basename(filePath);
  image.filePath = fixSlashes(filePath);
  try {
    await fs.access(filePath, fs.constants.F_OK);
    image.exists = true;
  } catch (error) {
    image.exists = false;
  }
  return image;
}

/** Returns the parsed meta given the path to a meta file */
export async function readCurationMeta(filePath: string, defaultMetaData?: GameMetaDefaults): Promise<ParsedCurationMeta> {
  const metaFileData = await fs.readFile(filePath);
  if (filePath.toLowerCase().endsWith('.txt')) {
    const parsedMeta = parseCurationMetaOld(stripBOM(metaFileData.toString()));
    setGameMetaDefaults(parsedMeta.game, defaultMetaData);
    return parsedMeta;
  } else if (filePath.toLowerCase().endsWith('.yaml') || filePath.toLowerCase().endsWith('.yml')) {
    const parsedMeta = parseCurationMetaNew(stripBOM(metaFileData.toString()));
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
  window.External.log.addEntry({
    source: 'Curation',
    content: content
  });
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