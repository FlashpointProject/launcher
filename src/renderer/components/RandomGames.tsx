import { Game } from '@database/entity/Game';
import { LangContext } from '@renderer/util/lang';
import { BackIn, RandomGamesData, RandomGamesResponseData } from '@shared/back/types';
import { LOGOS } from '@shared/constants';
import * as React from 'react';
import { useRef, useState } from 'react';
import { findElementAncestor, getGameImageURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';
import { SimpleButton } from './SimpleButton';

type RandomGamesProps = {
  broken: boolean;
  extreme: boolean;
  onLaunchGame: (gameId: string) => void;
};

/** A small "grid" of randomly selected games. */
export function RandomGames(props: RandomGamesProps) {
  const [games, setGames] = useState<Game[]>([]);
  const requesting = useRef(false);
  const unmounted = useRef(false);
  const strings = React.useContext(LangContext);

  const rollRandomGames = React.useCallback(() => {
    if (unmounted.current) { return; }

    // If there are more games, shift them forward
    if (games.length >= 10) {
      setGames(games.slice(5));
    }
    // If there are less than 3 rolls on the queue, request 10 more
    else if (games.length <= 15 && !requesting.current) {
      requesting.current = true;
      window.Shared.back.send<RandomGamesResponseData, RandomGamesData>(BackIn.RANDOM_GAMES, {
        count: 50,
        broken: props.broken,
        extreme: props.extreme,
      }, (res) => {
        if (unmounted.current) { return; }
        requesting.current = false;
        if (res.data) {
          setGames([
            ...games.slice(5), // Remove currently displayed games
            ...res.data,
          ]);
        }
      });
    }
  }, [games]);

  React.useEffect(() => {
    rollRandomGames(); // Request initial queue

    return () => { unmounted.current = true; };
  }, []);

  const onLaunchGame = React.useCallback((event: React.MouseEvent, gameId: string) => {
    props.onLaunchGame(gameId);
  }, [props.onLaunchGame]);

  const gameItems = React.useMemo(() => (
    // Games is a long queue, only render front
    games.slice(0, 5).map(game => (
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
    <div className='home-page__box home-page__box--random_picks'>
      <div className='home-page__box-head'>{strings.home.randomPicks}</div>
      <ul className='home-page__box-body'>
        <GameItemContainer
          className='random-games'
          onGameLaunch={onLaunchGame}
          findGameId={findGameId}>
          { gameItems }
        </GameItemContainer>
        <SimpleButton
          value={strings.home.rerollPicks}
          onClick={rollRandomGames} />
      </ul>
    </div>
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
