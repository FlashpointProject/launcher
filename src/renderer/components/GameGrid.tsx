import * as React from 'react';
import { IDefaultProps } from '../interfaces';
import { AutoSizer, ArrowKeyStepper, ScrollIndices } from 'react-virtualized';
import { GameOrderBy, GameOrderReverse } from './GameOrder';
import { IGameInfo } from '../../shared/game/interfaces';
import { RenderedSection, Grid, GridCellProps } from 'react-virtualized/dist/es/Grid';
import { GameGridItem } from './GameGridItem';
import { GameImageCollection } from '../image/GameImageCollection';

export interface IGameGridProps extends IDefaultProps {
  gameThumbnails?: GameImageCollection;
  /** All games that will be shown in the list */
  games?: IGameInfo[];
  /** Selected game (if any) */
  selectedGame?: IGameInfo;
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

export class GameGrid extends React.Component<IGameGridProps, {}> {
  private _wrapper: React.RefObject<HTMLDivElement> = React.createRef();
  /** Number of columns from the most recent render */
  private columns: number = 0;

  constructor(props: IGameGridProps) {
    super(props);
    this.state = {};
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
    if (!this.props.gameThumbnails) { throw new Error('Trying to render a row in game list, but game image loader is not found?'); }
    const index: number = props.rowIndex * this.columns + props.columnIndex;
    const game = this.props.games[index];
    if (!game) { return; }
    let thumbnail = this.props.gameThumbnails.getFilePath(game.title, game.platform);
    return (
      <GameGridItem key={props.key} {...props} 
                    game={game} 
                    thumbnail={thumbnail||''} 
                    width={this.props.cellWidth}
                    height={this.props.cellHeight}
                    onClick={this.onItemClick}
                    onDoubleClick={this.onItemDoubleClick}
                    isSelected={game === this.props.selectedGame}
                    index={index} />
    );
  }

  /** When a key is pressed (while the list, or one of its children, is selected) */
  onKeyPress(event: React.KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (this.props.selectedGame) {
        window.External.launchGameSync(this.props.selectedGame);
      }
    }
  }

  /** When a list item is clicked */
  onItemClick(game: IGameInfo, index: number): void {
    this.onGameSelect(game);
  }
  
  /** When a list item is double clicked */
  onItemDoubleClick(game: IGameInfo, index: number): void {
    window.External.launchGameSync(game);
  }

  /** When a row/item is selected */
  onScrollToChange(params: ScrollIndices): void {
    if (!this.props.games) { throw new Error('Games array is missing.'); }
    if (params.scrollToColumn === -1 || params.scrollToRow === -1) {
      this.onGameSelect(undefined);
    } else {
      const game = this.props.games[params.scrollToRow * this.columns + params.scrollToColumn];
      if (game) {
        this.onGameSelect(game);
      }
    }
  }

  onGameSelect(game?: IGameInfo): void {
    if (this.props.onGameSelect) {
      this.props.onGameSelect(game);
    }
  }

  /** Update CSS Variables */
  updateCssVars() {
    const wrapper = this._wrapper.current;
    if (!wrapper) { throw new Error('Browse Page wrapper div not found'); }
    wrapper.style.setProperty('--width', this.props.cellWidth+'');
    wrapper.style.setProperty('--height', this.props.cellHeight+'');
  }
}
