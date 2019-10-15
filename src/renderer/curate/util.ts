import * as fs from 'fs-extra';
import * as path from 'path';
import { stripBOM } from '../../shared/Util';
import { setGameMetaDefaults } from '../components/pages/CuratePage';
import { EditCuration } from '../context/CurationContext';
import { GameMetaDefaults } from './defaultValues';
import { createCurationIndexImage, CurationIndex, CurationIndexImage, fixSlashes } from './importCuration';
import { parseCurationMeta, ParsedCurationMeta } from './parse';

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
  const parsedMeta = parseCurationMeta(stripBOM(metaFileData.toString()));
  setGameMetaDefaults(parsedMeta.game, defaultMetaData);
  return parsedMeta;
}

/** Log function for the 'Curation' heading */
export function curationLog(content: string): void {
  window.External.log.addEntry({
    source: 'Curation',
    content: content
  });
}