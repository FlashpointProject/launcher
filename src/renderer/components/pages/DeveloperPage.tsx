import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
import * as uuidValidate from 'uuid-validate';
import { IGameInfo } from '../../../shared/game/interfaces';
import { removeFileExtension } from '../../../shared/Util';
import { GameImageCollection } from '../../image/GameImageCollection';
import { CentralState } from '../../interfaces';
import { IGamePlaylist, IGamePlaylistEntry } from '../../playlist/interfaces';
import { validateSemiUUID } from '../../uuid';
import { LogData } from '../LogData';
import { SimpleButton } from '../SimpleButton';
import { WithLibraryProps } from '../../containers/withLibrary';
import { promisify } from 'util';
import { formatImageFilename, organizeImageFilepaths } from '../../image/util';
import { ImageFolderCache } from '../../image/ImageFolderCache';
import { GameCollection } from '../../../shared/game/GameCollection';
import { LaunchboxData } from '../../LaunchboxData';
import { GameLauncher } from '../../GameLauncher';

const rename = promisify(fs.rename);
const exists = promisify(fs.exists);
const mkdir  = promisify(fs.mkdir);

type OwnProps = {
  /** Semi-global prop. */
  central: CentralState;
  /** Collection to get game images from. */
  gameImages: GameImageCollection;
};

type DeveloperPageProps = OwnProps & WithLibraryProps;

type DeveloperPageState = {
  /** Text of the log. */
  text: string;
};

/**
 * Page made for developers or advanced users only.
 * It has various "tools" that the user can run to gather information about the current Flashpoint folders data (games, playlists, images etc.), or edit that data on mass.
 * New tools are added as needed.
 */
export class DeveloperPage extends React.Component<DeveloperPageProps, DeveloperPageState> {
  constructor(props: DeveloperPageProps) {
    super(props);
    this.state = {
      text: '',
    };
  }

  render() {
    const { text } = this.state;
    return (
      <div className='developer-page simple-scroll'>
        <div className='developer-page__inner'>
          <h1 className='developer-page__title'>Developer</h1>
          This is where all the useful developer tools will go.
          <div className='developer-page__buttons'>
            {/* Top Buttons */}
            <SimpleButton
              value='Check Missing Images'
              title='List all games without a thumbnail or screenshot.'
              onClick={this.onCheckMissingImagesClick} />
            <SimpleButton
              value='Check Game IDs'
              title='List all games with duplicate or invalid IDs'
              onClick={this.onCheckGameIDsClick} />
            <SimpleButton
              value='Check Game Titles'
              title='List all games with duplicate titles'
              onClick={this.onCheckGameNamesClick} />
            <SimpleButton
              value='Check Game Fields'
              title='List all games with empty fields (of the fields that should not be empty)'
              onClick={this.onCheckGameFieldsClick} />
            <SimpleButton
              value='Check Playlists'
              title='List all playlists with duplicate or invalid IDs, or that has game entries with missing, invalid or duplicate IDs'
              onClick={this.onCheckPlaylistsClick} />
            <SimpleButton
              value='Check Game File Location'
              title='List all games with launch commands that can not be parsed into file paths (this is related to the "Open File Location" function, not launching the game).'
              onClick={this.onCheckFileLocation} />
            {/* Log */}
            <LogData
              className='developer-page__log'
              logData={text} />
            {/* Bottom Buttons */}
            <SimpleButton
              value='Rename Images (Title => ID)'
              title='Find all game images with the games title in their filename, and rename it to use its ID instead.'
              onClick={this.onRenameImagesTitleToIDClick} />
            <SimpleButton
              value='Rename Images (ID => Title)'
              title='Find all game images with the games ID in their filename, and rename it to use its title instead.'
              onClick={this.onRenameImagesIDToTitleClick} />
            <SimpleButton
              value='Create Missing Folders'
              title='Find all missing folders in the Flashpoint folder structure and create them.'
              onClick={this.onCreateMissingFoldersClick} />
          </div>
        </div>
      </div>
    );
  }

  onCheckMissingImagesClick = (): void => {
    const games = this.props.central.games.collection.games;
    const gameImages = this.props.gameImages;
    this.setState({ text: checkMissingGameImages(games, gameImages) });
  }

  onCheckGameIDsClick = (): void => {
    const games = this.props.central.games.collection.games;
    this.setState({ text: checkGameIDs(games) });
  }

  onCheckGameNamesClick = (): void => {
    const games = this.props.central.games.collection.games;
    this.setState({ text: checkGameTitles(games) });
  }

  onCheckGameFieldsClick = (): void => {
    const games = this.props.central.games.collection.games;
    this.setState({ text: checkGameEmptyFields(games) });
  }

  onCheckPlaylistsClick = (): void => {
    const playlists = this.props.central.playlists.playlists;
    const games = this.props.central.games.collection.games;
    this.setState({ text: checkPlaylists(playlists, games) });
  }

  onCheckFileLocation = (): void => {
    const games = this.props.central.games.collection.games;
    this.setState({ text: checkFileLocation(games) });
  }

  onRenameImagesTitleToIDClick = (): void => {
    this.setState({ text: 'Please be patient. This may take a few seconds (or minutes)...' });
    setTimeout(async () => {
      const games = this.props.central.games.collection.games;
      const gameImages = this.props.gameImages;
      this.setState({ text: await renameImagesToIDs(games, gameImages) });
    }, 0);
  }

  onRenameImagesIDToTitleClick = (): void => {
    this.setState({ text: 'Please be patient. This may take a few seconds (or minutes)...' });
    setTimeout(async () => {
      const games = this.props.central.games.collection.games;
      const gameImages = this.props.gameImages;
      this.setState({ text: await renameImagesToTitles(games, gameImages) });
    }, 0);
  }

  onCreateMissingFoldersClick = (): void => {
    setTimeout(async () => {
      const collection = this.props.central.games.collection;
      this.setState({ text: await createMissingFolders(collection) });
    }, 0);
  }
}

function checkMissingGameImages(games: IGameInfo[], gameImages: GameImageCollection): string {
  const timeStart = Date.now(); // Start timing
  // Find all games with missing thumbnails and screenshots
  const missingThumbnails:  IGameInfo[] = games.filter(game =>
    gameImages.getThumbnailPath(game) === undefined
  );
  const missingScreenshots: IGameInfo[] = games.filter(game => 
    gameImages.getScreenshotPath(game) === undefined
  );
  const timeEnd = Date.now(); // End timing
  // Write log message
  let text = '';
  text += `Checked games for missing images (in ${timeEnd - timeStart}ms)\n`;
  text += '\n';
  text += `Games with missing thumbnails (${missingThumbnails.length}):\n`;
  missingThumbnails.forEach((game) => { text += `"${game.title}" (ID: ${game.id})\n`; });
  text += '\n';
  text += `Games with missing screenshots (${missingScreenshots.length}):\n`;
  missingScreenshots.forEach((game) => { text += `"${game.title}" (ID: ${game.id})\n`; });
  text += '\n';
  return text;
}

function checkGameIDs(games: IGameInfo[]): string {
  const timeStart = Date.now(); // Start timing
  const dupes = checkDupes(games, 'id'); // Find all games with duplicate IDs
  const invalidIDs: IGameInfo[] = games.filter(game => !validateSemiUUID(game.id)); // Find all games with invalid IDs
  const timeEnd = Date.now(); // End timing
  // Write log message
  let text = '';
  text += `Checked games for duplicate and invalid IDs (in ${timeEnd - timeStart}ms)\n`;
  text += '\n';
  text += `Games with duplicate IDs (${Object.keys(dupes).length}):\n`;
  for (let id in dupes) {
    text += `ID: "${id}" | Games (${dupes[id].length}): ${dupes[id].map(game => `${game.id}`).join(', ')}\n`;
  }
  text += '\n';
  text += `Games with invalid IDs (${invalidIDs.length}):\n`;
  invalidIDs.forEach(game => { text += `"${game.title}" (ID: ${game.id})\n`; });
  text += '\n';
  return text;
}

function checkGameTitles(games: IGameInfo[]): string {
  const timeStart = Date.now(); // Start timing
  const dupes = checkDupes(games, 'title'); // Find all games with duplicate titles
  const timeEnd = Date.now(); // End timing
  // Write log message
  let text = '';
  text += `Checked all games for duplicate titles (in ${timeEnd - timeStart}ms)\n`;
  text += '\n';
  text += 'Games with duplicate titles:\n';
  for (let title in dupes) {
    text += `"${title}" | Games (${dupes[title].length}): ${dupes[title].map(game => `${game.id}`).join(', ')}\n`;
  }
  text += '\n';
  return text;
}

type IGameInfoKeys = AllowedNames<IGameInfo, string>;
type EmptyRegister = { [key in IGameInfoKeys]?: IGameInfo[] }; // empty[fieldName] = [ game... ]
function checkGameEmptyFields(games: IGameInfo[]): string {
  const timeStart = Date.now(); // Start timing
  // Find all games with empty fields (that should not be empty)
  const empty: EmptyRegister = {};
  for (let i = 0; i < games.length - 1; i++) {
    const game = games[i];
    // Check if any game field (that should not be empty) is empty
    checkField(game, empty, 'developer');
    checkField(game, empty, 'genre');
    checkField(game, empty, 'source');
    checkField(game, empty, 'platform');
    checkField(game, empty, 'playMode');
    checkField(game, empty, 'status');
    checkField(game, empty, 'applicationPath');
    checkField(game, empty, 'launchCommand');
  }
  const timeEnd = Date.now(); // End timing
  // Write log message
  let text = '';
  text += `Checked all games for empty fields (in ${timeEnd - timeStart}ms)\n`;
  text += '\n';
  text += 'Summary:\n';
  text += '\n';
  for (let field in empty) {
    const array = empty[field as IGameInfoKeys];
    if (array) {
      text += `"${field}" has ${array.length} games with missing values.\n`;
    }
  }
  text += '\n';
  text += 'Detailed list:\n';
  text += '\n';
  for (let field in empty) {
    const array = empty[field as IGameInfoKeys];
    if (array) {
      text += `Field "${field}" has ${array.length} games with missing values:\n`;
      array.forEach(game => { text += `"${game.title}" (ID: ${game.id})\n`; });
    } else {
      text += `Field "${field}" has no games with missing values!\n`;
    }
    text += '\n';
  }
  text += '\n';
  return text;
  // -- Functions --
  function checkField(game: IGameInfo, empty: EmptyRegister, field: IGameInfoKeys): void {
    if (game[field] === '') {
      // Check if field is empty, if so add it to the collection of that field
      const array = empty[field] || [];
      array.push(game);
      if (!empty[field]) { empty[field] = array; }
    }
  }
}

type PlaylistReport = {
  playlist: IGamePlaylist;
  missingGameIDs: string[];
  duplicateGames: { [key: string]: IGamePlaylistEntry[] };
  invalidGameIDs: IGamePlaylistEntry[];
};
function checkPlaylists(playlists: IGamePlaylist[], games: IGameInfo[]): string {
  const timeStart = Date.now(); // Start timing
  const dupes = checkDupes(playlists, 'id'); // Find all playlists with duplicate IDs
  const invalidIDs: IGamePlaylist[] = playlists.filter(playlist => !uuidValidate(playlist.id, 4)); // Find all playlists with invalid IDs
  // Check the games of all playlists (if they are missing or if their IDs are invalid or duplicates)
  const reports: PlaylistReport[] = [];
  for (let i = 0; i < playlists.length - 1; i++) {
    const playlist = playlists[i];
    const duplicateGames = checkDupes(playlist.games, 'id'); // Find all games with duplicate IDs
    const invalidGameIDs = playlist.games.filter(game => !validateSemiUUID(game.id)); // Find all games with invalid IDs
    // Check for missing games (games that are in the playlist, and not in the game collection)
    const missingGameIDs: string[] = [];
    for (let gameEntry of playlist.games) {
      const id = gameEntry.id;
      if (!games.find(game => game.id === id)) {
        missingGameIDs.push(id);
      }
    }
    // Add "report" of this playlist
    if (Object.keys(duplicateGames).length > 0 ||
        invalidGameIDs.length > 0 ||
        missingGameIDs.length > 0) {
      reports.push({
        playlist,
        duplicateGames,
        missingGameIDs,
        invalidGameIDs
      });
    }
  }
  const timeEnd = Date.now(); // End timing
  // Write log message
  let text = '';
  text += `Checked all playlists for duplicate or invalid IDs, and for game entries with invalid, missing or duplicate IDs (in ${timeEnd - timeStart}ms)\n`;
  text += '\n';
  text += `Playlists with invalid IDs (${invalidIDs.length}):\n`;
  invalidIDs.forEach(playlist => { text += `"${playlist.title}" (ID: ${playlist.id})\n`; });
  text += '\n';
  text += `Playlists with duplicate IDs (${Object.keys(dupes).length}):\n`;
  for (let id in dupes) {
    text += `ID: "${id}" | Playlists (${dupes[id].length}): ${dupes[id].map(playlist => `${playlist.id}`).join(', ')}\n`;
  }
  text += '\n';
  text += `Playlists with game entry issues (${reports.length}):\n`;
  reports.forEach(({ playlist, duplicateGames, missingGameIDs, invalidGameIDs }) => {
    text += `  "${playlist.title}" (ID: ${playlist.id}):\n`;
    // Log duplicate game entry IDs
    if (Object.keys(duplicateGames).length > 0) {
      text += `    Game entries with duplicate IDs (${Object.keys(duplicateGames).length}):\n`;
      for (let id in duplicateGames) {
        const dupes = duplicateGames[id];
        const game = games.find(game => game.id === id);
        text += `      ${game ? `"${game.title}"` : 'Game not found'} (ID: ${id}) (Duplicates: ${dupes.length})\n`;
      }
    }
    // Log missing game entry IDs
    if (missingGameIDs.length > 0) {
      text += `    Game entries with IDs of missing games (${missingGameIDs.length}):\n`;
      for (let id of missingGameIDs) {
        text += `      ${id}\n`;
      }
    }
    // Log invalid game entry IDs
    if (invalidGameIDs.length > 0) {
      text += `    Game entries with invalid IDs (${invalidGameIDs.length}):\n`;
      for (let id of invalidGameIDs) {
        text += `      ${id}\n`;
      }
    }
  });
  text += '\n';
  return text;
}

function checkDupes<T extends { [key in U]: string }, U extends string>(array: T[], prop: U): { [key: string]: T[] } {
  const registry: { [key: string]: T[] } = {};
  const dupes: string[] = [];
  // Find all duplicates
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const val = item[prop];
    // Add prop to registry (to check for duplicates)
    if (!registry[val]) { registry[val] = []; }
    else if (registry[val].length === 1) { dupes.push(val); }
    registry[val].push(item);
  }
  // Prepare return value (only include the registry items that are duplicates)
  const clean: { [key: string]: T[] } = {};
  dupes.forEach(dupe => { clean[dupe] = registry[dupe]; });
  return clean;
}

function checkFileLocation(games: IGameInfo[]): string {
  const timeStart = Date.now(); // Start timing
  const pathFailed: IGameInfo[] = []; // (Games that it failed to get the path from)
  const pathError: [ IGameInfo, Error ][] = []; // (Games that it threw an error while attempting to get the path)
  let skippedCount: number = 0; // (Number of skipped games)
  // Try getting the path from all games
  for (let game of games) {
    if (game.broken) { skippedCount += 1; }
    else {
      try {
        const gamePath = GameLauncher.getGamePath(game);
        if (gamePath === undefined) { pathFailed.push(game); }
      } catch (error) {
        pathError.push([ game, error ]);
      }      
    }
  }
  const timeEnd = Date.now(); // End timing
  // Write log message
  let text = '';
  text += `Checked all games to see if their "launch command" could be parsed into a file path (in ${timeEnd - timeStart}ms)\n`;
  text += '\n';
  text += `Total games that failed: ${pathFailed.length + pathError.length}\n`;
  text += `Path not found: ${pathFailed.length}\n`;
  text += `Error while getting path: ${pathError.length}\n`;
  text += `Games skipped (all "broken" games are skipped): ${skippedCount}\n`;
  text += '\n';
  text += `Path not found (${pathFailed.length}):\n`;
  for (let game of pathFailed) {
    text += `"${game.title}" (Platform: "${game.platform}", ID: ${game.id})\n`;
  }
  text += '\n';
  text += `Error while getting path (${pathError.length}):\n`;
  for (let [ game, error ] of pathError) {
    text += `"${game.title}" (Platform: "${game.platform}", ID: "${game.id}")\n`+
            `    ${error.toString()}\n`;
  }
  // Done
  return text;
}

type FilterFlags<Base, Condition> = {
  [Key in keyof Base]: Base[Key] extends Condition ? Key : never
};
type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[keyof Base];

type GetImageCacheFunc = (folderName: string) => ImageFolderCache | undefined;
type RenameImagesStats = {
  totalFiles: number;
  totalLooped: number;
  renamedFiles: number;
  skippedFiles: number;
  errors: Array<{ game: IGameInfo, error: any }>;
};

/** Find all game images named after the games Title and rename them after their ID instead */
async function renameImagesToIDs(games: IGameInfo[], gameImages: GameImageCollection): Promise<string> {
  // Rename images
  const start = Date.now();
  const screenshotStats = await renameImagesToIDsSub(games, folderName => gameImages.getScreenshotCache(folderName));
  const thumbnailStats  = await renameImagesToIDsSub(games, folderName => gameImages.getThumbnailCache(folderName));
  const end = Date.now();
  // Refresh all image caches
  const screenshotCaches = gameImages.getAllScreenshotCaches();
  for (let key in screenshotCaches) { screenshotCaches[key].refresh(); }
  const thumbnailCaches = gameImages.getAllThumbnailCaches();
  for (let key in thumbnailCaches) { thumbnailCaches[key].refresh(); }
  // Write message
  let str = '';
  str += 'Screenshots:\n';
  str += stringifyRenameImageStats(screenshotStats);
  str += '\n\nThumbnails:\n';
  str += stringifyRenameImageStats(thumbnailStats);
  str += '\n\n';
  str += `Finished in ${end - start}ms`;
  return str;
}

async function renameImagesToIDsSub(games: IGameInfo[], getCache: GetImageCacheFunc): Promise<RenameImagesStats> {
  const stats: RenameImagesStats = {
    totalFiles: games.length,
    totalLooped: 0,
    renamedFiles: 0,
    skippedFiles: 0,
    errors: [],
  };
  for (let game of games) {
    const cache = getCache(removeFileExtension(game.filename));
    if (cache && cache.getFolderPath() !== undefined) {
      const filenames = organizeImageFilepaths(cache.getFilePaths(game.title));
      if (Object.keys(filenames).length > 0) {
        for (let index in filenames) {
          const curFilename = path.join(cache.getFolderPath(), filenames[index]);
          const newFilename = path.join(
            cache.getFolderPath(),
            formatImageFilename(game.id, (index as any)|0) + getFileExtension(filenames[index])
          );
          await rename(curFilename, newFilename)
          .catch(error => { stats.errors.push({ game, error }); })
          .then(() => { stats.renamedFiles += 1; });
        }
      } else { stats.skippedFiles += 1; }      
    } else { stats.errors.push({ game, error: new Error(`Image Folder Cache not found! (for image folder "${game.filename}")`) }); }
    // Count number of loops
    stats.totalLooped += 1;
  }
  return stats;
}

/** Find all game images named after the games ID and rename them after their Title instead */
async function renameImagesToTitles(games: IGameInfo[], gameImages: GameImageCollection): Promise<string> {
  // Rename images
  const start = Date.now();
  const screenshotStats = await renameImagesToTitlesSub(games, folderName => gameImages.getScreenshotCache(folderName));
  const thumbnailStats  = await renameImagesToTitlesSub(games, folderName => gameImages.getThumbnailCache(folderName));
  const end = Date.now();
  // Refresh all image caches
  const screenshotCaches = gameImages.getAllScreenshotCaches();
  for (let key in screenshotCaches) { screenshotCaches[key].refresh(); }
  const thumbnailCaches = gameImages.getAllThumbnailCaches();
  for (let key in thumbnailCaches) { thumbnailCaches[key].refresh(); }
  // Write message
  let str = '';
  str += 'Screenshots:\n';
  str += stringifyRenameImageStats(screenshotStats);
  str += '\n\nThumbnails:\n';
  str += stringifyRenameImageStats(thumbnailStats);
  str += '\n\n';
  str += `Finished in ${end - start}ms`;
  return str;
}

async function renameImagesToTitlesSub(games: IGameInfo[], getCache: GetImageCacheFunc): Promise<RenameImagesStats> {
  const stats: RenameImagesStats = {
    totalFiles: games.length,
    totalLooped: 0,
    renamedFiles: 0,
    skippedFiles: 0,
    errors: [],
  };
  for (let game of games) {
    const cache = getCache(removeFileExtension(game.filename));
    if (cache && cache.getFolderPath() !== undefined) {
      const filenames = organizeImageFilepaths(cache.getFilePaths(game.id));
      if (Object.keys(filenames).length > 0) {
        for (let index in filenames) {
          const curFilename = path.join(cache.getFolderPath(), filenames[index]);
          const newFilename = path.join(
            cache.getFolderPath(),
            formatImageFilename(game.title, (index as any)|0) + getFileExtension(filenames[index])
          );
          await rename(curFilename, newFilename)
          .catch(error => { stats.errors.push({ game, error }); })
          .then(() => { stats.renamedFiles += 1; });
        }
      } else { stats.skippedFiles += 1; }      
    } else { stats.errors.push({ game, error: new Error(`Image Folder Cache not found! (for image folder "${game.filename}")`) }); }
    // Count number of loops
    stats.totalLooped += 1;
  }
  return stats;
}

function stringifyRenameImageStats(stats: RenameImagesStats): string {
  let str = '';
  str += `    Total: ${stats.totalFiles}\n`;
  str += `    Loops: ${stats.totalLooped}\n`;
  str += `    Renamed: ${stats.renamedFiles}\n`;
  str += `    Skipped: ${stats.skippedFiles}\n`;
  if (stats.errors.length > 0) {
    str += `    Errors:\n`;
    str += stats.errors.reduce((acc, error) => 
      acc+`      Error: ${(error.error+'').replace(/\n/g, '\n             ')}\n`,
      ''
    );
  }
  return str;
}

type FolderStructure = { [key: string]: FolderStructure | string[] } | string[];
async function createMissingFolders(collection: GameCollection): Promise<string> {
  let str = '';
  const log = (text?: string) => { str += (typeof text === 'string') ? text+'\n' : '\n'; };
  const fullFlashpointPath = window.External.config.fullFlashpointPath;
  // Create "static" folder structure (folders that should always exist)
  log('Creating "static" folders:');
  log('(Folders that should be in every Flashpoint folder)\n');
  log(fullFlashpointPath);
  await createFolderStructure(
    fullFlashpointPath, {
      'Data': [
        'Images',
        'Logos',
        'Platforms',
        'Playlists',
        'Themes',
      ],
      'Extras': [],
      'FPSoftware': [],
      'Launcher': [],
      'Server': [],
    }, log, 2
  ).catch(logError);
  log('\n');
  // Create image folders
  log('Creating image folders:\n');
  log(path.join(fullFlashpointPath, 'Data/Images'));
  const imageFolders = await findPlatformFolderImageNames();
  if (imageFolders.length > 0) {
    const imageFolderStructure: FolderStructure = {};
    imageFolders.forEach(folderName => { imageFolderStructure[folderName] = ['Box - Front', 'Screenshot - Gameplay']; });
    await createFolderStructure(
      path.join(fullFlashpointPath, 'Data/Images'),
      imageFolderStructure,
      log, 2
    ).catch(logError);    
  } else { log('\n  No image folder names found (each platform ".xml" file get its own image folder).'); }
  // Return string
  log(); // Add final new line
  return str;
  
  /** Create all the folders that are missing in a folder structure. */
  async function createFolderStructure(rootPath: string, structure: FolderStructure, log: (text: string) => void, depth: number = 0) {
    const pad = '| '.repeat(depth - 1);
    if (Array.isArray(structure)) {
      for (let i = 0; i < structure.length; i++) {
        const folderName = structure[i];
        const folderPath = path.join(rootPath, folderName);
        const success = await createMissingFolder(folderPath);
        log(folderLogMessage(folderName, success));
      }
    } else {
      for (let key in structure) {
        const folderPath = path.join(rootPath, key);
        const success = await createMissingFolder(folderPath);
        log(folderLogMessage(key, success));
        await createFolderStructure(folderPath, structure[key], log, depth + 1);
      }
    }
    /** */
    function folderLogMessage(folderName: string, success: boolean): string {
      let str = `${pad}+ ${folderName}`;
      str += ' '.repeat(Math.max(1, 40 - str.length));
      str += success ? 'Created!' : 'Exists.';
      return str;
    }
    /** Create a folder if it is missing. */
    async function createMissingFolder(folderPath: string): Promise<boolean> {
      if (!await exists(folderPath)) { // Folder does not already exist
        if (folderPath.startsWith(rootPath)) { // Folder is a sub-folder of it's root (no "../" climbing allowed)
          await mkdir(folderPath).catch(logError);
          return true;
        }
      }
      return false;
    }
  }
  /** Find the image folder names of all the current platforms platforms. */
  async function findPlatformFolderImageNames() {
    // Get the platform filenames
    let platformFilenames: string[];
    try { platformFilenames = await LaunchboxData.fetchPlatformFilenames(fullFlashpointPath); }
    catch(error) { return []; }
    // Convert to image folder names
    return (
      platformFilenames // [ "Flash.xml", "HTML5.xml" etc. ]
      .map(filename => filename.split('.')[0]) // "Flash.xml" => "Flash"
    );
  }
  /** Log error (if there is any). */
  function logError(error: any): void {
    if (error) { console.warn(error); }
  }
}

/** Remove the last "item" in a path ("C:/foo/bar.png" => "C:/foo") */
export function removeLastItemOfPath(filePath: string): string {
  return filePath.substr(0, Math.max(0, filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')));
}

/** Get the file extension of a file (including the dot). Returns an empty string if none. */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) { return ''; }
  return filename.substr(lastDot);
}
