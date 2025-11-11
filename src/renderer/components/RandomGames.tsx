import { getPointer } from '@renderer/context/MenuContext';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { useContextMenu } from '@renderer/hooks/useContextMenu';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { isGame } from '@shared/utils/misc';
import { Content, Game } from 'flashpoint-launcher';
import { RandomGamesProps } from 'flashpoint-launcher-renderer';
import { useState } from 'react';
import { findGameDragEventDataGrid, getExtremeIconURL, getPlatformIconURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';
import { SimpleButton } from './SimpleButton';

// A small "grid" of randomly selected games.
export function RandomGames(props: RandomGamesProps) {
  const strings = useLocalization();
  const { openGameContextMenu } = useContextMenu();
  const logoVersion = useAppSelector(state => state.main.logoVersion);
  const screenshotPreviewMode = useAppSelector(state => state.preferences.screenshotPreviewMode);
  const screenshotPreviewDelay = useAppSelector(state => state.preferences.screenshotPreviewDelay);
  const hideExtremeScreenshots = useAppSelector(state => state.preferences.hideExtremeScreenshots);
  const tagFilters = useAppSelector(state => state.preferences.tagFilters);
  const extremeTags = tagFilters.filter(tfg => !tfg.enabled && tfg.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
  const [firstLoad, setFirstLoad] = useState(false);

  if (!firstLoad) {
    setFirstLoad(true);
    if (props.games.length === 0) {
      props.rollRandomGames();
    }
  }

  const onGameContextMenu = (event: React.MouseEvent, gameId: string, logoPath: string, screenshotPath: string) => {
    openGameContextMenu(gameId, logoPath, screenshotPath, getPointer(event));
  };


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
        upperIcons={extreme ? [getExtremeIconURL(logoVersion)] : []}
        lowerIcons={getContentIcons(game)}
        extreme={game ? game.tags.findIndex(t => extremeTags.includes(t.trim())) !== -1 : false}
        screenshotPreviewMode={screenshotPreviewMode}
        screenshotPreviewDelay={screenshotPreviewDelay}
        hideExtremeScreenshots={hideExtremeScreenshots}
        logoVersion={logoVersion}
        isSelected={props.selectedGameId === game.id}
        isDragged={false} />
    );
  });

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
