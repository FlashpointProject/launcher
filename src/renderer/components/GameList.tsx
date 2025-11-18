import { VIEW_PAGE_SIZE } from '@shared/constants';
import { memoizeOne } from '@shared/memoize';
import { isGame } from '@shared/utils/misc';
import { Content, GameLaunchOverride, TagFilter, ViewContentSet } from 'flashpoint-launcher';
import { BrowsePageDisplayProps, DisplaySettings } from 'flashpoint-launcher-renderer';
import * as React from 'react';
import { ArrowKeyStepper, AutoSizer, List, ListRowProps, ScrollIndices } from 'react-virtualized';
import { UpdateView } from '../interfaces';
import { findElementAncestor, gameDragDataType, getExtremeIconURL } from '../Util';
import { GameItemContainer } from './GameItemContainer';
import { GameListHeader } from './GameListHeader';
import { GameListItem } from './GameListItem';
import { GameDragData, GameDragEventData } from './pages/BrowsePage';

const RENDERER_OVERSCAN = 15;

export type GameListProps<T extends Content> = BrowsePageDisplayProps<T> & {
  displaySettings: DisplaySettings;
  sourceTable: string;
  /** Total number of games in the results view there are. */
  resultsTotal?: number;
  /** Are we in a playlist view? */
  insideOrderedPlaylist: boolean;
  /** Currently dragged game index (if any). */
  draggedGameIndex: number | null;
  /** Height of each row in the list (in pixels). */
  rowHeight: number;
  /** Whether to render the extreme icon when possible */
  showExtremeIcon: boolean;
  /** Extreme Tag Filters */
  extremeTags: string[];
  /** Tag Filter icons */
  tagGroupIcons: { tagFilter: TagFilter; iconBase64: string; }[];
  /** Function that renders the elements to show instead of the grid if there are no games (render prop). */
  noRowsRenderer?: () => React.JSX.Element;
  /** Called when the user attempts to select a game. */
  onContentSelect: (gameId?: string, row?: number) => void;
  /** Called when the user attempts to deselect a game. */
  onContentDeselect: (gameId?: string, row?: number) => void;
  /** Called when the user attempts to launch a game. */
  onContentLaunch: (gameId: string, override: GameLaunchOverride) => void;
  /** Called when the user attempts to open a context menu (at a game). */
  onContextMenu: (event: React.MouseEvent, gameId: string, logoPath: string, screenshotPath: string) => void;
  /** Called when the user starts to drag a game. */
  onGameDragStart: (event: React.DragEvent, dragEventData: GameDragEventData) => void;
  /** Called when the user stops dragging a game (when they release it). */
  onGameDragEnd: (event: React.DragEvent) => void;
  /** Moves a game at the specified index above the other game at the destination index, inside the playlist */
  onMovePlaylistEntry: (sourceGameId: string, destGameId: string) => void;
  updateView: UpdateView;
  /** Updates to clear platform icon cache */
  logoVersion: number;
  /** View id */
  viewId?: string;
  /** Scroll position */
  scrollRow?: number;
  onScrollToChange?: (row: number) => void;
};

type RowsRenderedInfo = {
  overscanStartIndex: number;
  overscanStopIndex: number;
  startIndex: number;
  stopIndex: number;
}

/** A list of rows, where each rows displays a game. */
export class GameList<T extends Content> extends React.Component<GameListProps<T>> {
  private _wrapper: React.RefObject<HTMLDivElement | null> = React.createRef();
  // Used for the "view update hack"
  list: React.RefObject<List | null> = React.createRef();

  /** Currently displayed ccontent. */
  currentContent: ViewContentSet<T> | undefined;
  currentContentCount = 0;

  componentDidMount(): void {
    this.updateCssVars();
  }

  componentDidUpdate(prevProps: GameListProps<T>): void {
    this.updateCssVars();

    // @HACK: Update the view in cases where the "onSectionRendered" callback is not called _EVEN THOUGH_ the cells have been re-rendered
    //        (Such as when changing library without making it scroll)
    // Note: This has a side effect of sometimes requesting the same pages twice (I think? //obelisk)
    const grid = this.list.current && this.list.current.Grid;
    if (grid) {
      const start = (grid as any)._rowStartIndex;
      const stop = (grid as any)._rowStopIndex;

      if (typeof start === 'number' && typeof stop === 'number') {
        this.updateView(start, stop);
      } else {
        console.warn('Failed to check if the grid view has been updated. The private properties extracted from "Grid" was of an unexpected type.');
      }
    }
  }

  onGameDrop = (event: React.DragEvent) => {
    const rawData = event.dataTransfer.getData(gameDragDataType);
    if (rawData) {
      const dragData = JSON.parse(rawData) as GameDragData;
      console.log(`source: ${dragData.index}`);
      const destData = this.findGameDragEventData(event.target);
      if (destData) {
        console.log(`dest: ${destData.index}`);
        // Move the dropped game above the target game in the playlist
        this.props.onMovePlaylistEntry(dragData.gameId, destData.gameId);
      }
    }
  };

  onGameDragOver = (event: React.DragEvent): void => {
    const types = event.dataTransfer.types;
    if (types.length === 1 && types[0] === gameDragDataType) {
      // Show the "You can drop here" cursor while dragging something droppable over this element
      event.dataTransfer.dropEffect = 'copy';
      event.preventDefault();
    }
  };

  render() {
    const content = this.props.content;
    // @HACK: Check if the games array changed
    // (This will cause the re-rendering of all cells any time the games prop uses a different reference)
    if (content !== this.currentContent) {
      this.currentContent = content;
      this.currentContentCount = (this.currentContentCount + 1) % 100;
    }

    // Render
    return (
      <div
        className='game-list-wrapper'
        ref={this._wrapper}>
        <GameListHeader showExtremeIcon={this.props.showExtremeIcon} />
        <GameItemContainer
          className='game-browser__center-inner'
          onContentSelect={this.onContentSelect}
          onContentDeselect={this.onContentDeselect}
          onContentLaunch={this.onContentLaunch}
          onGameContextMenu={this.onGameContextMenu}
          onGameDragStart={this.onGameDragStart}
          onGameDragEnd={this.onGameDragEnd}
          onGameDrop={this.props.insideOrderedPlaylist ? this.onGameDrop : undefined}
          onGameDragOver={this.props.insideOrderedPlaylist ? this.onGameDragOver : undefined}
          selectedGameId={this.props.selectedContentId}
          type='list'
          onKeyPress={this.onKeyPress}>
          <AutoSizer>
            {({ width, height }) => {
              return (
                <ArrowKeyStepper
                  onScrollToChange={this.onScrollToChange}
                  mode='cells'
                  isControlled={true}
                  columnCount={1}
                  rowCount={this.props.resultsTotal || 0}
                  scrollToRow={this.props.scrollRow}>
                  {({ onSectionRendered }) => (
                    <List
                      className='game-list simple-scroll'
                      ref={this.list}
                      width={width}
                      height={height}
                      rowHeight={this.props.rowHeight}
                      rowCount={this.props.resultsTotal || 0}
                      overscanRowCount={RENDERER_OVERSCAN}
                      noRowsRenderer={this.props.noRowsRenderer}
                      rowRenderer={this.rowRenderer}
                      // ArrowKeyStepper props
                      scrollToIndex={this.props.scrollRow}
                      onRowsRendered={this.onRowsRendered}
                      onSectionRendered={onSectionRendered}
                      // Pass-through props (they have no direct effect on the list)
                      // (If any property is changed the list is re-rendered, even these)
                      pass_gameId={this.props.selectedContentId}
                      pass_currentGamesCount={this.currentContentCount}
                      pass_viewId={this.props.viewId} />
                  )}
                </ArrowKeyStepper>
              );
            }}
          </AutoSizer>
        </GameItemContainer>
      </div>
    );
  }

  // Renders a single row in the game list.
  rowRenderer = (props: ListRowProps): React.ReactNode => {
    const games = this.props.content;
    const extremeIconPath = this.extremeIconPathMemo(this.props.logoVersion);
    const { selectedContentId, showExtremeIcon } = this.props;
    const index = props.index;
    const game = games[index] as T | undefined;
    if (game !== undefined && !isGame(game)) {
      return <div key={props.key} style={props.style}>Unsupported Content Render</div>;
    }
    const tagGroupIcon = this.props.tagGroupIcons.find(tg => tg.tagFilter.find(t => game?.tags.includes(t)))?.iconBase64;
    const totalWeight = this.props.displaySettings.gameList.columns.reduce((prev, cur) => cur.type === 'normal' ? prev + cur.weight : prev, 0);
    const extreme = isGame(game) ? game.tags.findIndex(t => this.props.extremeTags.includes(t.trim())) !== -1 : false;

    return (
      <GameListItem
        { ...props }
        displaySettings={this.props.displaySettings}
        game={game}
        key={props.key}
        extreme={extreme}
        extremeIconPath={extremeIconPath}
        showExtremeIcon={showExtremeIcon}
        tagGroupIconBase64={tagGroupIcon || ''}
        logoVersion={this.props.logoVersion}
        isDraggable={true}
        isSelected={game?.id === selectedContentId}
        totalWeight={totalWeight}
        isDragged={false} /> // Bugged render update
    );
  };

  onRowsRendered = (info: RowsRenderedInfo) => {
    this.updateView(info.overscanStartIndex, info.overscanStopIndex);
  };

  // When a key is pressed (while the list, or one of its children, is selected).
  onKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      if (this.props.selectedContentId) {
        this.props.onContentLaunch(this.props.selectedContentId, null);
      }
    }
  };

  /**
   * When a row is clicked.
   *
   * @param event React event
   * @param gameId ID of pressed Game
   */
  onContentSelect = (event: React.MouseEvent, gameId: string | undefined): void => {
    const row = findContentIndex(this.props.content, gameId);
    this.props.onContentSelect(gameId, row);
  };

  onContentDeselect = (event: React.MouseEvent, gameId: string | undefined): void => {
    const row = findContentIndex(this.props.content, gameId);
    this.props.onContentDeselect(gameId, row);
  };

  /**
   * When a row is double clicked.
   *
   * @param event React event
   * @param gameId ID of Game to launch
   */
  onContentLaunch = (event: React.MouseEvent, gameId: string): void => {
    this.props.onContentLaunch(gameId, null);
  };

  /**
   * When a row is right clicked.
   *
   * @param event React event
   * @param gameId ID of Game to open context meny for
   */
  onGameContextMenu = (event: React.MouseEvent<HTMLDivElement>, gameId: string, logoPath: string, screenshotPath: string): void => {
    this.props.onContextMenu(event, gameId, logoPath, screenshotPath);
  };

  /**
   * When a row is starting to be dragged.
   *
   * @param event React event
   * @param dragEventData The data of the cell being dragged
   */
  onGameDragStart = (event: React.DragEvent, dragEventData: GameDragEventData): void => {
    this.props.onGameDragStart(event, dragEventData);
  };

  /**
   * When a row is ending being dragged.
   *
   * @param event React event
   */
  onGameDragEnd = (event: React.DragEvent): void => {
    this.props.onGameDragEnd(event);
  };

  /**
   * When a row is selected.
   *
   * @param params Position params to scroll to
   */
  onScrollToChange = (params: ScrollIndices): void => {
    if (this.props.onScrollToChange) {
      this.props.onScrollToChange(params.scrollToRow);

    }
  };

  // Find a game's ID.
  findGameDragEventData = (element: EventTarget): GameDragEventData | undefined => {
    const game = findElementAncestor(element as Element, target => GameListItem.isElement(target), true);
    if (game) { return GameListItem.getDragEventData(game); }
  };

  /** Update CSS Variables */
  updateCssVars() {
    const ref = this._wrapper.current;
    if (!ref) { throw new Error('Browse Page wrapper div not found'); }
    ref.style.setProperty('--height', this.props.rowHeight+'');
  }

  updateView(start: number, stop: number): void {
    const trailingPage = Math.floor(start / VIEW_PAGE_SIZE);
    const leadingPage  = Math.floor(stop  / VIEW_PAGE_SIZE);

    this.props.updateView(trailingPage, (leadingPage - trailingPage) + 2);
  }

  extremeIconPathMemo = memoizeOne((logoVersion: number) => {
    return getExtremeIconURL(logoVersion);
  });
}

function findContentIndex<T extends Content>(contentSet: ViewContentSet<T> | undefined, contentId: string | undefined): number {
  if (contentId !== undefined && contentSet) {
    for (const index in contentSet) {
      const content = contentSet[index];
      if (content && content.id === contentId) { return (index as any) | 0; }
    }
  }
  return -1;
}
