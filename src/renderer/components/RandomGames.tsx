import { LangContext } from '@renderer/util/lang';
import { ScreenshotPreviewMode } from '@shared/BrowsePageLayout';
import { isGame } from '@shared/utils/misc';
import { Content, Game, ViewGame } from 'flashpoint-launcher';
import * as React from 'react';
import { findGameDragEventDataGrid, getExtremeIconURL, getGameImageURL, getPlatformIconURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';
import { HomePageBox } from './HomePageBox';
import { SimpleButton } from './SimpleButton';

type RandomGamesProps = {
  games: ViewGame[];
  selectedGameId?: string;
  /** Generator for game context menu */
  onGameContextMenu: (event: React.MouseEvent, gameId: string, logoPath: string, screenshotPath: string) => void;
  onLaunchGame: (gameId: string) => void;
  onGameSelect: (gameId: string | undefined) => void;
  rollRandomGames: () => void;
  extremeTags: string[];
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

  const onGameSelect = (event: React.MouseEvent, gameId: string | undefined) => {
    props.onGameSelect(gameId);
  };

  const onLaunchGame = (event: React.MouseEvent, gameId: string) => {
    props.onLaunchGame(gameId);
  };

  const onRerollPicks = () => {
    props.rollRandomGames();
  };

  const getContentIcons = (game: Content | Game) => {
    return isGame(game) ? game.platforms.slice(0, 5).map(p => getPlatformIconURL(p, props.logoVersion)) : [];
  };

  const gameItems = props.games.slice(0, 6).map(game => {
    const extreme = isGame(game) ? game.tags.findIndex(t => props.extremeTags.includes(t.trim())) !== -1 : false;

    return (
      <GameGridItem
        game={game}
        key={game.id}
        id={game.id}
        title={game.title}
        upperIcons={extreme ? [getExtremeIconURL(props.logoVersion)] : []}
        lowerIcons={getContentIcons(game)}
        extreme={game ? game.tags.findIndex(t => props.extremeTags.includes(t.trim())) !== -1 : false}
        thumbnail={getGameImageURL(game.logoPath)}
        screenshot={getGameImageURL(game.screenshotPath)}
        screenshotPreviewMode={props.screenshotPreviewMode}
        screenshotPreviewDelay={props.screenshotPreviewDelay}
        hideExtremeScreenshots={props.hideExtremeScreenshots}
        logoVersion={props.logoVersion}
        isSelected={props.selectedGameId === game.id}
        isDragged={false} />
    );
  });

  const onGameContextMenu = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, gameId: string, logoPath: string, screenshotPath: string) => {
    return props.onGameContextMenu(event, gameId, logoPath, screenshotPath);
  };

  const render = (
    <>
      <GameItemContainer
        className='random-games'
        onGameContextMenu={onGameContextMenu}
        onContentSelect={onGameSelect}
        onContentLaunch={onLaunchGame}
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
