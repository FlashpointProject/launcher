import * as React from 'react';
import { ArrowKeyStepper, AutoSizer, ScrollIndices } from 'react-virtualized';
import { Grid, GridCellProps } from 'react-virtualized/dist/es/Grid';
import { IGameInfo } from '../../shared/game/interfaces';
import { GameImageCollection } from '../image/GameImageCollection';
import { GameGridItem } from './GameGridItem';
import { GameOrderBy, GameOrderReverse } from '../../shared/order/interfaces';
import { findElementAncestor } from '../Util';
import { GameItemContainer } from './GameItemContainer';

/** A function that receives an HTML element. */
type RefFunc<T extends HTMLElement> = (instance: T | null) => void;

export type GameGridProps = {
  gameImages?: GameImageCollection;
  /** All games that will be shown in the grid (filter it before passing it here). */
  games?: IGameInfo[];
  /** Currently selected game (if any). */
  selectedGame?: IGameInfo;
  /** Currently dragged game (if any). */
  draggedGame?: IGameInfo;
  /** Width of each cell in the grid (in pixels). */
  cellWidth: number;
  /** Height of each cell in the grid (in pixels). */
  cellHeight: number;
  /** Function that renders the elements to show instead of the grid if there are no games (render prop). */
  noRowsRenderer?: () => JSX.Element;
  /** Called when the user attempts to select a game. */
  onGameSelect?: (game?: IGameInfo) => void;
  /** Called when the user attempts to launch a game. */
  onGameLaunch: (game: IGameInfo) => void;
  /** Called when the user attempts to open a context menu (at a game). */
  onContextMenu?: (game: IGameInfo) => void;
  /** Called when the user starts to drag a game. */
  onGameDragStart?: (event: React.DragEvent, game: IGameInfo) => void;
  /** Called when the user stops dragging a game (when they release it). */
  onGameDragEnd?: (event: React.DragEvent, game: IGameInfo) => void;
  // React-Virtualized pass-through props (their values are not used for anything other than updating the grid when changed)
  orderBy?: GameOrderBy;
  orderReverse?: GameOrderReverse;
  /** Function for getting a reference to grid element. Called whenever the reference could change. */
  gridRef?: RefFunc<HTMLDivElement>;
};

/** A grid of cells, where each cell displays a game. */
export class GameGrid extends React.Component<GameGridProps> {
  wrapperRef: React.RefObject<HTMLDivElement> = React.createRef();
  /** Number of columns in the grid from the most recent render. */
  columns: number = 0;

  componentDidMount(): void {
    this.updateCssVars();
    this.updatePropRefs();
  }

  componentDidUpdate(): void {
    this.updateCssVars();
    this.updatePropRefs();
  }

  render() {
    const games = this.props.games || [];
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
            // Calculate and set column/row count
            // (16 is the width of a scroll-bar in pixels - at least on windows)
            let columnCount: number = 0;
            let rowCount: number = 0;
            if (games.length > 0) {
              columnCount = Math.max(1, ((width - 16) / this.props.cellWidth) | 0); // ("x|0" is the same as Math.floor(x))
              rowCount = Math.ceil(games.length / columnCount);
            }
            this.columns = columnCount;
            // Calculate overscan
            const overscan: number = Math.min(Math.max(1, (60 / columnCount) | 0), 15);
            // Calculate column and row of selected item
            let scrollToColumn: number = -1;
            let scrollToRow: number = -1;
            if (this.props.selectedGame) {
              const index: number = games.indexOf(this.props.selectedGame);
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
                columnCount={columnCount}
                rowCount={rowCount}
                scrollToColumn={scrollToColumn}
                scrollToRow={scrollToRow}>
                {({ onSectionRendered, scrollToColumn, scrollToRow }) => (
                  <Grid
                    className='game-grid simple-scroll'
                    // Grid stuff
                    width={width}
                    height={height}
                    columnWidth={this.props.cellWidth}
                    rowHeight={this.props.cellHeight}
                    columnCount={columnCount}
                    rowCount={rowCount}
                    overscanColumnCount={0}
                    overscanRowCount={overscan}
                    cellRenderer={this.cellRenderer}
                    noContentRenderer={this.props.noRowsRenderer}
                    // ArrowKeyStepper props
                    scrollToColumn={scrollToColumn}
                    scrollToRow={scrollToRow}
                    onSectionRendered={onSectionRendered}
                    // Pass-through props (they have no direct effect on the grid)
                    // (If any property is changed the grid is re-rendered, even these)
                    orderBy={this.props.orderBy}
                    orderReverse={this.props.orderReverse}
                    justDoIt={()=>{}} // (This makes it re-render each time - workaround)
                    />
                )}
              </ArrowKeyStepper>
            );
          }}
        </AutoSizer>
      </GameItemContainer>
    );
  }

  /** Renders a single cell in the game grid. */
  cellRenderer = (props: GridCellProps): React.ReactNode => {
    const { draggedGame, games, gameImages, selectedGame } = this.props;
    if (!games) { throw new Error('Trying to render a cell in game grid, but no games are found?'); }
    if (!gameImages) { throw new Error('Trying to render a cell in game grid, but game image loader is not found?'); }
    const index: number = props.rowIndex * this.columns + props.columnIndex;
    const game = games[index];
    if (!game) { return; }
    const thumbnail = gameImages.getThumbnailPath(game);
    return (
      <GameGridItem
        { ...props }
        key={props.key}
        game={game} 
        thumbnail={thumbnail || ''}
        isDraggable={true}
        isSelected={game === selectedGame}
        isDragged={game === draggedGame} />
    );
  }

  /** When a key is pressed (while the grid, or one of its children, is selected). */
  onKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      if (this.props.selectedGame) {
        this.props.onGameLaunch(this.props.selectedGame);
      }
    }
  }

  /** When a cell is clicked. */
  onGameSelect = (event: React.MouseEvent, gameId: string | undefined): void => {
    this.onGameSelected(this.findGame(gameId));
  }
  
  /** When a cell is double clicked. */
  onGameLaunch = (event: React.MouseEvent, gameId: string): void => {
    const game = this.findGame(gameId);
    if (game) { this.props.onGameLaunch(game); }
  }

  /** When a cell is right clicked. */
  onGameContextMenu = (event: React.MouseEvent<HTMLDivElement>, gameId: string | undefined): void => {
    if (this.props.onContextMenu) {
      const game = this.findGame(gameId);
      if (game) { this.props.onContextMenu(game); }
    }
  }
  
  /** When a cell is starting to be dragged. */
  onGameDragStart = (event: React.DragEvent, gameId: string | undefined): void => {
    if (this.props.onGameDragStart) {
      const game = this.findGame(gameId);
      if (game) { this.props.onGameDragStart(event, game); }
    }
  }
  
  /** When a cell is ending being dragged. */
  onGameDragEnd = (event: React.DragEvent, gameId: string | undefined): void => {
    if (this.props.onGameDragEnd) {
      const game = this.findGame(gameId);
      if (game) { this.props.onGameDragEnd(event, game); }
    }
  }

  /** When a cell is selected. */
  onScrollToChange = (params: ScrollIndices): void => {
    if (!this.props.games) { throw new Error('Games array is missing.'); }
    if (params.scrollToColumn === -1 || params.scrollToRow === -1) {
      this.onGameSelected(undefined);
    } else {
      const game = this.props.games[params.scrollToRow * this.columns + params.scrollToColumn];
      if (game) {
        this.onGameSelected(game);
      }
    }
  }

  /** Wrapper for calling the prop "onGameSelect". */
  onGameSelected(game?: IGameInfo): void {
    if (this.props.onGameSelect) {
      this.props.onGameSelect(game);
    }
  }

  /** Find the game with a specific ID. */
  findGame(gameId: string | undefined): IGameInfo | undefined {
    if (gameId !== undefined && this.props.games) {
      return this.props.games.find(game => game.id === gameId);
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
    wrapper.style.setProperty('--width', this.props.cellWidth+'');
    wrapper.style.setProperty('--height', this.props.cellHeight+'');
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
      this.props.gridRef(ref);
    }
  }
}
