import * as React from 'react';
import { LogData } from '../LogData';
import { SimpleButton } from '../SimpleButton';
import { ICentralState } from '../../interfaces';
import { IGameInfo } from '../../../shared/game/interfaces';
import { GameImageCollection } from '../../image/GameImageCollection';
import * as validateUUID from 'uuid-validate';

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
      text: 'SUPER\nMARIO\nSUPER\nSHOW',
    };
  }

  render() {
    const { text } = this.state;
    return (
      <div className='developer-page simple-scroll'>
        <div className='developer-page__inner'>
          <h1 className='developer-page__title'>Developer</h1>
          This is where all the useful developer tools will go.
          <div>
            <SimpleButton value='Check Missing Images' onClick={this.onCheckMissingImagesClick} />
            <SimpleButton value='Check Game IDs' onClick={this.onCheckGameIDsClick} />
            <LogData className='developer-page__content' logData={text} />
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
  text += `Check for games with missing images (in ${timeEnd - timeStart}ms)\n`;
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
    if (!validateUUID(game.id, 4)) {
      invalidIDs.push(game);
    }
    // Add ID to registry (to check for duplicates)
    if (!ids[game.id]) { ids[game.id] = []; }
    else { dupes.push(game.id); }
    ids[game.id].push(game);
  }
  const timeEnd = Date.now(); // End timing
  // Write log message
  let text = '';
  text += `Check for games with duplicate IDs (in ${timeEnd - timeStart}ms)\n`;
  text += `\n`;
  text += `Games with duplicate IDs:\n`;
  dupes.forEach(id => {
    text += `ID: "${id}" | Games: ${ids[id].map(game => `"${game.title}"`).join(', ')}\n`;
  });
  text += `\n`;
  text += `Games with invalid IDs (${invalidIDs.length}):\n`;
  invalidIDs.forEach(game => { text += `"${game.title}" (ID: ${game.id})\n`; });
  return text;
}
