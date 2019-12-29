import * as React from 'react';
import { useState } from 'react';
import { BackIn, RandomGamesData, RandomGamesResponseData } from '../../shared/back/types';
import { LOGOS } from '../../shared/constants';
import { IGameInfo } from '../../shared/game/interfaces';
import { findElementAncestor, getGameImageURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';

type RandomGamesProps = {
  broken: boolean;
  extreme: boolean;
  onLaunchGame: (gameId: string) => void;
};

/** A small "grid" of randomly selected games. */
export function RandomGames(props: RandomGamesProps) {
  const [games, setGames] = useState<IGameInfo[]>([]);

  React.useEffect(() => {
    window.External.back.send<RandomGamesResponseData, RandomGamesData>(
      BackIn.RANDOM_GAMES,
      {
        count: 6,
        broken: props.broken,
        extreme: props.extreme,
      },
      res => { if (res.data) { setGames(res.data); } }
    );
  }, []);

  const onLaunchGame = React.useCallback((event: React.MouseEvent, gameId: string) => {
    props.onLaunchGame(gameId);
  }, [props.onLaunchGame]);

  const gameItems = React.useMemo(() => (
    games.map(game => (
      <GameGridItem
        key={game.id}
        id={game.id}
        title={game.title}
        platform={game.platform}
        thumbnail={getGameImageURL(LOGOS, game.id)}
        isSelected={false}
        isDragged={false} />
    ))
  ), [games]);

  return (
    <GameItemContainer
      className='random-games'
      onGameLaunch={onLaunchGame}
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
