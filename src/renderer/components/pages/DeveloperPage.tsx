import { Game } from '@database/entity/Game';
import { getGamePath } from '@renderer/Util';
import { BackIn, BackOut, GetAllGamesResponseData, GetExecData, ServiceChangeData, WrappedResponse } from '@shared/back/types';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import { ExecMapping, GamePlaylist, GamePlaylistEntry } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
import { promisify } from 'util';
import * as uuidValidate from 'uuid-validate';
import { LangContext } from '../../util/lang';
import { validateSemiUUID } from '../../util/uuid';
import { LogData } from '../LogData';
import { ServiceBox } from '../ServiceBox';
import { SimpleButton } from '../SimpleButton';

// @TODO Move the developer tools to the back and "stream" the log messages back.
//       This makes it work remotely AND should make it lag less + work between changing tabs.

const exists = promisify(fs.exists);
const mkdir  = promisify(fs.mkdir);
type Map<K extends string, V> = { [key in K]: V };

export type DeveloperPageProps = {
  platforms: string[];
  playlists: GamePlaylist[];
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
    window.Shared.back.on('message', this.onServiceUpdate);
  }

  componentWillUnmount() {
    window.Shared.back.off('message', this.onServiceUpdate);
  }

  render() {
    const strings = this.context.developer;
    const { text } = this.state;
    const services = window.Shared.services;
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
              value={strings.checkMissingExecMappings}
              title={strings.checkMissingExecMappingsDesc}
              onClick={this.onCheckMissingExecMappings} />
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
    const playlists = this.props.playlists;
    const res = await fetchAllGames();
    this.setState({ text: checkPlaylists(playlists, res) });
  }

  onCheckFileLocation = async (): Promise<void> => {
    const res = await fetchAllGames();
    this.setState({ text: checkFileLocation(res) });
  }

  onCheckMissingExecMappings = async (): Promise<void> => {
    const [games, execMappings] = await Promise.all([
      fetchAllGames(),
      window.Shared.back.sendP<GetExecData>(BackIn.GET_EXEC, undefined).then(r => r.data),
    ]);
    if (!execMappings) { throw new Error('Failed to get exec mappings - response contained no data'); }
    if (games) {
      this.setState({ text: checkMissingExecMappings(games, execMappings) });
    }
  }

  onCreateMissingFoldersClick = (): void => {
    setTimeout(async () => {
      this.setState({ text: await createMissingFolders() });
    }, 0);
  }

  static contextType = LangContext;
}

function checkGameIDs(games: Game[]): string {
  const timeStart = Date.now(); // Start timing
  const dupes = checkDupes(games, game => game.id); // Find all games with duplicate IDs
  const invalidIDs: Game[] = games.filter(game => !validateSemiUUID(game.id)); // Find all games with invalid IDs
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

function checkGameTitles(games: Game[]): string {
  // Find all games for the same platform that has identical titles
  const timeStart = Date.now(); // Start timing
  const gamesPerPlatform = categorizeByProp(games, 'platform');
  const dupesPerPlatform: Map<string, Map<string, Game[]>> = {};
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

type GameKeys = AllowedNames<Game, string>;
type EmptyRegister = { [key in GameKeys]?: Game[] }; // empty[fieldName] = [ game... ]
function checkGameEmptyFields(games: Game[]): string {
  const timeStart = Date.now(); // Start timing
  // Find all games with empty fields (that should not be empty)
  const empty: EmptyRegister = {};
  for (let i = 0; i < games.length - 1; i++) {
    const game = games[i];
    // Check if any game field (that should not be empty) is empty
    checkField(game, empty, 'developer');
    checkField(game, empty, 'tags');
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
    const array = empty[field as GameKeys];
    if (array) {
      text += `"${field}" has ${array.length} games with missing values.\n`;
    }
  }
  text += '\n';
  text += 'Detailed list:\n';
  text += '\n';
  for (let field in empty) {
    const array = empty[field as GameKeys];
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
  function checkField(game: Game, empty: EmptyRegister, field: GameKeys): void {
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
function checkPlaylists(playlists: GamePlaylist[], games: Game[]): string {
  const timeStart = Date.now(); // Start timing
  const dupes = checkDupes(playlists, playlist => playlist.filename); // Find all playlists with duplicate IDs
  const invalidIDs: GamePlaylist[] = playlists.filter(playlist => !uuidValidate(playlist.filename, 4)); // Find all playlists with invalid IDs
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
  invalidIDs.forEach(playlist => { text += `"${playlist.title}" (ID: ${playlist.filename})\n`; });
  text += '\n';
  text += `Playlists with duplicate IDs (${Object.keys(dupes).length}):\n`;
  for (let id in dupes) {
    text += `ID: "${id}" | Playlists (${dupes[id].length}): ${dupes[id].map(playlist => `${playlist.filename}`).join(', ')}\n`;
  }
  text += '\n';
  text += `Playlists with game entry issues (${reports.length}):\n`;
  reports.forEach(({ playlist, duplicateGames, missingGameIDs, invalidGameIDs }) => {
    text += `  "${playlist.title}" (ID: ${playlist.filename}):\n`;
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

// Find and list any used executables missing an entry in the exec mapping file
function checkMissingExecMappings(games: Game[], execMappings: ExecMapping[]): string {
  let allExecs: string[] = [];
  let text = '';
  // Gather list of all unique execs
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    if (allExecs.findIndex((exec) => { return exec === game.applicationPath; }) === -1) {
      allExecs.push(game.applicationPath);
    }
  }
  // Report missing win32 exec mappings
  text += 'Missing "win32" Exec Mappings:\n';
  for (let i = 0; i < allExecs.length; i++) {
    const exec = allExecs[i];
    if (execMappings.findIndex((mapping) => { return mapping.win32 === exec; }) === -1) {
      text += `    ${exec}\n`;
    }
  }
  text += '\n';
  // Report missing linux exec mappings
  text += 'Missing "linux" Exec Mappings:\n';
  for (let i = 0; i < allExecs.length; i++) {
    const exec = allExecs[i];
    if (execMappings.findIndex((mapping) => { return mapping.win32 === exec && mapping.linux; }) === -1) {
      text += `    ${exec}\n`;
    }
  }
  text += '\n';
  // Report missing darwin exec mappings
  text += 'Missing "darwin" Exec Mappings:\n';
  for (let i = 0; i < allExecs.length; i++) {
    const exec = allExecs[i];
    if (execMappings.findIndex((mapping) => { return mapping.win32 === exec && mapping.darwin; }) === -1) {
      text += `    ${exec}\n`;
    }
  }
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

function checkFileLocation(games: Game[]): string {
  const timeStart = Date.now(); // Start timing
  const pathFailed: Game[] = []; // (Games that it failed to get the path from)
  const pathError: [ Game, Error ][] = []; // (Games that it threw an error while attempting to get the path)
  let skippedCount: number = 0; // (Number of skipped games)
  // Try getting the path from all games
  for (let game of games) {
    if (game.broken) { skippedCount += 1; }
    else {
      try {
        const gamePath = getGamePath(game, window.Shared.config.fullFlashpointPath);
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
  const fullFlashpointPath = window.Shared.config.fullFlashpointPath;
  // Create "static" folder structure (folders that should always exist)
  str += 'Creating "static" folders:\n';
  str += '(Folders that should be in every Flashpoint folder)\n\n';
  str += `${fullFlashpointPath}\n`;
  await createFolderStructure(
    fullFlashpointPath, {
      'Data': {
        'Images': [
          LOGOS,
          SCREENSHOTS
        ],
        [LOGOS]: [],
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

function fetchAllGames(): Promise<Game[]> {
  return new Promise((resolve, reject) => {
    window.Shared.back.send<GetAllGamesResponseData>(BackIn.GET_ALL_GAMES, undefined, result => {
      if (result.data) { resolve(result.data.games); }
      else { reject(new Error('Failed to fetch all games. Data is undefined.')); }
    });
  });
}
