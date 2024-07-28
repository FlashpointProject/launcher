import { withPreferences, WithPreferencesProps } from '@renderer/containers/withPreferences';
import { VIEW_PAGE_SIZE } from '@shared/constants';
import { memoizeOne } from '@shared/memoize';
import * as React from 'react';
import { ArrowKeyStepper, AutoSizer, List, ListRowProps, ScrollIndices } from 'react-virtualized-reactv17';
import { UpdateView, ViewGameSet } from '../interfaces';
import { findElementAncestor, gameDragDataType, getExtremeIconURL } from '../Util';
import { GameItemContainer } from './GameItemContainer';
import { GameListHeader } from './GameListHeader';
import { GameListItem } from './GameListItem';
import { GameDragData, GameDragEventData } from './pages/BrowsePage';
/** A function that receives an HTML element. */
type RefFunc<T extends HTMLElement> = (instance: T | null) => void;

const RENDERER_OVERSCAN = 15;

export type OwnProps = {
  sourceTable: string;
  /** All games that will be shown in the list. */
  games?: ViewGameSet;
  /** Total number of games in the results view there are. */
  resultsTotal?: number;
  /** Are we in a playlist view? */
  insideOrderedPlaylist: boolean;
  /** Currently selected game (if any). */
  selectedGameId?: string;
  /** Currently dragged game index (if any). */
  draggedGameIndex: number | null;
  /** Height of each row in the list (in pixels). */
  rowHeight: number;
  /** Whether to render the extreme icon when possible */
  showExtremeIcon: boolean;
  /** Extreme Tag Filters */
  extremeTags: string[];
  /** Function that renders the elements to show instead of the grid if there are no games (render prop). */
  noRowsRenderer?: () => JSX.Element;
  /** Called when the user attempts to select a game. */
  onGameSelect: (gameId?: string) => void;
  /** Called when the user attempts to launch a game. */
  onGameLaunch: (gameId: string) => void;
  /** Called when the user attempts to open a context menu (at a game). */
  onContextMenu: (gameId: string) => void;
  /** Called when the user starts to drag a game. */
  onGameDragStart: (event: React.DragEvent, dragEventData: GameDragEventData) => void;
  /** Called when the user stops dragging a game (when they release it). */
  onGameDragEnd: (event: React.DragEvent) => void;
  /** Moves a game at the specified index above the other game at the destination index, inside tha playlist */
  onMovePlaylistGame: (sourceGameId: string, destGameId: string) => void;
  updateView: UpdateView;
  /** Function for getting a reference to grid element. Called whenever the reference could change. */
  listRef?: RefFunc<HTMLDivElement>;
  /** Updates to clear platform icon cache */
  logoVersion: number;
};

type RowsRenderedInfo = {
  overscanStartIndex: number;
  overscanStopIndex: number;
  startIndex: number;
  stopIndex: number;
}

export type GameListProps = OwnProps & WithPreferencesProps;

/** A list of rows, where each rows displays a game. */
class _GameList extends React.Component<GameListProps> {
  private _wrapper: React.RefObject<HTMLDivElement> = React.createRef();
  /** Currently displayed games. */
  currentGames: ViewGameSet | undefined = undefined;
  // Used for the "view update hack"
  list: React.RefObject<List> = React.createRef();

  componentDidMount(): void {
    this.updateCssVars();
  }

  componentDidUpdate(): void {
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
        this.props.onMovePlaylistGame(dragData.gameId, destData.gameId);
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
    const games = this.props.games || [];
    // @HACK: Check if the games array changed
    // (This will cause the re-rendering of all cells any time the games prop uses a different reference)
    const gamesChanged = games !== this.currentGames;
    if (gamesChanged) { this.currentGames = games; }

    // Render
    return (
      <div
        className='game-list-wrapper'
        ref={this._wrapper}>
        <GameListHeader
          showExtremeIcon={this.props.showExtremeIcon}
          preferencesData={this.props.preferencesData}  />
        <GameItemContainer
          className='game-browser__center-inner'
          onGameSelect={this.onGameSelect}
          onGameLaunch={this.onGameLaunch}
          onGameContextMenu={this.onGameContextMenu}
          onGameDragStart={this.onGameDragStart}
          onGameDragEnd={this.onGameDragEnd}
          onGameDrop={this.props.insideOrderedPlaylist ? this.onGameDrop : undefined}
          onGameDragOver={this.props.insideOrderedPlaylist ? this.onGameDragOver : undefined}
          findGameDragEventData={this.findGameDragEventData}
          onKeyPress={this.onKeyPress}>
          <AutoSizer>
            {({ width, height }) => {
              // Calculate column and row of selected item
              let scrollToIndex = -1;
              if (this.props.selectedGameId) {
                scrollToIndex = findGameIndex(games, this.props.selectedGameId);
              }
              return (
                <ArrowKeyStepper
                  onScrollToChange={this.onScrollToChange}
                  mode='cells'
                  isControlled={true}
                  columnCount={1}
                  rowCount={this.props.resultsTotal || 0}
                  scrollToRow={scrollToIndex}>
                  {({ onSectionRendered, scrollToRow }) => (
                    <List
                      className='game-list simple-scroll'
                      ref={this.list}
                      width={width}
                      height={height}
                      entries={this.props.games}
                      rowHeight={this.props.rowHeight}
                      rowCount={this.props.resultsTotal || 0}
                      overscanRowCount={RENDERER_OVERSCAN}
                      noRowsRenderer={this.props.noRowsRenderer}
                      rowRenderer={this.rowRenderer}
                      // ArrowKeyStepper props
                      scrollToIndex={scrollToRow}
                      onRowsRendered={this.onRowsRendered}
                      onSectionRendered={onSectionRendered}
                      // Pass-through props (they have no direct effect on the list)
                      // (If any property is changed the list is re-rendered, even these)
                      pass_gamesChanged={gamesChanged} />
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
  rowRenderer = (cellProps: ListRowProps): React.ReactNode => {
    const extremeIconPath = this.extremeIconPathMemo(this.props.logoVersion);
    const { games, selectedGameId, showExtremeIcon } = this.props;
    if (!games) { throw new Error('Trying to render a row in game list, but no games are found?'); }
    const game = games[cellProps.index];
    const platform = game?.primaryPlatform;

    return game ? (
      <GameListItem
        { ...cellProps }
        key={cellProps.key}
        id={game.id}
        title={game.title}
        platform={platform ? platform.trim() : ''}
        tags={game.tags}
        developer={game.developer}
        publisher={game.publisher}
        extreme={game.tags.findIndex(t => this.props.extremeTags.includes(t.trim())) !== -1}
        extremeIconPath={extremeIconPath}
        showExtremeIcon={showExtremeIcon}
        logoVersion={this.props.logoVersion}
        isDraggable={true}
        isSelected={game.id === selectedGameId}
        isDragged={false} /> // Bugged render update
    ) : <div key={cellProps.key} style={cellProps.style} />;
  };

  onRowsRendered = (info: RowsRenderedInfo) => {
    this.updateView(info.overscanStartIndex, info.overscanStopIndex);
  };

  // When a key is pressed (while the list, or one of its children, is selected).
  onKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      if (this.props.selectedGameId) {
        this.props.onGameLaunch(this.props.selectedGameId);
      }
    }
  };

  /**
   * When a row is clicked.
   *
   * @param event React event
   * @param gameId ID of pressed Game
   */
  onGameSelect = (event: React.MouseEvent, gameId: string | undefined): void => {
    this.props.onGameSelect(gameId);
  };

  /**
   * When a row is double clicked.
   *
   * @param event React event
   * @param gameId ID of Game to launch
   */
  onGameLaunch = (event: React.MouseEvent, gameId: string): void => {
    this.props.onGameLaunch(gameId);
  };

  /**
   * When a row is right clicked.
   *
   * @param event React event
   * @param gameId ID of Game to open context meny for
   */
  onGameContextMenu = (event: React.MouseEvent<HTMLDivElement>, gameId: string): void => {
    this.props.onContextMenu(gameId);
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
    if (!this.props.games) { throw new Error('Games array is missing.'); }
    if (params.scrollToRow === -1) {
      this.props.onGameSelect(undefined);
    } else {
      const game = this.props.games[params.scrollToRow];
      if (game) { this.props.onGameSelect(game.id); }
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

function findGameIndex(games: ViewGameSet | undefined, gameId: string | undefined): number {
  if (gameId !== undefined && games) {
    for (const index in games) {
      const game = games[index];
      if (game && game.id === gameId) { return (index as any) | 0; }
    }
  }
  return -1;
}

export const GameList = withPreferences(_GameList);
