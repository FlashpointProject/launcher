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
  selectedGameId?: string;
  /** Generator for game context menu */
  onGameContextMenu: (gameId: string) => void;
  onLaunchGame: (gameId: string) => void;
  onGameSelect: (gameId: string | undefined) => void;
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

  const onGameSelect = React.useCallback((event: React.MouseEvent, gameId: string | undefined) => {
    props.onGameSelect(gameId);
  }, [props.onGameSelect]);

  const onLaunchGame = React.useCallback((event: React.MouseEvent, gameId: string) => {
    props.onLaunchGame(gameId);
  }, [props.onLaunchGame]);

  const onRerollPicks = React.useCallback(() => {
    props.rollRandomGames();
  }, [props.rollRandomGames]);

  const gameItems = React.useMemo(() => {
    /* Games is a long queue, only render front */
    return (
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
          isSelected={props.selectedGameId === game.id}
          isDragged={false} />
      ))
    );
  }, [props.games, props.selectedGameId, props.logoVersion, props.extremeTags]);

  const onGameContextMenu = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, gameId: string) => {
    return props.onGameContextMenu(gameId);
  };

  const render = (
    <>
      <GameItemContainer
        className='random-games'
        onGameContextMenu={onGameContextMenu}
        onGameSelect={onGameSelect}
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
