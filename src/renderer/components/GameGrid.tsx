import * as React from 'react';
import { IDefaultProps } from '../interfaces';
import { AutoSizer, ArrowKeyStepper, ScrollIndices } from 'react-virtualized';
import { GameOrderBy, GameOrderReverse } from './GameOrder';
import { IGameInfo } from '../../shared/game/interfaces';
import { GameThumbnailCollection } from '../GameThumbnailCollection';
import { RenderedSection, Grid, GridCellProps } from 'react-virtualized/dist/es/Grid';
import { GameGridItem } from './GameGridItem';

export interface IGameGridProps extends IDefaultProps {
  gameThumbnails?: GameThumbnailCollection;
  /** All games that will be shown in the list */
  games?: IGameInfo[];
  /** Width of each cell/item in the list (in pixels) */
  cellWidth: number;
  /** Height of each cell/item in the list (in pixels) */
  cellHeight: number;
  /** Function that renders the child(ren) of the game list when it is empty */
  noRowsRenderer?: () => JSX.Element;
  /** Called when a game is selected */
  onGameSelect?: (game?: IGameInfo) => void;
  // React-Virtualized Pass-through
  orderBy?: GameOrderBy;
  orderReverse?: GameOrderReverse;
}

export interface IGameGridState {
  /** Index of the currently selected row */
  scrollToRow: number;
  /** Index of the currently selected column */
  scrollToColumn: number;
}

export class GameGrid extends React.Component<IGameGridProps, IGameGridState> {
  private _wrapper: React.RefObject<HTMLDivElement> = React.createRef();
  /** Game that was selected on the previous update */
  private _prevGameSelection: IGameInfo|undefined;
  // Current number of rows and columns
  private columns: number = 0;
  private rows: number = 0;

  constructor(props: IGameGridProps) {
    super(props);
    this.state = {
      scrollToRow: -1,
      scrollToColumn: -1,
    }
    this.cellRenderer = this.cellRenderer.bind(this);
    this.onItemClick = this.onItemClick.bind(this);
    this.onItemDoubleClick = this.onItemDoubleClick.bind(this);
    this.onKeyPress = this.onKeyPress.bind(this);
    this.onScrollToChange = this.onScrollToChange.bind(this);
  }

  componentDidMount(): void {
    this.updateCssVars();
  }

  componentDidUpdate(): void {
    this.updateCssVars();
    // Check if the game selection has been changed
    let game: IGameInfo|undefined;
    if (this.props.games) {
      game = this.props.games[this.state.scrollToRow * this.columns + this.state.scrollToColumn];
    }
    if (game !== this._prevGameSelection) {
      if (this.props.onGameSelect) { this.props.onGameSelect(game); }
      this._prevGameSelection = game;
    }
  }

  render() {
    const games = this.props.games || [];
    return (
      <div className="game-browser" ref={this._wrapper} onKeyPress={this.onKeyPress}>
        <AutoSizer>
          {({ width, height }) => {
            // Calculate and set column/row count
            // (16 is the width of a scrollbar in pixels - at least on windows)
            let columnCount: number = 0;
            let rowCount: number = 0;
            if (games.length > 0) {
              columnCount = Math.max(1, ((width - 16) / this.props.cellWidth) | 0); // ("x|0" is the same as Math.floor(x))
              rowCount = Math.ceil(games.length / columnCount);
            }
            this.columns = columnCount;
            this.rows = rowCount;
            // Calculate overscan
            const overscan: number = Math.min(Math.max(1, (60 / columnCount) | 0), 15);
            // Render
            return (
              <ArrowKeyStepper
                onScrollToChange={this.onScrollToChange}
                mode='cells'
                isControlled={true}
                columnCount={columnCount}
                rowCount={rowCount}
                scrollToColumn={this.state.scrollToColumn}
                scrollToRow={this.state.scrollToRow}>
                {({ onSectionRendered, scrollToColumn, scrollToRow }) => (
                  <Grid
                    className="game-grid"
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
                    // Pass-through props (they have no direct effect on the list)
                    // (If any property is changed the list is re-rendered, even these)
                    orderBy={this.props.orderBy}
                    orderReverse={this.props.orderReverse}
                    justDoIt={()=>{}} // (This makes it re-render each time - workaround)
                    />
                )}
              </ArrowKeyStepper>
            );
          }}
        </AutoSizer>
      </div>
    );
  }

  /** Renders a single row / list item */
  cellRenderer(props: GridCellProps): React.ReactNode {
    if (!this.props.games) { throw new Error('Trying to render a row in game list, but no games are found?'); }
    if (!this.props.gameThumbnails) { throw new Error('Trying to render a row in game list, but game thumbnail loader is not found?'); }
    const index: number = props.rowIndex * this.columns + props.columnIndex;
    const game = this.props.games[index];
    if (!game) { return; }
    let thumbnail = this.props.gameThumbnails.getFilePath(game.title);
    const isSelected: boolean = (this.state.scrollToColumn === props.columnIndex &&
                                 this.state.scrollToRow    === props.rowIndex);
    return (
      <GameGridItem key={props.key} {...props} 
                    game={game} 
                    thumbnail={thumbnail||''} 
                    width={this.props.cellWidth}
                    height={this.props.cellHeight}
                    onClick={this.onItemClick}
                    onDoubleClick={this.onItemDoubleClick}
                    isSelected={isSelected}
                    index={index}
                    />
    );
  }

  /** When a key is pressed (while the list, or one of its children, is selected) */
  onKeyPress(event: React.KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (!this.props.games) { throw new Error('Can not start game because the game list is empty.'); }
      const index: number = this.state.scrollToRow * this.columns + this.state.scrollToColumn;
      if (index >= 0 && index < this.props.games.length) {
        const game = this.props.games[index];
        if (!game) { throw new Error('Can not start game because game is not in game list.'); }
        window.External.launchGameSync(game);
      }
    }
  }

  /** When a list item is clicked */
  onItemClick(game: IGameInfo, index: number): void {
    // Select the clicked item
    this.setState({
      scrollToColumn: index % this.columns,
      scrollToRow: (index / this.columns) | 0, // ("x|0" is the same as Math.floor(x))
    }); 
  }
  
  /** When a list item is double clicked */
  onItemDoubleClick(game: IGameInfo, index: number): void {
    window.External.launchGameSync(game);
  }

  /** When a row/item is selected */
  onScrollToChange(params: Partial<ScrollIndices>): void {
    if (!this.props.games) { throw new Error('Games array is missing.'); }
    // Get column
    let column = params.scrollToColumn;
    if (column === undefined) { column = this.state.scrollToColumn; }
    // Get row
    let row = params.scrollToRow;
    if (row === undefined) { row = this.state.scrollToRow; }
    // Cap column if it tries to select a cell after the limit
    if (row * this.columns + column >= this.props.games.length) {
      column = (this.props.games.length - 1) % this.columns;
    }
    // Update state
    this.setState({
      scrollToColumn: column,
      scrollToRow: row,
    });
  }

  /** Update CSS Variables */
  updateCssVars() {
    const wrapper = this._wrapper.current;
    if (!wrapper) { throw new Error('Browse Page wrapper div not found'); }
    wrapper.style.setProperty('--width', this.props.cellWidth+'');
    wrapper.style.setProperty('--height', this.props.cellHeight+'');
  }
}
