import { remote } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { promisify } from 'util';
import * as uuidValidate from 'uuid-validate';
import { GameCollection } from '../../../shared/game/GameCollection';
import { orderByTitle } from '../../../shared/game/GameFilter';
import { IGameInfo } from '../../../shared/game/interfaces';
import { LangContainer } from '../../../shared/lang/types';
import { removeFileExtension } from '../../../shared/Util';
import { WithLibraryProps } from '../../containers/withLibrary';
import { GameLauncher } from '../../GameLauncher';
import { GameImageCollection } from '../../image/GameImageCollection';
import { ImageFolderCache } from '../../image/ImageFolderCache';
import { formatImageFilename, organizeImageFilepaths } from '../../image/util';
import { CentralState } from '../../interfaces';
import { LaunchboxData } from '../../LaunchboxData';
import { IGamePlaylist, IGamePlaylistEntry } from '../../playlist/interfaces';
import { getFileExtension, sizeToString } from '../../Util';
import { LangContext } from '../../util/lang';
import { validateSemiUUID } from '../../uuid';
import { LogData } from '../LogData';
import { SimpleButton } from '../SimpleButton';

const rename = promisify(fs.rename);
const exists = promisify(fs.exists);
const mkdir  = promisify(fs.mkdir);

type Map<K extends string, V> = { [key in K]: V };

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

export interface DeveloperPage {
  context: LangContainer;
}

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
    const strings = this.context.developer;
    const { text } = this.state;
    return (
      <div className='developer-page simple-scroll'>
        <div className='developer-page__inner'>
          <h1 className='developer-page__title'>{strings.developerHeader}</h1>
          {strings.developerDesc}
          <div className='developer-page__buttons'>
            {/* Top Buttons */}
            <SimpleButton
              value={strings.checkMissingImages}
              title={strings.checkMissingImagesDesc}
              onClick={this.onCheckMissingImagesClick} />
            <SimpleButton
              value={strings.checkGameIds}
              title={strings.checkGameIdsDesc}
              onClick={this.onCheckGameIDsClick} />
            <SimpleButton
              value={strings.checkGameTitles}
              title={strings.checkGameTitlesDesc}
              onClick={this.onCheckGameNamesClick} />
            <SimpleButton
              value={strings.checkGameFields}
              title={strings.checkGameFieldsDesc}
              onClick={this.onCheckGameFieldsClick} />
            <SimpleButton
              value={strings.checkPlaylists}
              title={strings.checkPlaylistsDesc}
              onClick={this.onCheckPlaylistsClick} />
            <SimpleButton
              value={strings.checkGameFileLocation}
              title={strings.checkGameFileLocationDesc}
              onClick={this.onCheckFileLocation} />
            <SimpleButton
              value={strings.checkApplicationPath}
              title={strings.checkApplicationPathDesc}
              onClick={this.onCheckApplicationPaths} />
            <SimpleButton
              value={strings.checkLaunchCommand}
              title={strings.checkLaunchCommandDesc}
              onClick={this.onCheckLaunchCommands} />
            {/* Log */}
            <LogData
              className='developer-page__log'
              logData={text} />
            {/* Bottom Buttons */}
            <SimpleButton
              value={strings.renameImagesTitleToId}
              title={strings.renameImagesTitleToIdDesc}
              onClick={this.onRenameImagesTitleToIDClick} />
            <SimpleButton
              value={strings.renameImagesIdToTitle}
              title={strings.renameImagesIdToTitleDesc}
              onClick={this.onRenameImagesIDToTitleClick} />
            <SimpleButton
              value={strings.createMissingFolders}
              title={strings.createMissingFoldersDesc}
              onClick={this.onCreateMissingFoldersClick} />
            <SimpleButton
              value={strings.removeUnusedImages}
              title={strings.removeUnusedImagesDesc}
              onClick={this.onRemoveUnusedImagesClick} />
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

  onCheckApplicationPaths = (): void => {
    const games = this.props.central.games.collection.games;
    const fullFlashpointPath = window.External.config.fullFlashpointPath;
    setTimeout(async () => {
      this.setState({ text: await checkApplicationPaths(games, fullFlashpointPath) });
    });
  }

  onCheckLaunchCommands = (): void => {
    const button = remote.dialog.showMessageBoxSync({
      type: 'warning',
      title: 'Check path exists?',
      message: 'Check whether the launch command is an existing path?\n' +
               'Must be using Ultimate to work properly.',
      buttons: ['Yes', 'No'],
    });
    this.setState({ text: 'Please be patient. This may take a few seconds...' });
    setTimeout(async () => {
      const games = this.props.central.games.collection.games;
      const fullFlashpointPath = window.External.config.fullFlashpointPath;
      this.setState({ text: await checkLaunchCommands(games, fullFlashpointPath, button === 0) });
    }, 0);
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

  onRemoveUnusedImagesClick = (): void => {
    this.setState({ text: 'Please be patient. This may take a few minutes... (Progress is in the console)\n\n' });
    setTimeout(async () => {
      let text = '';
      let totalUnusedFiles = 0;
      let totalUnusedBytes = 0;
      const games = this.props.central.games.collection.games;
      const imagesPath = path.join(window.External.config.fullFlashpointPath, window.External.config.data.imageFolderPath);
      // Gather image directories
      const imageDirs = await getImageDirs(imagesPath);
      text += `Processing ${imageDirs.length} image directories...\n\n`
      this.setState({ text: text});
      // Find unused files in all image directories
      let nextDirNumber = 1;
      await Promise.all(
        imageDirs.map(async (imageDir, index) => {
          await processImageDirectory(imageDir, games);
          text += `${nextDirNumber.toString().padEnd(imageDirs.length/10)} ` + 
               imageDir.path.padEnd(75,' ') +
               ` - File Count : ${imageDir.files.toString().padEnd(8, ' ')}` +
               ` - Files Unused : ${imageDir.filesUnused.length.toString().padEnd(8, ' ')}` +
               ` - Total Unused Size : ${sizeToString(imageDir.totalBytesUnused)}\n`;
          totalUnusedFiles += imageDir.filesUnused.length;
          totalUnusedBytes += imageDir.totalBytesUnused;
          nextDirNumber++;
          this.setState({text: text});
        })
      );
      // Print cumulative files and size
      text += `\nAll directories processed - ${totalUnusedFiles} images unused totalling ${sizeToString(totalUnusedBytes)}\n`;
      this.setState({ text: text });
      // Make sure they want to delete the files
      const button = await remote.dialog.showMessageBox({
        type: 'warning',
        title: 'Delete unused images?',
        message: totalUnusedFiles + `${totalUnusedFiles} Images found unused totaling ${sizeToString(totalUnusedBytes)} \n` + 
                'Delete unused images? They cannot be recovered.',
        buttons: ['Yes', 'No'],
      });
      // Button Index 0 - Yes
      if (button.response === 0) {
        // Clear out all unused files
        await Promise.all(
          imageDirs.map((imageDir) => {
            imageDir.filesUnused.forEach(async (file) => {
              text += 'Deleted - ' + file + '\n';
              await fs.unlink(file);
            })
          })
        )
        text += `\nDeleted ${totalUnusedFiles} unused images totalling ${sizeToString(totalUnusedBytes)}`;
      } else {
        text += 'No images deleted.';
      }
      this.setState({text: text});
    }, 0);
  }

  static contextType = LangContext;
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
  const dupes = checkDupes(games, game => game.id); // Find all games with duplicate IDs
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
  // Find all games for the same platform that has identical titles
  const timeStart = Date.now(); // Start timing
  const gamesPerPlatform = categorizeByProp(games, 'platform');
  const dupesPerPlatform: Map<string, Map<string, IGameInfo[]>> = {};
  for (let key in gamesPerPlatform) {
    dupesPerPlatform[key] = checkDupes(gamesPerPlatform[key], game => game.title.toUpperCase());
  }
  const timeEnd = Date.now(); // End timing
  // Write log message
  let text = '';
  text += `Checked for games with identical titles (case-insensitive) on the same platform (in ${timeEnd - timeStart}ms)\n`;
  text += '\n';
  const platforms = Object.keys(gamesPerPlatform).sort();
  if (platforms.length > 0) {
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      const dupes = dupesPerPlatform[platform];
      const titles = Object.keys(dupes).sort();
      if (titles.length > 0) {
        text += `Platform: "${platform}" (${titles.length})\n`;
        for (let j = 0; j < titles.length; j++) {
          const title = titles[j];
          text += `  "${title}" ${repeat(' ', 60 - title.length)}(Games: ${dupes[title].length})\n`;
        }
        text += '\n';
      }
    }
  } else {
    text += 'No duplicates found!\n';
  }
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
  const dupes = checkDupes(playlists, playlist => playlist.id); // Find all playlists with duplicate IDs
  const invalidIDs: IGamePlaylist[] = playlists.filter(playlist => !uuidValidate(playlist.id, 4)); // Find all playlists with invalid IDs
  // Check the games of all playlists (if they are missing or if their IDs are invalid or duplicates)
  const reports: PlaylistReport[] = [];
  for (let i = 0; i < playlists.length - 1; i++) {
    const playlist = playlists[i];
    const duplicateGames = checkDupes(playlist.games, game => game.id); // Find all games with duplicate IDs
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

/**
 * Organize the elements in an array into a map of arrays, based on the value of a key of the objects.
 * @param array Elements to sort.
 * @param prop Property of the elements to organize by.
 */
function categorizeByProp<T extends Map<K, V>, K extends string, V extends string>(array: T[], prop: K): Map<string, T[]> {
  const map: Map<string, T[]> = {};
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const key = item[prop];
    if (!map[key]) { map[key] = []; }
    map[key].push(item);
  }
  return map;
}

/**
 * Find all elements in an array with common values.
 * @param array Elements to search through.
 * @param fn Function that gets the value of an element to compare.
 */
function checkDupes<T>(array: T[], fn: (element: T) => string): { [key: string]: T[] } {
  const registry: { [key: string]: T[] } = {};
  const dupes: string[] = [];
  // Find all duplicates
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const val = fn(item);
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

/** Find application paths which don't point to a valid executable */
async function checkApplicationPaths(games: IGameInfo[], fullFlashpointPath: string): Promise<string> {
  let invalidGames : IGameInfo[] = [];
  const startTime = Date.now();
  await Promise.all(
    games.map(async (game) => {
      path.join(fullFlashpointPath, game.applicationPath);
      await fs.access(path.join(fullFlashpointPath, game.applicationPath), fs.constants.F_OK)
        .catch((error) => { invalidGames.push(game); })
    })
  );
  let text = `Checked all Application Paths (in ${Date.now() - startTime}ms)\n\n`;
  invalidGames.sort(orderByTitle);
  invalidGames.forEach((game) => {
    console.log('yes');
    text += `${('"' + game.title + '"').padEnd(50, ' ')} (ID: ${game.id}) - Application Path - "${game.applicationPath}"\n`
  });
  return text;
}

/** Check for all missing launch command files and HTTPS launch commands (Only checks URLs) */
async function checkLaunchCommands(games: IGameInfo[], fullFlashpointPath: string, checkMissing: boolean): Promise<string> {
  let httpsGames : string[]  = [];
  let missingGames : string[] = [];
  const startTime = Date.now();
  await Promise.all(
    games.map(async (game) => {
      // Extract first string (Usually URL, Inside quotes will keep spaces)
      let match = game.launchCommand.match(/[^\s"']+|"([^"]*)"|'([^']*)'/);
      if (match) {
        // Match 1 - Inside quotes, Match 0 - No Quotes Found
        let launchCommand = match[1] || match[0];
        // Only check URLS (ignore bash/shell script non-URL commands)
        if (launchCommand.toLowerCase().startsWith('http')) {
          if (launchCommand.toLowerCase().startsWith('https')) {
            httpsGames.push(`${('"' + game.title + '"').padEnd(50, ' ')} (ID: ${game.id})  - Launch Command "${launchCommand}"\n`);
          }
          const ending = launchCommand.split('/').pop();
          // If the string doesn't end in a file, assume the spaced URL was not inside quotes, use full launch command
          if (ending && !ending.includes('.')){
            launchCommand = game.launchCommand.split('?')[0];
          }
          if (checkMissing) {
            const filePath = path.join(fullFlashpointPath, 'Server/htdocs', launchCommand.replace(/(^\w+:|^)\/\//, ''));
            // Push a game to the list if its launch command file is missing
            await fs.access(filePath, fs.constants.F_OK)
              .catch((error) => {
                missingGames.push(`${('"' + game.title + '"').padEnd(50, ' ')} (ID: ${game.id})  - Launch Command "${launchCommand}"\n`);
              });
          }
        }
      }
    })
  );

  // Sort lists then print everything out
  let text = `Checked all Launch Commands (in ${Date.now() - startTime}ms)\n\n` +
             `Launch commands using HTTPS: (${httpsGames.length} games)\n\n`;
  httpsGames.sort();
  missingGames.sort();

  httpsGames.forEach((game) => {
    text += game;
  });

  if (checkMissing) {
    text += `\nLaunch command files missing on disk: (${missingGames.length} games)\n\n`;
    missingGames.forEach((game) => {
      text += game;
    })
  }

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
    str += '    Errors:\n';
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
    catch (error) { return []; }
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

type ImageDirectory = {
  path: string;
  files: number;
  filesUnused: string[];
  totalBytesUnused: number;
}

/** Populate an ImageDirectory object with unused and total files data */
async function processImageDirectory(imageDir: ImageDirectory, games: IGameInfo[]): Promise<void> {
  const files = await fs.readdir(imageDir.path);
  for (let i = 0; i < files.length; i++) {
    const fullPath = path.join(imageDir.path, files[i]);
    const stats = await fs.lstat(fullPath);
    if (stats.isFile()) {
      imageDir.files++;
      let j = 0;
      for (; j < games.length; j++) {
        if (fullPath.includes(games[j].id)) {
          break;
        }
      }
      // No match found from any game, must be unused
      if (j === games.length) {
        imageDir.totalBytesUnused += stats.size;
        imageDir.filesUnused.push(fullPath);
      }
    }
  }
}

/** Gather a list of ImageDirectory objects for each deepest directory in the path */
async function getImageDirs(fullImagesPath: string): Promise<ImageDirectory[]> {
  let imageDirs: ImageDirectory[] = [];
  const dirs = await recursiveImageDirs(fullImagesPath)
  dirs.forEach((dir) => {
    imageDirs.push({path: dir, files: 0, filesUnused: [], totalBytesUnused: 0});
  });
  return imageDirs;
}

async function recursiveImageDirs(dir: string): Promise<string[]> {
  let list: string[] = [];
  const files = await fs.readdir(dir);
  for (let i = 0; i < files.length; i++) {
    const fullPath = path.join(dir, files[i]);
    const stats = await fs.lstat(fullPath);
    if (stats.isDirectory()) {
      list = list.concat(await recursiveImageDirs(fullPath));
    }
  }
  if (list.length === 0) { list.push(dir); }
  return list;
}

/** Remove the last "item" in a path ("C:/foo/bar.png" => "C:/foo") */
export function removeLastItemOfPath(filePath: string): string {
  return filePath.substr(0, Math.max(0, filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')));
}

function repeat(char: string, n: number): string {
  return char.repeat(Math.max(0, n));
}
