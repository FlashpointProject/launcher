import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { ViewGame } from '../../shared/back/types';
import { findElementAncestor, getGameImageURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';

type RandomGamesProps = {
  /** Called when the user attempts to launch a game. */
  onLaunchGame: (gameId: string) => void;
  /** If extreme games could be picked and displayed. */
  showExtreme: boolean;
  /** If broken games could be picked and displayed. */
  showBroken: boolean;
};

/** The number of games shown in the RandomGames component. */
const numberOfGames = 6;

/** A small "grid" of randomly selected games. */
export function RandomGames(props: RandomGamesProps) {
  // Select random games to display
  const randomGames = useMemo((): ViewGame[] => {
    // @FIXTHIS Select random games
    return [];
  }, [/* Only pick games on the first render. */]);
  // Launch Callback
  const onGameLaunch = useCallback((event: React.MouseEvent, gameId: string) => {
    props.onLaunchGame(gameId);
  }, []);
  // Render games
  const gameItems = React.useMemo(() => (
    randomGames.map(game => (
      <GameGridItem
        key={game.id}
        id={game.id}
        title={game.title}
        platform={game.platform}
        thumbnail={getGameImageURL('Logos', game.id)}
        isSelected={false}
        isDragged={false} />
    ))
  ), [randomGames]);
  // Render
  return (
    <GameItemContainer
      className='random-games'
      onGameLaunch={onGameLaunch}
      findGameId={findGameId}>
      { gameItems }
    </GameItemContainer>
  );
}

/**
 * Try getting a game ID by checking an element and all of its ancestors.
 * @param element Element or sub-element of a game.
 */
function findGameId(element: EventTarget): string | undefined {
  const game = findElementAncestor(element as Element, target => GameGridItem.isElement(target), true);
  if (game) { return GameGridItem.getId(game); }
}
