import * as React from 'react';
import { IGameInfo } from 'src/shared/game/interfaces';
import { GameImageCollection } from '../image/GameImageCollection';
import { GameGridItem } from './GameGridItem';
import { shuffle } from '../Util';

export interface IRandomGamesProps {
  gameImages: GameImageCollection;
  games: IGameInfo[];
  onLaunchGame: (game: IGameInfo, index: number) => void;
}

/**
 * List of random games.
 *
 * This is a React.PureComponent to prevent it from re-rendering when it's
 * props didn't change. Otherwise it would regenerate the list when you e.g.
 * launch one of the games.
 */
export class RandomGames extends React.PureComponent<IRandomGamesProps> {
  amountOfRandomGames = 6;

  private selectRandomGames() {
    const { games } = this.props;

    const shuffledGames = shuffle(games);
    const randomGames = shuffledGames
      .slice(0, Math.min(this.amountOfRandomGames, games.length));

    return randomGames;
  }

  render() {
    const { gameImages, onLaunchGame } = this.props;
    const randomGames = this.selectRandomGames();

    return (
      <div className='random-games'>
        {randomGames.map((game, index) => (
          <GameGridItem
            key={game.id}
            game={game}
            thumbnail={gameImages.getThumbnailPath(game.title, game.platform) || ''}
            onDoubleClick={onLaunchGame}
            isSelected={false}
            isDragged={false}
            index={index} />
        ))}
      </div>
    );
  }
}
