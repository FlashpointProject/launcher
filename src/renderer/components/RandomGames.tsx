/* eslint-disable @typescript-eslint/indent */
import { LangContext } from '@renderer/util/lang';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import * as React from 'react';
import { findGameDragEventDataGrid, getExtremeIconURL, getGameImageURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';
import { HomePageBox } from './HomePageBox';
import { SimpleButton } from './SimpleButton';
import { Game, TagFilter, ViewGame } from 'flashpoint-launcher';
import { ScreenshotPreviewMode } from '@shared/BrowsePageLayout';

type RandomGamesProps = {
  games: ViewGame[];
  selectedGameId?: string;
  /** Generator for game context menu */
  onGameContextMenu: (gameId: string) => void;
  onLaunchGame: (gameId: string) => void;
  onGameSelect: (gameId: string | undefined) => void;
  rollRandomGames: () => void;
  extremeTags: string[];
  /** Tag Filter icons */
  tagGroupIcons: { tagFilter: TagFilter; iconBase64: string; }[];
  /** Update to clear platform icon cache */
  logoVersion: number;
  minimized: boolean;
  onToggleMinimize: () => void;
  /** Screenshot Preview Mode */
  screenshotPreviewMode: ScreenshotPreviewMode;
  /** Screenshot Preview Delay */
  screenshotPreviewDelay: number;
  /** Hide extreme screenshots */
  hideExtremeScreenshots: boolean;
};

// A small "grid" of randomly selected games.
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
          platforms={game.platforms.map(p => p.trim())}
          extreme={game ? game.tags.findIndex(t => props.extremeTags.includes(t.trim())) !== -1 : false}
          extremeIconPath={getExtremeIconURL(props.logoVersion)}
          tagGroupIconBase64={props.tagGroupIcons.find(tg => tg.tagFilter.find(t => game?.tags.includes(t)))?.iconBase64 || ''}
          thumbnail={getGameImageURL(LOGOS, game.id)}
          screenshot={getGameImageURL(SCREENSHOTS, game.id)}
          screenshotPreviewMode={props.screenshotPreviewMode}
          screenshotPreviewDelay={props.screenshotPreviewDelay}
          hideExtremeScreenshots={props.hideExtremeScreenshots}
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
        findGameDragEventData={findGameDragEventDataGrid}>
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
