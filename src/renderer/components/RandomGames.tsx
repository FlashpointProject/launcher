import * as React from 'react';
import { IGameInfo } from '../../shared/game/interfaces';
import { GameImageCollection } from '../image/GameImageCollection';
import { GameGridItem } from './GameGridItem';
import { shuffle } from '../Util';
import { filterExtreme, filterBroken } from '../../shared/game/GameFilter';
import { removeFileExtension } from '../../shared/Util';

interface IRandomGamesProps {
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
  private static amountOfRandomGames = 6;

  private selectRandomGames() {
    const { games, showExtreme, showBroken } = this.props;
    const filteredGames = filterBroken(showBroken, filterExtreme(showExtreme, games));
    const shuffledGames = shuffle(filteredGames);
    const randomGames = shuffledGames.slice(0, Math.min(RandomGames.amountOfRandomGames, games.length));
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
            thumbnail={gameImages.getThumbnailPath(removeFileExtension(game.filename), game.title, game.id) || ''}
            onDoubleClick={onLaunchGame}
            isSelected={false}
            isDragged={false}
            index={index} />
        ))}
      </div>
    );
  }
}
