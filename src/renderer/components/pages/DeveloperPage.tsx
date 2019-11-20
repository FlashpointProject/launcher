import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
import { promisify } from 'util';
import * as uuidValidate from 'uuid-validate';
import { BackIn, BackOut, GetAllGamesResponseData, ServiceChangeData, WrappedResponse } from '../../../shared/back/types';
import { IGameInfo } from '../../../shared/game/interfaces';
import { LangContainer } from '../../../shared/lang';
import { PlatformInfo } from '../../../shared/platform/interfaces';
import { CentralState } from '../../interfaces';
import { GamePlaylist, GamePlaylistEntry } from '../../playlist/types';
import { LangContext } from '../../util/lang';
import { validateSemiUUID } from '../../uuid';
import { LogData } from '../LogData';
import { ServiceBox } from '../ServiceBox';
import { SimpleButton } from '../SimpleButton';

const exists = promisify(fs.exists);
const mkdir  = promisify(fs.mkdir);
type Map<K extends string, V> = { [key in K]: V };

export type DeveloperPageProps = {
  platforms: PlatformInfo[];
  /** Semi-global prop. */
  central: CentralState;
};

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

  componentDidMount() {
    window.External.back.on('message', this.onServiceUpdate);
  }

  componentWillUnmount() {
    window.External.back.off('message', this.onServiceUpdate);
  }

  render() {
    const strings = this.context.developer;
    const { text } = this.state;
    const services = window.External.services;
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
            {/* Log */}
            <LogData
              className='developer-page__log'
              logData={text} />
            {/* Bottom Buttons */}
            <SimpleButton
              value={strings.createMissingFolders}
              title={strings.createMissingFoldersDesc}
              onClick={this.onCreateMissingFoldersClick} />
          </div>
          {/* -- Services -- */}
          <h1 className='developer-page__services-title'>{strings.servicesHeader}</h1>
          {(services.length > 0) ? (
            services.map((item, index) => (
              <ServiceBox
                key={index}
                service={item} />
          ))) : (
            <p>{strings.servicesMissing}</p>
          )}
        </div>
      </div>
    );
  }

  onServiceUpdate = (response: WrappedResponse<ServiceChangeData>) => {
    if (response.type === BackOut.SERVICE_CHANGE) { this.forceUpdate(); }
  }

  onCheckMissingImagesClick = async (): Promise<void> => {
    // @TODO
  }

  onCheckGameIDsClick = async (): Promise<void> => {
    const res = await fetchAllGames();
    this.setState({ text: checkGameIDs(res) });
  }

  onCheckGameNamesClick = async (): Promise<void> => {
    const res = await fetchAllGames();
    this.setState({ text: checkGameTitles(res) });
  }

  onCheckGameFieldsClick = async (): Promise<void> => {
    const res = await fetchAllGames();
    this.setState({ text: checkGameEmptyFields(res) });
  }

  onCheckPlaylistsClick = async (): Promise<void> => {
    const playlists = this.props.central.playlists.playlists;
    const res = await fetchAllGames();
    this.setState({ text: checkPlaylists(playlists, res) });
  }

  onCheckFileLocation = async (): Promise<void> => {
    const res = await fetchAllGames();
    this.setState({ text: checkFileLocation(res) });
  }

  onCreateMissingFoldersClick = (): void => {
    setTimeout(async () => {
      this.setState({ text: await createMissingFolders() });
    }, 0);
  }

  static contextType = LangContext;
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
  playlist: GamePlaylist;
  missingGameIDs: string[];
  duplicateGames: { [key: string]: GamePlaylistEntry[] };
  invalidGameIDs: GamePlaylistEntry[];
};
function checkPlaylists(playlists: GamePlaylist[], games: IGameInfo[]): string {
  const timeStart = Date.now(); // Start timing
  const dupes = checkDupes(playlists, playlist => playlist.id); // Find all playlists with duplicate IDs
  const invalidIDs: GamePlaylist[] = playlists.filter(playlist => !uuidValidate(playlist.id, 4)); // Find all playlists with invalid IDs
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
        const gamePath = getGamePath(game, window.External.config.fullFlashpointPath);
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


type FolderStructure = { [key: string]: FolderStructure | string[] } | string[];
async function createMissingFolders(): Promise<string> {
  let str = '';
  const fullFlashpointPath = window.External.config.fullFlashpointPath;
  // Create "static" folder structure (folders that should always exist)
  str += 'Creating "static" folders:\n';
  str += '(Folders that should be in every Flashpoint folder)\n\n';
  str += `${fullFlashpointPath}\n`;
  await createFolderStructure(
    fullFlashpointPath, {
      'Data': {
        'Images': [
          'Logos',
          'Screenshots'
        ],
        'Logos': [],
        'Platforms': [],
        'Playlists': [],
        'Themes': [],
      },
      'Extras': [],
      'FPSoftware': [],
      'Launcher': [],
      'Server': [],
    }, (text?: string) => { str += (typeof text === 'string') ? text+'\n' : '\n'; }, 2
  ).catch(logError);
  str += '\n';
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

  /** Log error (if there is any). */
  function logError(error: any): void {
    if (error) { console.warn(error); }
  }
}
/** Remove the last "item" in a path ("C:/foo/bar.png" => "C:/foo") */
export function removeLastItemOfPath(filePath: string): string {
  return filePath.substr(0, Math.max(0, filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')));
}

function repeat(char: string, n: number): string {
  return char.repeat(Math.max(0, n));
}

function fetchAllGames(): Promise<IGameInfo[]> {
  return new Promise((resolve, reject) => {
    window.External.back.send<GetAllGamesResponseData>(BackIn.GET_ALL_GAMES, undefined, result => {
      if (result.data) { resolve(result.data.games); }
      else { reject(new Error('Failed to fetch all games. Data is undefined.')); }
    });
  });
}

/** Path of the "htdocs" folder (relative to the Flashpoint folder) */
const htdocsPath = 'Server/htdocs';

type IGamePathInfo = Pick<IGameInfo, 'platform' | 'launchCommand'>;

function getGamePath(game: IGamePathInfo, fpPath: string): string | undefined {
  // @TODO Because some strings can be interpreted as different paths/URLs, maybe this should return an array
  //       of strings with all the possible paths of the "main" file?
  //       Example: Some web server files are stored in "Server/htdocs" while other are stored in "Server/cgi-bin".
  const shockwavePath = 'FPSoftware/Shockwave/PJX'; // (Path to a shockwave executable)
  const groovePath = 'FPSoftware/3DGrooveGX'; // (Path to the 3D Groove GZ executable)
  // Extract file path from the game's launch command
  const platform = game.platform.toLowerCase();
  switch (platform) {
    // Example: 5.x http://example.com/games/cool_game.html
    case 'unity': {
      // Extract the URL (get the content after the first space, or the whole string if there is no space)
      let str: string | undefined = undefined;
      const index = game.launchCommand.indexOf(' ');
      if (index >= 0) { str = game.launchCommand.substring(index + 1); }
      else            { str = game.launchCommand; }
      // Create URL
      const url = toForcedURL(str);
      if (url) { return path.join(fpPath, htdocsPath, urlToFilePath(url)); }
    } break;
    // Relative path to a ".ini" file
    // Example: game.ini
    case '3d groove gx':
      return path.join(fpPath, groovePath, game.launchCommand);
    // Examples: -J-Dfile.encoding=UTF8 -J-Duser.language=ja -J-Duser.country=JP http://www.example.jp/game.html
    //           http://www.example.com/game.html
    //           "http://www.example.com/game.html"
    case 'java': {
      // Extract the path/url from the launch command
      let str: string | undefined = undefined;
      if (game.launchCommand[0] === '"') { // (URL wrappen in quotation marks)
        // Get the contents between the first pair of quotation marks
        const index = game.launchCommand.indexOf('"', 1);
        if (index >= 0) { str = game.launchCommand.substring(1, index); }
      } else {
        // Get the content after the last space (or the while string if there is no space)
        const index = game.launchCommand.lastIndexOf(' ');
        if (index >= 0) { str = game.launchCommand.substring(index); }
        else            { str = game.launchCommand; }
      }
      // Create a full path from the extracted url
      if (str !== undefined) {
        const url = toForcedURL(str);
        if (url) { return path.join(fpPath, htdocsPath, urlToFilePath(url)); }
      }
    } break;
    // Examples: http://example.com/game.dcr --forceTheExitLock 0
    //           "http://example.com/game.dcr" --do "member('gameUrl').text = 'http://example.com/other_thing.dcr'"
    //           ..\Games\game_folder\game_file.dcr
    case 'shockwave': {
      // Extract the path/url from the launch command
      let str: string | undefined = undefined;
      if (game.launchCommand[0] === '"') { // (Path/URL wrappen in quotation marks)
        // Get the contents between the first pair of quotation marks
        const index = game.launchCommand.indexOf('"', 1);
        if (index >= 0) { str = game.launchCommand.substring(1, index); }
      } else {
        // Get the content before the first space (or the while string if there is no space)
        const index = game.launchCommand.indexOf(' ');
        if (index >= 0) { str = game.launchCommand.substring(0, index); }
        else            { str = game.launchCommand; }
      }
      // Create a full path from the extracted path/url
      if (str !== undefined) {
        // Note: Because some strings could either be a path or URL ("localflash/game.swf" for example), this will assume that
        //       all URLs start with a protocol ("http://"). This will probably make this function not work for some games.
        const url = toURL(str);
        if (url) { return path.join(fpPath, htdocsPath, urlToFilePath(url)); }
        else     { return path.join(fpPath, shockwavePath, str); }
      }
    } break;
    // Launch Command contains
    // Example: http://www.example.com/game.html example\game.dll
    case 'activex': {
      // Extract everything before the first space
      let str: string | undefined = undefined;
      const index = game.launchCommand.lastIndexOf(' ');
      if (index >= 0) { str = game.launchCommand.substring(0, index); }
      else            { str = game.launchCommand; }
      // Create a full path from the extracted url
      const url = toForcedURL(str);
      if (url) { return path.join(fpPath, htdocsPath, urlToFilePath(url)); }
    } break;
    // Launch Commands that only contain a URL
    // Example: http://example.com/games/cool_game.html
    case '3dvia player':
    case 'flash':
    case 'html5':
    case 'popcap plugin':
    case 'silverlight':
    default:
      return getPathOfHtdocsUrl(game.launchCommand, fpPath);
  }
}

/**
 * Convert a url to a path of the file in the htdocs folder.
 * @param url URL string or object.
 * @param fpPath Path of the Flashpoint folder (if undefined, the current flashpoint path is used).
 */
function getPathOfHtdocsUrl(url: string | URL, fpPath: string): string | undefined {
  const urlObj = (typeof url === 'string') ? toForcedURL(url) : url;
  if (urlObj) { return path.join(fpPath, htdocsPath, urlToFilePath(urlObj)); }
}

/**
 * Create a URL object from a string.
 * First try creating it normally, if that fails try again with the 'http' protocol string at the start of the string.
 * @param str URL string.
 * @returns A URL object of the string, or undefined if it failed to create the object.
 */
function toForcedURL(str: string): URL | undefined {
  return toURL(str) || toURL('http://'+str);
}

/**
 * Convert a URL to a path, where the hostname is the first folder,
 * and the pathname the folders afterwards.
 * @param url URL to convert.
 * @returns The converted path.
 */
function urlToFilePath(url: URL): string {
  return decodeURIComponent(path.join(url.hostname, url.pathname));
}

/**
 * Create a URL object from a string.
 * @param str URL string.
 * @returns A URL object of the string, or undefined if it failed to create the object.
 */
function toURL(str: string): URL | undefined {
  try { return new URL(str); }
  catch { return undefined; }
}
