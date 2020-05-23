import { BackOut, ImageChangeData, WrappedResponse } from '@shared/back/types';
import { LOGOS, VIEW_PAGE_SIZE } from '@shared/constants';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import * as React from 'react';
import { ArrowKeyStepper, AutoSizer, ScrollIndices } from 'react-virtualized';
import { Grid, GridCellProps, RenderedSection } from 'react-virtualized/dist/es/Grid';
import { UpdateView, ViewGameSet } from '../interfaces';
import { findElementAncestor, getGameImageURL } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';

const RENDERER_OVERSCAN = 5;

/** A function that receives an HTML element. */
type RefFunc<T extends HTMLElement> = (instance: T | null) => void;

type ColumnsRows = {
  columns: number;
  rows: number;
};

export type GameGridProps = {
  onGameLaunch: (gameId: string) => void;
  /** All games that will be shown in the grid (filter it before passing it here). */
  games: ViewGameSet;
  /** Total number of games there are. */
  gamesTotal?: number;
  /** Currently selected game (if any). */
  selectedGameId?: string;
  /** Currently dragged game (if any). */
  draggedGameId?: string;
  /** Width of each cell in the grid (in pixels). */
  cellWidth: number;
  /** Height of each cell in the grid (in pixels). */
  cellHeight: number;
  /** Function that renders the elements to show instead of the grid if there are no games (render prop). */
  noRowsRenderer?: () => JSX.Element;
  /** Called when the user attempts to select a game. */
  onGameSelect: (gameId?: string) => void;
  /** Called when the user attempts to open a context menu (at a game). */
  onContextMenu?: (gameId: string) => void;
  /** Called when the user starts to drag a game. */
  onGameDragStart?: (event: React.DragEvent, gameId: string) => void;
  /** Called when the user stops dragging a game (when they release it). */
  onGameDragEnd?: (event: React.DragEvent, gameId: string) => void;
  updateView: UpdateView;
  // React-Virtualized pass-through props (their values are not used for anything other than updating the grid when changed)
  orderBy?: GameOrderBy;
  orderReverse?: GameOrderReverse;
  /** Function for getting a reference to grid element. Called whenever the reference could change. */
  gridRef?: RefFunc<HTMLDivElement>;
};

/** A grid of cells, where each cell displays a game. */
export class GameGrid extends React.Component<GameGridProps> {
  wrapperRef: React.RefObject<HTMLDivElement> = React.createRef();
  /** Most recently reference passed to the "gridRef" callback prop. */
  prevWrapperRef: HTMLDivElement | null = null;
  /** Number of columns in the grid from the most recent render. */
  columns: number = 0;
  /** Current value of the "width" css variable. */
  currentWidth: number = 0;
  /** Current value of the "height" css variable. */
  currentHeight: number = 0;
  /** Currently displayed games. */
  currentGames: ViewGameSet | undefined;
  currentGamesCount: number = 0;
  // Used for the "view update hack"
  grid: React.RefObject<Grid> = React.createRef();

  componentDidMount(): void {
    window.Shared.back.on('message', this.onResponse);
    this.updateCssVars();
    this.updatePropRefs();
  }

  componentDidUpdate(): void {
    this.updateCssVars();
    this.updatePropRefs();

    // @HACK: Update the view in cases where the "onSectionRendered" callback is not called _EVEN THOUGH_ the cells have been re-rendered
    //        (Such as when changing library without making it scroll)
    // Note: This has a side effect of sometimes requesting the same pages twice (I think? //obelisk)
    const grid = this.grid.current;
    if (grid) {
      const start = (grid as any)._rowStartIndex;
      const stop = (grid as any)._rowStopIndex;

      if (typeof start === 'number' && typeof stop === 'number') {
        this.updateView(start, stop, this.columns);
      } else {
        console.warn('Failed to check if the grid view has been updated. The private properties extracted from "Grid" was of an unexpected type.');
      }
    }
  }

  componentWillUnmount(): void {
    window.Shared.back.off('message', this.onResponse);
  }

  render() {
    const games = this.props.games || [];
    // @HACK: Check if the games array changed
    // (This will cause the re-rendering of all cells any time the games prop uses a different reference)
    if (games !== this.currentGames) {
      this.currentGames = games;
      this.currentGamesCount = (this.currentGamesCount + 1) % 100;
    }

    // Render
    return (
      <GameItemContainer
        className='game-browser__center-inner'
        onGameSelect={this.onGameSelect}
        onGameLaunch={this.onGameLaunch}
        onGameContextMenu={this.onGameContextMenu}
        onGameDragStart={this.onGameDragStart}
        onGameDragEnd={this.onGameDragEnd}
        findGameId={this.findGameId}
        realRef={this.wrapperRef}
        onKeyPress={this.onKeyPress}>
        <AutoSizer>
          {({ width, height }) => {
            const { columns, rows } = this.calculateSize(this.props.gamesTotal || 0, width);
            this.columns = columns;
            // Calculate column and row of selected item
            let scrollToColumn: number = -1;
            let scrollToRow: number = -1;
            if (this.props.selectedGameId) {
              const index: number = findGameIndex(this.props.games, this.props.selectedGameId);
              if (index >= 0) {
                scrollToColumn = index % this.columns;
                scrollToRow = (index / this.columns) | 0;
              }
            }
            // Render
            return (
              <ArrowKeyStepper
                onScrollToChange={this.onScrollToChange}
                mode='cells'
                isControlled={true}
                columnCount={columns}
                rowCount={rows}
                scrollToColumn={scrollToColumn}
                scrollToRow={scrollToRow}>
                {({ onSectionRendered, scrollToColumn, scrollToRow }) => {
                  return (
                    <Grid
                      className='game-grid simple-scroll'
                      ref={this.grid}
                      // Grid stuff
                      width={width}
                      height={height}
                      columnWidth={this.props.cellWidth}
                      rowHeight={this.props.cellHeight}
                      columnCount={columns}
                      rowCount={rows}
                      overscanColumnCount={0}
                      overscanRowCount={RENDERER_OVERSCAN}
                      cellRenderer={this.cellRenderer}
                      noContentRenderer={this.props.noRowsRenderer}
                      // ArrowKeyStepper props
                      scrollToColumn={scrollToColumn}
                      scrollToRow={scrollToRow}
                      onSectionRendered={(params: RenderedSection) => this.onSectionRendered(params, columns, onSectionRendered)}
                      // Pass-through props (they have no direct effect on the grid)
                      // (If any property is changed the grid is re-rendered, even these)
                      pass_orderBy={this.props.orderBy}
                      pass_orderReverse={this.props.orderReverse}
                      pass_currentGamesCount={this.currentGamesCount}
                      />
                  );
                }}
              </ArrowKeyStepper>
            );
          }}
        </AutoSizer>
      </GameItemContainer>
    );
  }

  /** Renders a single cell in the game grid. */
  cellRenderer = (props: GridCellProps): React.ReactNode => {
    const { draggedGameId, games, gamesTotal, selectedGameId } = this.props;
    const index = props.rowIndex * this.columns + props.columnIndex;
    if (index < (gamesTotal || 0)) {
      const game = games[index];
      return (
        <GameGridItem
          { ...props }
          key={props.key}
          id={game ? game.id : ''}
          title={game ? game.title : ''}
          platform={game ? game.platform : ''}
          thumbnail={game ? getGameImageURL(LOGOS, game.id) : ''}
          isDraggable={true}
          isSelected={game ? game.id === selectedGameId : false}
          isDragged={game ? game.id === draggedGameId : false} />
      );
    } else {
      return undefined;
    }
  }

  onResponse = (res: WrappedResponse) => {
    if (res.type === BackOut.IMAGE_CHANGE) {
      const resData: ImageChangeData = res.data;

      // Update the image in the browsers cache
      if (resData.folder === LOGOS) {
        fetch(getGameImageURL(resData.folder, resData.id))
        .then(() => {
          // Refresh the image for the game(s) that uses it
          const elements = document.getElementsByClassName('game-grid-item');
          for (let i = 0; i < elements.length; i++) {
            const item = elements.item(i);
            if (item && GameGridItem.getId(item) === resData.id) {
              const img: HTMLElement | null = item.querySelector('.game-grid-item__thumb__image') as any;
              if (img) {
                const val = img.style.backgroundImage;
                img.style.backgroundImage = '';
                img.style.backgroundImage = val;
              }
            }
          }
        });
      }
    }
  }

  onSectionRendered = (params: RenderedSection, columns: number, callback?: (params: RenderedSection) => void) => {
    if (callback) { callback(params); }
    this.updateView(params.rowOverscanStartIndex, params.rowOverscanStopIndex, columns);
  }

  /** When a key is pressed (while the grid, or one of its children, is selected). */
  onKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      if (this.props.selectedGameId) {
        this.props.onGameLaunch(this.props.selectedGameId);
      }
    }
  }

  /** When a cell is clicked. */
  onGameSelect = (event: React.MouseEvent, gameId: string | undefined): void => {
    this.props.onGameSelect(gameId);
  }

  /** When a cell is double clicked. */
  onGameLaunch = (event: React.MouseEvent, gameId: string): void => {
    this.props.onGameLaunch(gameId);
  }

  /** When a cell is right clicked. */
  onGameContextMenu = (event: React.MouseEvent<HTMLDivElement>, gameId: string | undefined): void => {
    if (this.props.onContextMenu) {
      if (gameId) { this.props.onContextMenu(gameId); }
    }
  }

  /** When a cell is starting to be dragged. */
  onGameDragStart = (event: React.DragEvent, gameId: string | undefined): void => {
    if (this.props.onGameDragStart) {
      if (gameId) { this.props.onGameDragStart(event, gameId); }
    }
  }

  /** When a cell is ending being dragged. */
  onGameDragEnd = (event: React.DragEvent, gameId: string | undefined): void => {
    if (this.props.onGameDragEnd) {
      if (gameId) { this.props.onGameDragEnd(event, gameId); }
    }
  }

  /** When a cell is selected. */
  onScrollToChange = (params: ScrollIndices): void => {
    if (!this.props.games) { throw new Error('Games array is missing.'); }
    if (params.scrollToColumn === -1 || params.scrollToRow === -1) {
      this.props.onGameSelect(undefined);
    } else {
      const game = this.props.games[params.scrollToRow * this.columns + params.scrollToColumn];
      if (game) { this.props.onGameSelect(game.id); }
    }
  }

  /** Find a game's ID. */
  findGameId = (element: EventTarget): string | undefined => {
    const game = findElementAncestor(element as Element, target => GameGridItem.isElement(target), true);
    if (game) { return GameGridItem.getId(game); }
  }

  /** Update CSS Variables. */
  updateCssVars() {
    const wrapper = this.wrapperRef.current;
    if (!wrapper) { throw new Error('Browse Page wrapper div not found'); }
    // Update width (if it changed)
    if (this.currentWidth !== this.props.cellWidth) {
      this.currentWidth = this.props.cellWidth;
      wrapper.style.setProperty('--width', this.currentWidth+'');
    }
    // Update height (if it changed)
    if (this.currentHeight !== this.props.cellHeight) {
      this.currentHeight = this.props.cellHeight;
      wrapper.style.setProperty('--height', this.currentHeight+'');
    }
  }

  /**
   * Call the "ref" property functions.
   * Do this whenever there's a possibility that the referenced elements has been replaced.
   */
  updatePropRefs(): void {
    if (this.props.gridRef) {
      // Find the grid element
      let ref: HTMLDivElement | null = null;
      if (this.wrapperRef.current) {
        const inner = this.wrapperRef.current.querySelector('.game-grid');
        if (inner) { ref = inner as HTMLDivElement; }
      }
      // Call callback
      if (ref !== this.prevWrapperRef) {
        this.prevWrapperRef = ref;
        this.props.gridRef(ref);
      }
    }
  }

  calculateSize(gamesTotal: number, width: number): ColumnsRows {
    // Calculate and set column/row count
    // (16 is the width of a scroll-bar in pixels - at least on windows)
    const cells: ColumnsRows = {
      columns: 0,
      rows: 0,
    };
    if (gamesTotal > 0) {
      cells.columns = Math.max(1, ((width - 16) / this.props.cellWidth) | 0); // ("x|0" is the same as Math.floor(x))
      cells.rows = Math.ceil(gamesTotal / cells.columns);
    }
    return cells;
  }

  updateView(start: number, stop: number, columns: number): void {
    const trailingPage = Math.floor((start * columns) / VIEW_PAGE_SIZE);
    const leadingPage  = Math.floor((stop  * columns) / VIEW_PAGE_SIZE);

    this.props.updateView(trailingPage, (leadingPage - trailingPage) + 2);
  }
}

function findGameIndex(games: ViewGameSet | undefined, gameId: string | undefined): number {
  if (gameId !== undefined && games) {
    for (let index in games) {
      const game = games[index];
      if (game && game.id === gameId) { return (index as any) | 0; }
    }
  }
  return -1;
}
