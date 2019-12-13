import * as React from 'react';
import { useState } from 'react';
import { BackIn, LaunchGameData, RandomGamesData, RandomGamesResponseData } from '../../shared/back/types';
import { IGameInfo } from '../../shared/game/interfaces';
import { findElementAncestor, getGameImageURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';

type RandomGamesProps = {
  /** If extreme games could be picked and displayed. */
  showExtreme: boolean;
  /** If broken games could be picked and displayed. */
  showBroken: boolean;
};

/** A small "grid" of randomly selected games. */
export function RandomGames(props: RandomGamesProps) {
  const [games, setGames] = useState<IGameInfo[]>([]);

  React.useEffect(() => {
    window.External.back.send<RandomGamesResponseData, RandomGamesData>(
      BackIn.RANDOM_GAMES,
      { count: 6, },
      res => { if (res.data) { setGames(res.data); } }
    );
  }, []);

  const gameItems = React.useMemo(() => (
    games.map(game => (
      <GameGridItem
        key={game.id}
        id={game.id}
        title={game.title}
        platform={game.platform}
        thumbnail={getGameImageURL('Logos', game.id)}
        isSelected={false}
        isDragged={false} />
    ))
  ), [games]);

  return (
    <GameItemContainer
      className='random-games'
      onGameLaunch={onGameLaunch}
      findGameId={findGameId}>
      { gameItems }
    </GameItemContainer>
  );
}

function onGameLaunch(event: React.MouseEvent, gameId: string): void {
  window.External.back.send<LaunchGameData>(BackIn.LAUNCH_GAME, { id: gameId });
}

/**
 * Try getting a game ID by checking an element and all of its ancestors.
 * @param element Element or sub-element of a game.
 */
function findGameId(element: EventTarget): string | undefined {
  const game = findElementAncestor(element as Element, target => GameGridItem.isElement(target), true);
  if (game) { return GameGridItem.getId(game); }
}
