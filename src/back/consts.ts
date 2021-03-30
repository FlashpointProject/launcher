import * as path from 'path';

const CURATIONS_FOLDER = 'Curations'; // @TODO Replace this with a configurable path (in the config, just like the other paths)
export const CURATIONS_FOLDER_EXTRACTING = path.join(CURATIONS_FOLDER, 'Extracting');
export const CURATIONS_FOLDER_LOADED = path.join(CURATIONS_FOLDER, 'Working');

/** Valid curation meta filenames (case insensitive). */
export const CURATION_META_FILENAMES = ['meta.txt', 'meta.yaml', 'meta.yml'];


