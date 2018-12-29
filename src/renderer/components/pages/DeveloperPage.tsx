import * as React from 'react';
import { LogData } from '../LogData';
import { SimpleButton } from '../SimpleButton';
import { ICentralState } from '../../interfaces';
import { IGameInfo } from '../../../shared/game/interfaces';
import { GameImageCollection } from '../../image/GameImageCollection';
import { validateSemiUUID } from '../../uuid';

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
}

function checkMissingGameImages(games: IGameInfo[], gameImages: GameImageCollection): string {
  const timeStart = Date.now(); // Start timing
  // Find all games with missing thumbnails and screenshots
  const missingThumbnails: IGameInfo[] = [];
  const missingScreenshots: IGameInfo[] = [];
  for (let i = 0; i < games.length - 1; i++) {
    const game = games[i];
    if (gameImages.getThumbnailPath(game.title, game.platform) === undefined) {
      missingThumbnails.push(game);
    }
    if (gameImages.getScreenshotPath(game.title, game.platform) === undefined) {
      missingScreenshots.push(game);
    }
  }
  const timeEnd = Date.now(); // End timing
  // Write log message
  let text = '';
  text += `Checked games for missing images (in ${timeEnd - timeStart}ms)\n`;
  text += `\n`;
  text += `Games with missing thumbnails (${missingThumbnails.length}):\n`;
  missingThumbnails.forEach((game) => { text += `"${game.title}" (ID: ${game.id})\n`; });
  text += `\n`;
  text += `Games with missing screenshots (${missingScreenshots.length}):\n`;
  missingScreenshots.forEach((game) => { text += `"${game.title}" (ID: ${game.id})\n`; });
  return text;
}

function checkGameIDs(games: IGameInfo[]): string {
  const timeStart = Date.now(); // Start timing
  // Find all games with duplicate and invalid IDs
  const ids: { [key: string]: IGameInfo[] } = {};
  const dupes: string[] = [];
  const invalidIDs: IGameInfo[] = [];
  for (let i = 0; i < games.length - 1; i++) {
    const game = games[i];
    // Check if ID is valid
    if (!validateSemiUUID(game.id)) {
      invalidIDs.push(game);
    }
    // Add ID to registry (to check for duplicates)
    if (!ids[game.id]) { ids[game.id] = []; }
    else if (ids[game.id].length === 1) { dupes.push(game.id); }
    ids[game.id].push(game);
  }
  const timeEnd = Date.now(); // End timing
  // Write log message
  let text = '';
  text += `Checked games for duplicate and invalid IDs (in ${timeEnd - timeStart}ms)\n`;
  text += `\n`;
  text += `Games with duplicate IDs:\n`;
  dupes.forEach(id => {
    text += `ID: "${id}" | Games (${ids[id].length}): ${ids[id].map(game => `"${game.title}"`).join(', ')}\n`;
  });
  text += `\n`;
  text += `Games with invalid IDs (${invalidIDs.length}):\n`;
  invalidIDs.forEach(game => { text += `"${game.title}" (ID: ${game.id})\n`; });
  return text;
}

function checkGameTitles(games: IGameInfo[]): string {
  const timeStart = Date.now(); // Start timing
  // Find all games with duplicate titles
  const titles: { [key: string]: IGameInfo[] } = {};
  const dupes: string[] = [];
  for (let i = 0; i < games.length - 1; i++) {
    const game = games[i];
    // Add name to registry (to check for duplicates)
    if (!titles[game.title]) { titles[game.title] = []; }
    else if (titles[game.title].length === 1) { dupes.push(game.title); }
    titles[game.title].push(game);
  }
  const timeEnd = Date.now(); // End timing
  // Write log message
  let text = '';
  text += `Checked all games for duplicate titles (in ${timeEnd - timeStart}ms)\n`;
  text += `\n`;
  text += `Games with duplicate titles:\n`;
  dupes.forEach(name => {
    text += `Name: "${name}" | Games (${titles[name].length}): ${titles[name].map(game => `${game.id}`).join(', ')}\n`;
  });
  return text;
}
