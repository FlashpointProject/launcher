import * as fs from 'fs';
import * as path from 'path';
import { stripBOM } from '../../shared/Util';
import { setGameMetaDefaults } from '../components/pages/CuratePage';
import { EditCuration } from '../context/CurationContext';
import { uuid } from '../uuid';
import { GameMetaDefaults } from './defaultValues';
import { createCurationIndexImage, CurationIndex, CurationIndexContent, fixSlashes } from './indexCuration';
import { parseCurationMeta } from './parse';

/** Full path to Curation's unique folder
 * @param curation: Curation to fetch folder from
 */
export function getCurationFolder(curation: CurationIndex|EditCuration) {
    return path.join(window.External.config.fullFlashpointPath, 'Curations', curation.key);
}

/** Remove a file from a curation and return it
 * @param file: Relative path to file from curation folder
 * @param curation: Curation to edit
 */
export function removeCurationFile(file: string, curation: EditCuration): EditCuration {
    if (file.startsWith('logo.')) {
        const image = createCurationIndexImage();
        image.exists = false;
        curation.thumbnail = image;
    }
    else if (file.startsWith('ss.')) {
        const image = createCurationIndexImage();
        image.exists = false;
        curation.screenshot = image;
    }
    else if (file.startsWith('content') && file != 'content') {
        const fileName = fixSlashes(file.substr(8));
        const newArray: CurationIndexContent[] = [];
        const index = curation.content.findIndex((item) => item.fileName === fileName);
        if (index >= 0) {
            curation.content.splice(index, 1);
            curation.content = newArray.concat(curation.content);
        }
    }
    return curation;
}

/** Add a file to a curation and return it
 * @param file: Relative path to file from curation folder
 * @param curation: Curation to edit
 * @param defaultMetaData: Default metadata to apply to imported meta.txt files
 */
export function updateCurationFile(file: string, curation: EditCuration, defaultMetaData?: GameMetaDefaults): EditCuration {
    const fullPath = path.join(getCurationFolder(curation), file);
    if (file === 'meta.txt') {
        const metaFileData = fs.readFileSync(fullPath);
        const parsedMeta = parseCurationMeta(stripBOM(metaFileData.toString()));
        curation.meta = parsedMeta.game;
        setGameMetaDefaults(curation.meta, defaultMetaData);
        curation.addApps = [];
        for (let i = 0; i < parsedMeta.addApps.length; i++) {
            const meta = parsedMeta.addApps[i];
            curation.addApps.push({
                key: uuid(),
                meta: meta
            });
        }
    }
    else if (file.startsWith('logo.')) {
        const image = createCurationIndexImage();
        image.exists = true;
        image.fileName = file;
        image.filePath = fixSlashes(fullPath);
        image.version = curation.thumbnail.version + 1;
        curation.thumbnail = image;
    }
    else if (file.startsWith('ss.')) {
        const image = createCurationIndexImage();
        image.exists = true;
        image.fileName = file;
        image.filePath = fixSlashes(fullPath);
        image.version = curation.screenshot.version + 1;
        curation.screenshot = image;
    }
    else if (file.startsWith('content') && file != 'content') {
        const lstat = fs.lstatSync(fullPath);
        let fileName = fixSlashes(file.substr(8));
        if (lstat.isDirectory()) { fileName += '/'; }
        const index = curation.content.findIndex((item) => item.fileName === fileName);
        if (index != -1) { curation.content.splice(index, 1); }
        curation.content = curation.content.concat([{
            fileName: fileName,
            fileSize: lstat.size
        }]);
    }
    return curation;
}