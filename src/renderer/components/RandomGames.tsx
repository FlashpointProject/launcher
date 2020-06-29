import { LangContext } from '@renderer/util/lang';
import { ViewGame } from '@shared/back/types';
import { LOGOS } from '@shared/constants';
import * as React from 'react';
import { findElementAncestor, getGameImageURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';
import { SimpleButton } from './SimpleButton';

type RandomGamesProps = {
  games: ViewGame[];
  onLaunchGame: (gameId: string) => void;
  rollRandomGames: () => void;
};

/** A small "grid" of randomly selected games. */
export function RandomGames(props: RandomGamesProps) {
  const strings = React.useContext(LangContext);

  const onLaunchGame = React.useCallback((event: React.MouseEvent, gameId: string) => {
    props.onLaunchGame(gameId);
  }, [props.onLaunchGame]);

  const gameItems = React.useMemo(() => (
    /* Games is a long queue, only render front */
    props.games.slice(0, 5).map(game => (
      <GameGridItem
        key={game.id}
        id={game.id}
        title={game.title}
        platform={game.platform}
        thumbnail={getGameImageURL(LOGOS, game.id)}
        isSelected={false}
        isDragged={false} />
    ))
  ), [props.games]);

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
          onClick={props.rollRandomGames} />
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
