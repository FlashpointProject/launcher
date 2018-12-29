import * as React from 'react';
import { LogData } from '../LogData';
import { SimpleButton } from '../SimpleButton';
import { ICentralState } from '../../interfaces';
import { IGameInfo } from 'src/shared/game/interfaces';

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
            <SimpleButton value='Check Images' onClick={this.onCheckImagesClick} />
            <LogData className='developer-page__content' logData={text} />
          </div>
        </div>
      </div>
    );
  }

  private onCheckImagesClick = (): void => {
    const timeStart = Date.now(); // Start timing
    const games = this.props.central.games.collection.games;
    const gameImages = this.props.central.gameImages;
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
    this.setState({ text });
  }
}
