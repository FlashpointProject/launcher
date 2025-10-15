
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { requestRange, selectGame, setGridScroll, setListScroll } from '@renderer/store/search/slice';
import { gameDragDataType, getPlatformIconURL } from '@renderer/Util';
import { LangContext } from '@renderer/util/lang';
import { BackIn } from '@shared/back/types';
import { isGame } from '@shared/utils/misc';
import { formatString } from '@shared/utils/StringFormatter';
import { delayedThrottle } from '@shared/utils/throttle';
import { Content, Game, ResultsView } from 'flashpoint-launcher';
import { BrowsePageDisplayGridProps, BrowsePageDisplayListProps, BrowsePageDisplayProps } from 'flashpoint-launcher-renderer';
import React, { useContext, useState } from 'react';
import { ScrollIndices } from 'react-virtualized';
import { GameGrid } from './GameGrid';
import { GameList } from './GameList';
import { GameDragData, GameDragEventData } from './pages/BrowsePage';
import { Spinner } from './Spinner';
import { calcScale } from '@shared/Util';

export function WebgameBrowsePageDisplayGrid(props: BrowsePageDisplayProps<Game>) {
  const getContentIcons = (game: Content | Game) => {
    return isGame(game) ? game.platforms.slice(0, 5).map(p => getPlatformIconURL(p, props.logoVersion)) : [];
  };

  const onContentRun = async (gameId: string): Promise<void> => {
    await window.Shared.back.request(BackIn.LAUNCH_GAME, gameId, 'flashpoint-archive');
  };

  return (
    <BrowsePageDisplayGrid
      onContentRun={onContentRun}
      getContentIcons={getContentIcons}
      {...props} />
  );
}

export function WebgameBrowsePageDisplayList(props: BrowsePageDisplayProps<Game>) {
  const onContentRun = async (gameId: string): Promise<void> => {
    await window.Shared.back.request(BackIn.LAUNCH_GAME, gameId, 'flashpoint-archive');
  };

  return (
    <BrowsePageDisplayList
      onContentRun={onContentRun}
      {...props} />
  );
}

export function BrowsePageDisplayGrid<T extends Content>(props: BrowsePageDisplayGridProps<T>) {
  const scale = useAppSelector(state => state.preferences.scaleValues.browse);
  const screenshotPreviewDelay = useAppSelector(state => state.preferences.screenshotPreviewDelay);
  const screenshotPreviewMode = useAppSelector(state => state.preferences.screenshotPreviewMode);
  const hideExtremeScreenshots = useAppSelector(state => state.preferences.hideExtremeScreenshots);
  const dispatch = useAppDispatch();
  const { view, getContentIcons, onContentRun, logoVersion, extremeTags, onMovePlaylistEntry } = props;
  const [draggedContentIndex, setDraggedContentIndex] = useState<number | null>(null);

  const updateViewRange = delayedThrottle((start: number, count: number) => {
    dispatch(requestRange({
      view: view.id,
      searchId: view.data.searchId,
      start,
      count
    }));
  }, 100);

  const onGridScrollToChange = (params: ScrollIndices, columns: number) => {
    const content = view.data.content[params.scrollToRow * columns + params.scrollToColumn];
    if (content) {
      onContentCellSelect(content.id, params.scrollToColumn, params.scrollToRow);
    }
  };

  const onContentDragStart = (event: React.DragEvent, dragEventData: GameDragEventData): void => {
    const data: GameDragData = {
      ...dragEventData,
      sourceTable: 'browse-page'
    };
    console.log(data);
    setDraggedContentIndex(dragEventData.index);
    event.dataTransfer.setData(gameDragDataType, JSON.stringify(data));
  };

  const onContentDragEnd = (event: React.DragEvent): void => {
    setDraggedContentIndex(null);
    event.dataTransfer.clearData(gameDragDataType);
  };

  const onContentCellSelect = async (contentId?: string, col?: number, row?: number): Promise<void> => {
    if (view.selectedGame?.id !== contentId && contentId) {
      const game = await window.Shared.back.request(BackIn.GET_GAME, contentId);
      if (game) {
        if (col !== undefined && row !== undefined) {
          dispatch(setGridScroll({
            view: view.id,
            col,
            row
          }));
        }
        dispatch(selectGame({
          view: view.id,
          game,
        }));
      }
    }
  };

  const height: number = calcScale(210, 390, scale);
  const width: number = (height * 0.666) | 0;
  const gameGridProps = {
    scrollCol: view.gridScrollCol,
    scrollRow: view.gridScrollRow,
    onScrollToChange: onGridScrollToChange
  };

  return (
    <GameGrid
      view={view}
      resultsTotal={view.data.total !== undefined ? view.data.total : Object.keys(view.data.content).length}
      insideOrderedPlaylist={view.selectedPlaylist !== undefined && view.advancedFilter.playlistOrder}
      selectedContent={view.selectedGame}
      draggedContentIndex={draggedContentIndex}
      extremeTags={extremeTags}
      noRowsRenderer={() => <BasicNoRowsRenderer
        view={view}
        gamesTotal={1} />}
      onContentSelect={onContentCellSelect}
      onContentRun={onContentRun}
      onContextMenu={() => {}}
      onContentDragStart={onContentDragStart}
      onContentDragEnd={onContentDragEnd}
      onMovePlaylistEntry={onMovePlaylistEntry}
      getContentIcons={getContentIcons}
      cellWidth={width}
      cellHeight={height}
      logoVersion={logoVersion}
      screenshotPreviewMode={screenshotPreviewMode}
      screenshotPreviewDelay={screenshotPreviewDelay}
      hideExtremeScreenshots={hideExtremeScreenshots}
      updateView={updateViewRange}
      {...gameGridProps} />
  );
}

export function BrowsePageDisplayList<T extends Content>(props: BrowsePageDisplayListProps<T>) {
  const displaySettings = useAppSelector(state => state.main.displaySettings);
  const scale = useAppSelector(state => state.preferences.scaleValues.browse);
  const tagFilters = useAppSelector(state => state.preferences.tagFilters);
  const browsePageShowExtreme = useAppSelector(state => state.preferences.browsePageShowExtreme);
  const dispatch = useAppDispatch();
  const { view, onContentRun, extremeTags, onMovePlaylistEntry } = props;
  const [draggedContentIndex, setDraggedContentIndex] = useState<number | null>(null);
  const tagGroupIcons = tagFilters.filter(t => !t.enabled && t.iconBase64 !== '').map(({ tags, iconBase64: tagGroupIcon }) => ({ tagFilter: tags, iconBase64: tagGroupIcon }));

  const updateViewRange = delayedThrottle((start: number, count: number) => {
    dispatch(requestRange({
      view: view.id,
      searchId: view.data.searchId,
      start,
      count
    }));
  }, 100);

  const onContentDragStart = (event: React.DragEvent, dragEventData: GameDragEventData): void => {
    const data: GameDragData = {
      ...dragEventData,
      sourceTable: 'browse-page'
    };
    console.log(data);
    setDraggedContentIndex(dragEventData.index);
    event.dataTransfer.setData(gameDragDataType, JSON.stringify(data));
  };

  const onContentDragEnd = (event: React.DragEvent): void => {
    setDraggedContentIndex(null);
    event.dataTransfer.clearData(gameDragDataType);
  };

  const onContentCellSelect = async (contentId?: string, row?: number): Promise<void> => {
    if (view.selectedGame?.id !== contentId && contentId) {
      const game = await window.Shared.back.request(BackIn.GET_GAME, contentId);
      if (game) {
        if (row !== undefined) {
          dispatch(setListScroll({
            view: view.id,
            row
          }));
        }
        dispatch(selectGame({
          view: view.id,
          game,
        }));
      }
    }
  };

  const onListScrollToChange = (row: number) => {
    const content = view.data.content[row];
    if (content) {
      console.log(content.id);
      onContentCellSelect(content.id, row);
    }
  };

  const height: number = calcScale(20, 40, scale);

  return (
    <GameList
      view={view}
      displaySettings={displaySettings}
      sourceTable={'browse-page'}
      resultsTotal={view.data.total !== undefined ? view.data.total : Object.keys(view.data.content).length}
      insideOrderedPlaylist={view.selectedPlaylist !== undefined && view.advancedFilter.playlistOrder}
      selectedGameId={view.selectedGame?.id}
      draggedGameIndex={draggedContentIndex}
      showExtremeIcon={browsePageShowExtreme}
      extremeTags={extremeTags}
      noRowsRenderer={() => <BasicNoRowsRenderer
        view={view}
        gamesTotal={1} />}
      tagGroupIcons={tagGroupIcons}
      onContentSelect={onContentCellSelect}
      onContentLaunch={onContentRun}
      onContextMenu={() => {}}
      onGameDragStart={onContentDragStart}
      onGameDragEnd={onContentDragEnd}
      onMovePlaylistEntry={onMovePlaylistEntry}
      rowHeight={height}
      logoVersion={props.logoVersion}
      updateView={updateViewRange}
      scrollRow={view.listScrollRow}
      onScrollToChange={onListScrollToChange}
      viewId={view.id} />
  );
}

type BasicNoRowRendererProps = {
  view: ResultsView<Content>;
  gamesTotal: number;
}

export function BasicNoRowsRenderer(props: BasicNoRowRendererProps) {
  const strings = useContext(LangContext);
  const { view, gamesTotal } = props;

  return (
    <div className='game-list__no-games'>
      {view.data.total !== undefined ?
        view.selectedPlaylist ?
          view.selectedPlaylist.games.length === 0 ?
          /* Empty Playlist */
            <>
              <h2 className='game-list__no-games__title'>{strings.browse.emptyPlaylist}</h2>
              <br />
              <p>{formatString(strings.browse.dropGameOnLeft, <i>{strings.browse.leftSidebar}</i>)}</p>
            </>
            :
            <>
              <h2 className='game-list__no-games__title'>{strings.browse.noGamesFoundInsidePlaylist}</h2>
              <br />
              <p>{strings.browse.noGameMatchedSearch}</p>
            </>
          : (
        /* Empty regular search */
            <>
              <h1 className='game-list__no-games__title'>{strings.browse.noGamesFound}</h1>
              <br />
              {gamesTotal !== undefined && gamesTotal > 0 ? (
                <>
                  {strings.browse.noGameMatchedDesc}
                  <br />
                  {strings.browse.noGameMatchedSearch}
                </>
              ) : (
                <>{strings.browse.thereAreNoGames}</>
              )}
            </>
          ) : (
      /* Searching */
          <div>
            <h1 className="game-list__no-games__title">{strings.browse.searching}</h1>
            <Spinner />
          </div>
        )}
    </div>
  );
}
