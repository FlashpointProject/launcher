import * as React from 'react';
import { filterBroken, filterExtreme } from '../../shared/game/GameFilter';
import { IGameInfo } from '../../shared/game/interfaces';
import { GameImageCollection } from '../image/GameImageCollection';
import { shuffle, findElementAncestor } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';

interface IRandomGamesProps {
  games: IGameInfo[];
  gameImages: GameImageCollection;
  onLaunchGame: (game: IGameInfo) => void;
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
      <GameItemContainer className='random-games'
                         onGameLaunch={(event, gameId) => {
                           const game = randomGames.find(game => game.id === gameId);
                           if (game) { onLaunchGame(game); }
                         }}
                         findGameId={this.findGameId}>
        {randomGames.map(game => (
          <GameGridItem
            key={game.id}
            game={game}
            thumbnail={gameImages.getThumbnailPath(game) || ''}
            isSelected={false}
            isDragged={false} />
        ))}
      </GameItemContainer>
    );
  }

  /** Find a game's ID. */
  private findGameId = (element: EventTarget): string | undefined => {
    const game = findElementAncestor(element as Element, target => GameGridItem.isElement(target), true);
    if (game) { return GameGridItem.getId(game); }
  }
}
