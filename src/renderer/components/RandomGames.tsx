import * as React from 'react';
import { IGameInfo } from '../../shared/game/interfaces';
import { GameImageCollection } from '../image/GameImageCollection';
import { GameGridItem } from './GameGridItem';
import { shuffle } from '../Util';
import { filterExtreme, filterBroken } from '../../shared/game/GameFilter';

export interface IRandomGamesProps {
  games: IGameInfo[];
  gameImages: GameImageCollection;
  onLaunchGame: (game: IGameInfo, index: number) => void;
  showExtreme: boolean;
  showBroken: boolean;
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
    const { games, showExtreme, showBroken } = this.props;
    const filteredGames = filterBroken(showBroken, filterExtreme(showExtreme, games));
    const shuffledGames = shuffle(filteredGames);
    const randomGames = shuffledGames.slice(0, Math.min(this.amountOfRandomGames, games.length));
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
