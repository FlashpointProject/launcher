/* eslint-disable @typescript-eslint/indent */
import { LangContext } from '@renderer/util/lang';
import { ViewGame } from '@shared/back/types';
import { LOGOS } from '@shared/constants';
import * as React from 'react';
import { findElementAncestor, getExtremeIconURL, getGameImageURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';
import { HomePageBox } from './HomePageBox';
import { SimpleButton } from './SimpleButton';

type RandomGamesProps = {
  games: ViewGame[];
  onLaunchGame: (gameId: string) => void;
  rollRandomGames: () => void;
  extremeTags: string[];
  /** Update to clear platform icon cache */
  logoVersion: number;
  minimized: boolean;
  onToggleMinimize: () => void;
};

/** A small "grid" of randomly selected games. */
export function RandomGames(props: RandomGamesProps) {
  const strings = React.useContext(LangContext);

  const onLaunchGame = React.useCallback((event: React.MouseEvent, gameId: string) => {
    props.onLaunchGame(gameId);
  }, [props.onLaunchGame]);

  const onRerollPicks = React.useCallback(() => {
    props.rollRandomGames();
  }, [props.rollRandomGames]);

  const gameItems = React.useMemo(() => (
    /* Games is a long queue, only render front */
    props.games.slice(0, 6).map(game => (
      <GameGridItem
        key={game.id}
        id={game.id}
        title={game.title}
        platform={game.platform}
        extreme={game ? game.tagsStr.split(';').findIndex(t => props.extremeTags.includes(t.trim())) !== -1 : false}
        extremeIconPath={getExtremeIconURL(props.logoVersion)}
        thumbnail={getGameImageURL(LOGOS, game.id)}
        logoVersion={props.logoVersion}
        isSelected={false}
        isDragged={false} />
    ))
  ), [props.games]);

  const render = (
    <>
      <GameItemContainer
        className='random-games'
        onGameLaunch={onLaunchGame}
        findGameId={findGameId}>
        {gameItems}
      </GameItemContainer>
      <SimpleButton
        value={strings.home.rerollPicks}
        onClick={onRerollPicks} />
    </>
  );

  return (
    <HomePageBox
      minimized={props.minimized}
      title={strings.home.randomPicks}
      cssKey='random-games'
      onToggleMinimize={props.onToggleMinimize}>
        {render}
    </HomePageBox>
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
