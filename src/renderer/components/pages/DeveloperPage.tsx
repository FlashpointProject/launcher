import * as React from 'react';
import { LogData } from '../LogData';
import { SimpleButton } from '../SimpleButton';
import { ICentralState } from '../../interfaces';
import { IGameInfo } from '../../../shared/game/interfaces';
import { GameImageCollection } from '../../image/GameImageCollection';
import { validateSemiUUID } from '../../uuid';
import { IGamePlaylist, IGamePlaylistEntry } from '../../playlist/interfaces';
import * as uuidValidate from 'uuid-validate';
import { removeFileExtension } from '../../../shared/Util';

interface IDeveloperPageProps {
  central: ICentralState;
}

interface IDeveloperPageState {
  text: string;
}

export class DeveloperPage extends React.Component<IDeveloperPageProps, IDeveloperPageState> {
  constructor(props: IDeveloperPageProps) {
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
            <SimpleButton value='Check Missing Images' onClick={this.onCheckMissingImagesClick}
                          title='List all games without a thumbnail or screenshot.' />
            <SimpleButton value='Check Game IDs' onClick={this.onCheckGameIDsClick}
                          title='List all games with duplicate or invalid IDs' />
            <SimpleButton value='Check Game Titles' onClick={this.onCheckGameNamesClick}
                          title='List all games with duplicate titles' />
            <SimpleButton value='Check Game Fields' onClick={this.onCheckGameFieldsClick}
                          title='List all games with empty fields (of the fields that should not be empty)' />
            <SimpleButton value='Check Playlists' onClick={this.onCheckPlaylistsClick}
                          title='List all playlists with duplicate or invalid IDs, or that has game entries with missing, invalid or duplicate IDs' />
            <LogData className='developer-page__log' logData={text} />
          </div>
        </div>
      </div>
    );
  }

  private onCheckMissingImagesClick = (): void => {
    const games = this.props.central.games.collection.games;
    const gameImages = this.props.central.gameImages;
    this.setState({ text: checkMissingGameImages(games, gameImages) });
  }

  private onCheckGameIDsClick = (): void => {
    const games = this.props.central.games.collection.games;
    this.setState({ text: checkGameIDs(games) });
  }

  private onCheckGameNamesClick = (): void => {
    const games = this.props.central.games.collection.games;
    this.setState({ text: checkGameTitles(games) });
  }

  private onCheckGameFieldsClick = (): void => {
    const games = this.props.central.games.collection.games;
    this.setState({ text: checkGameEmptyFields(games) });
  }

  private onCheckPlaylistsClick = (): void => {
    const playlists = this.props.central.playlists.playlists;
    const games = this.props.central.games.collection.games;
    this.setState({ text: checkPlaylists(playlists, games) });
  }
}

function checkMissingGameImages(games: IGameInfo[], gameImages: GameImageCollection): string {
  const timeStart = Date.now(); // Start timing
  // Find all games with missing thumbnails and screenshots
  const missingThumbnails:  IGameInfo[] = games.filter(game =>
    gameImages.getThumbnailPath(removeFileExtension(game.filename), game.title, game.id) === undefined
  );
  const missingScreenshots: IGameInfo[] = games.filter(game => 
    gameImages.getScreenshotPath(removeFileExtension(game.filename), game.title, game.id) === undefined
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

type FilterFlags<Base, Condition> = {
  [Key in keyof Base]: Base[Key] extends Condition ? Key : never
};
type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[keyof Base];
