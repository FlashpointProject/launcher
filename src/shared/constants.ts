import * as path from 'path';

/** Title of the main window. */
export const APP_TITLE = 'Flashpoint Launcher';

// Flashpoint libraries
export const ARCADE = 'arcade';
export const THEATRE = 'theatre';

// Names of the image sub-folders
export const LOGOS = 'Logos';
export const SCREENSHOTS = 'Screenshots';

/** Games to fetch in each block */
export const VIEW_PAGE_SIZE = 200;

const CURATIONS_FOLDER = 'Curations'; // @TODO Replace this with a configurable path (in the config, just like the other paths)
export const CURATIONS_FOLDER_EXTRACTING = path.join(CURATIONS_FOLDER, 'Extracting');
export const CURATIONS_FOLDER_WORKING = path.join(CURATIONS_FOLDER, 'Working');
export const CURATIONS_FOLDER_TEMP = path.join(CURATIONS_FOLDER, '.temp');
export const CURATIONS_FOLDER_EXPORTED = path.join(CURATIONS_FOLDER, 'Exported');


/** Valid curation meta filenames (case insensitive). */
export const CURATION_META_FILENAMES = ['meta.txt', 'meta.yaml', 'meta.yml'];
