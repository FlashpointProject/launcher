
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { requestRange, selectGame, setGridScroll, setListScroll } from '@renderer/store/search/slice';
import { gameDragDataType, getPlatformIconURL } from '@renderer/Util';
import { BackIn } from '@shared/back/types';
import { calcScale } from '@shared/Util';
import { isGame } from '@shared/utils/misc';
import { formatString } from '@shared/utils/StringFormatter';
import { delayedThrottle } from '@shared/utils/throttle';
import { Content, Game, Playlist } from 'flashpoint-launcher';
import { BrowsePageDisplayGridProps, BrowsePageDisplayListProps, BrowsePageDisplayProps } from 'flashpoint-launcher-renderer';
import React, { useState } from 'react';
import { ScrollIndices } from 'react-virtualized';
import { GameGrid } from './GameGrid';
import { GameList } from './GameList';
import { GameDragData, GameDragEventData } from './pages/BrowsePage';
import { Spinner } from './Spinner';

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
  const { viewId, searchId, content, contentTotal, selectedContentId, selectedPlaylist, playlistOrder,
    onContextMenu, getContentIcons, onContentRun, logoVersion, extremeTags, onMovePlaylistEntry } = props;
  const [draggedContentIndex, setDraggedContentIndex] = useState<number | null>(null);
  const gridScrollCol = useAppSelector(state => state.search.views[viewId].gridScrollCol);
  const gridScrollRow = useAppSelector(state => state.search.views[viewId].gridScrollRow);

  const updateViewRange = delayedThrottle((start: number, count: number) => {
    dispatch(requestRange({
      view: viewId,
      searchId,
      start,
      count
    }));
  }, 100);

  const onGridScrollToChange = (params: ScrollIndices, columns: number) => {
    const foundContent = content[params.scrollToRow * columns + params.scrollToColumn];
    if (foundContent) {
      onContentCellSelect(foundContent.id, params.scrollToColumn, params.scrollToRow);
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
    if (selectedContentId !== contentId && contentId) {
      const game = await window.Shared.back.request(BackIn.GET_GAME, contentId);
      if (game) {
        if (col !== undefined && row !== undefined) {
          dispatch(setGridScroll({
            view: viewId,
            col,
            row
          }));
        }
        dispatch(selectGame({
          view: viewId,
          game,
        }));
      }
    }
  };

  const onContentDeselect = () => {
    dispatch(selectGame({
      view: viewId,
      game: undefined
    }));
  };

  const height: number = calcScale(300, scale);
  const width: number = (height * 0.666) | 0;
  const gameGridProps = {
    scrollCol: gridScrollCol,
    scrollRow: gridScrollRow,
    onScrollToChange: onGridScrollToChange
  };

  return (
    <GameGrid
      viewId={viewId}
      searchId={searchId}
      content={content}
      playlistOrder={playlistOrder}
      resultsTotal={contentTotal !== undefined ? contentTotal : Object.keys(content).length}
      insideOrderedPlaylist={selectedPlaylist !== undefined && playlistOrder}
      selectedContentId={selectedContentId}
      selectedPlaylist={selectedPlaylist}
      draggedContentIndex={draggedContentIndex}
      extremeTags={extremeTags}
      noRowsRenderer={() => <BasicNoRowsRenderer contentTotal={contentTotal} selectedPlaylist={selectedPlaylist} />}
      onContentSelect={onContentCellSelect}
      onContentDeselect={onContentDeselect}
      onContentRun={onContentRun}
      onContextMenu={onContextMenu}
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
  const { viewId, searchId, content, contentTotal, selectedContentId, selectedPlaylist, playlistOrder,
    onContextMenu, onContentRun, extremeTags, onMovePlaylistEntry } = props;
  const [draggedContentIndex, setDraggedContentIndex] = useState<number | null>(null);
  const tagGroupIcons = tagFilters.filter(t => !t.enabled && t.iconBase64 !== '').map(({ tags, iconBase64: tagGroupIcon }) => ({ tagFilter: tags, iconBase64: tagGroupIcon }));
  const listScrollRow = useAppSelector(state => state.search.views[viewId].listScrollRow);

  const updateViewRange = delayedThrottle((start: number, count: number) => {
    dispatch(requestRange({
      view: viewId,
      searchId,
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
    if (selectedContentId !== contentId && contentId) {
      const game = await window.Shared.back.request(BackIn.GET_GAME, contentId);
      if (game) {
        if (row !== undefined) {
          dispatch(setListScroll({
            view: viewId,
            row
          }));
        }
        dispatch(selectGame({
          view: viewId,
          game,
        }));
      }
    }
  };

  const onContentDeselect = () => {
    dispatch(selectGame({
      view: viewId,
      game: undefined
    }));
  };

  const onListScrollToChange = (row: number) => {
    const foundContent = content[row];
    if (foundContent) {
      onContentCellSelect(foundContent.id, row);
    }
  };

  const height: number = calcScale(30, scale);

  return (
    <GameList
      viewId={viewId}
      searchId={searchId}
      content={content}
      playlistOrder={playlistOrder}
      displaySettings={displaySettings}
      sourceTable={'browse-page'}
      resultsTotal={contentTotal !== undefined ? contentTotal : Object.keys(content).length}
      insideOrderedPlaylist={selectedPlaylist !== undefined && playlistOrder}
      selectedContentId={selectedContentId}
      selectedPlaylist={selectedPlaylist}
      draggedGameIndex={draggedContentIndex}
      showExtremeIcon={browsePageShowExtreme}
      extremeTags={extremeTags}
      noRowsRenderer={() => <BasicNoRowsRenderer contentTotal={contentTotal} selectedPlaylist={selectedPlaylist} />}
      tagGroupIcons={tagGroupIcons}
      onContentSelect={onContentCellSelect}
      onContentDeselect={onContentDeselect}
      onContentLaunch={onContentRun}
      onContextMenu={onContextMenu}
      onGameDragStart={onContentDragStart}
      onGameDragEnd={onContentDragEnd}
      onMovePlaylistEntry={onMovePlaylistEntry}
      rowHeight={height}
      logoVersion={props.logoVersion}
      updateView={updateViewRange}
      scrollRow={listScrollRow}
      onScrollToChange={onListScrollToChange} />
  );
}

type BasicNoRowRendererProps = {
  selectedPlaylist?: Playlist;
  contentTotal?: number;
}

export function BasicNoRowsRenderer(props: BasicNoRowRendererProps) {
  const strings = useLocalization();
  const { contentTotal, selectedPlaylist } = props;

  return (
    <div className='game-list__no-games'>
      {contentTotal !== undefined ?
        selectedPlaylist ?
          selectedPlaylist.games.length === 0 ?
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
              {contentTotal !== undefined && contentTotal > 0 ? (
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
