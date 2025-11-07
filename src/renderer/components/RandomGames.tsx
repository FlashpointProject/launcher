import { LangContext } from '@renderer/util/lang';
import { isGame } from '@shared/utils/misc';
import { Content, Game, ViewGame } from 'flashpoint-launcher';
import { useContext, useState } from 'react';
import { findGameDragEventDataGrid, getExtremeIconURL, getGameImageURL, getPlatformIconURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';
import { SimpleButton } from './SimpleButton';

type RandomGamesProps = {
  games: ViewGame[];
  selectedGameId?: string;
  /** Generator for game context menu */
  onGameContextMenu: (event: React.MouseEvent, gameId: string, logoPath: string, screenshotPath: string) => void;
  onLaunchGame: (gameId: string) => void;
  onGameSelect: (gameId: string | undefined) => void;
  rollRandomGames: () => void;
};

// A small "grid" of randomly selected games.
export function RandomGames(props: RandomGamesProps) {
  const strings = useContext(LangContext);
  const logoVersion = window.ext.hooks.useAppSelector(state => state.main.logoVersion);
  const screenshotPreviewMode = window.ext.hooks.useAppSelector(state => state.preferences.screenshotPreviewMode);
  const screenshotPreviewDelay = window.ext.hooks.useAppSelector(state => state.preferences.screenshotPreviewDelay);
  const hideExtremeScreenshots = window.ext.hooks.useAppSelector(state => state.preferences.hideExtremeScreenshots);
  const tagFilters = window.ext.hooks.useAppSelector(state => state.preferences.tagFilters);
  const extremeTags = tagFilters.filter(tfg => !tfg.enabled && tfg.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
  const [firstLoad, setFirstLoad] = useState(false);

  if (!firstLoad) {
    setFirstLoad(true);
    if (props.games.length === 0) {
      props.rollRandomGames();
    }
  }

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
    return isGame(game) ? game.platforms.slice(0, 5).map(p => getPlatformIconURL(p, logoVersion)) : [];
  };

  const gameItems = props.games.slice(0, 6).map(game => {
    const extreme = isGame(game) ? game.tags.findIndex(t => extremeTags.includes(t.trim())) !== -1 : false;

    return (
      <GameGridItem
        game={game}
        key={game.id}
        id={game.id}
        title={game.title}
        upperIcons={extreme ? [getExtremeIconURL(logoVersion)] : []}
        lowerIcons={getContentIcons(game)}
        extreme={game ? game.tags.findIndex(t => extremeTags.includes(t.trim())) !== -1 : false}
        thumbnail={getGameImageURL(game.logoPath)}
        screenshot={getGameImageURL(game.screenshotPath)}
        screenshotPreviewMode={screenshotPreviewMode}
        screenshotPreviewDelay={screenshotPreviewDelay}
        hideExtremeScreenshots={hideExtremeScreenshots}
        logoVersion={logoVersion}
        isSelected={props.selectedGameId === game.id}
        isDragged={false} />
    );
  });

  const onGameContextMenu = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, gameId: string, logoPath: string, screenshotPath: string) => {
    return props.onGameContextMenu(event, gameId, logoPath, screenshotPath);
  };

  return (
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
}
