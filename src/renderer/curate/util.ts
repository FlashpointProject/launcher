import { AddLogData, BackIn } from '@shared/back/types';
import { GameMetaDefaults } from '@shared/curate/defaultValues';
import { parseCurationMetaNew, parseCurationMetaOld, ParsedCurationMeta } from '@shared/curate/parse';
import { CurationIndexImage } from '@shared/curate/types';
import { stripBOM } from '@shared/Util';
import { remote } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as YAML from 'yaml';
import { setGameMetaDefaults } from '../components/pages/CuratePage';
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
  window.Shared.back.send<any, AddLogData>(BackIn.ADD_LOG, {
    source: 'Curation',
    content: content
  });
}
