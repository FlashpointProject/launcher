import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { List, AutoSizer, ListRowProps, ArrowKeyStepper, ScrollIndices } from 'react-virtualized';
import { GameListItem } from './GameListItem';
import { GameOrderBy, GameOrderReverse } from '../GameOrder';
import { IGameInfo } from '../../../shared/game/interfaces';
import { GameThumbnailCollection } from '../../GameThumbnailCollection';
import { RenderedSection } from 'react-virtualized/dist/es/Grid';
import { findDOMNode } from 'react-dom';

export interface IGameListProps extends IDefaultProps {
  gameThumbnails?: GameThumbnailCollection;
  /** All games that will be shown in the list */
  games?: IGameInfo[];
  /** Height of each row/item in the list (in pixels) */
  rowHeight: number;
  /** Renders instead of list items when it is empty */
  noRowsRenderer?: () => JSX.Element;
  /** Called when a game is selected */
  onGameSelect?: (game?: IGameInfo) => void;
  // React-Virtualized Pass-through
  orderBy?: GameOrderBy;
  orderReverse?: GameOrderReverse;
}

export interface IGameListState {
  /** Index of the selected game (in the games props array) */
  scrollToIndex: number;
}

export class GameList extends React.Component<IGameListProps, IGameListState> {
  private _wrapper: React.RefObject<HTMLDivElement> = React.createRef();
  /** Game that was selected on the previous update */
  private _prevGameSelection: IGameInfo|undefined;

  constructor(props: IGameListProps) {
    super(props);
    this.state = {
      scrollToIndex: -1,
    }
    this.rowRenderer = this.rowRenderer.bind(this);
    this.onItemClick = this.onItemClick.bind(this);
    this.onItemDoubleClick = this.onItemDoubleClick.bind(this);
    this.onKeyPress = this.onKeyPress.bind(this);
    this.onScrollToChange = this.onScrollToChange.bind(this);
    this.onRowsRendered = this.onRowsRendered.bind(this);
  }

  componentDidMount(): void {
    this.updateCssVars();
  }

  componentDidUpdate(): void {
    this.updateCssVars();
    // Check if the game selection has been changed
    let game: IGameInfo|undefined;
    if (this.props.games) {
      game = this.props.games[this.state.scrollToIndex];
    }
    if (game !== this._prevGameSelection) {
      if (this.props.onGameSelect) { this.props.onGameSelect(game); }
      this._prevGameSelection = game;
    }
  }

  render() {
    const games = this.props.games || [];
    const rowCount = games.length;
    return (
      <div className="game-browser" ref={this._wrapper} onKeyPress={this.onKeyPress}>
        <AutoSizer>
          {({ width, height }) => (
            <ArrowKeyStepper
              onScrollToChange={this.onScrollToChange}
              mode='cells'
              isControlled={true}
              columnCount={1}
              rowCount={rowCount}
              scrollToRow={this.state.scrollToIndex}>
              {({ onSectionRendered, scrollToColumn, scrollToRow }) => (
                <List
                  className="game-list"
                  styles={{ '--height': this.props.rowHeight }}
                  width={width}
                  height={height}
                  rowHeight={this.props.rowHeight}
                  rowCount={rowCount}
                  overscanRowCount={15}
                  noRowsRenderer={this.props.noRowsRenderer}
                  rowRenderer={this.rowRenderer}
                  // ArrowKeyStepper props
                  scrollToIndex={scrollToRow}
                  onRowsRendered={this.onRowsRendered.bind(this, onSectionRendered)}
                  // Pass-through props (they have no direct effect on the list)
                  // (If any property is changed the list is re-rendered, even these)
                  orderBy={this.props.orderBy}
                  orderReverse={this.props.orderReverse}
                  />
              )}
            </ArrowKeyStepper>
          )}
        </AutoSizer>
      </div>
    );
  }

  /** Renders a single row / list item */
  rowRenderer(props: ListRowProps): React.ReactNode {
    if (!this.props.games) { throw new Error('Trying to render a row in game list, but no games are found?'); }
    if (!this.props.gameThumbnails) { throw new Error('Trying to render a row in game list, but game thumbnail loader is not found?'); }
    const game = this.props.games[props.index];
    let thumbnail = this.props.gameThumbnails.getFilePath(game.title);
    const isSelected: boolean = (this.state.scrollToIndex === props.index);
    return (
      <GameListItem key={props.key} {...props} 
                    game={game} 
                    thumbnail={thumbnail||''} 
                    height={this.props.rowHeight} 
                    onClick={this.onItemClick}
                    onDoubleClick={this.onItemDoubleClick}
                    isSelected={isSelected}
                    />
    );
  }

  /** When a key is pressed (while the list, or one of its children, is selected) */
  onKeyPress(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Enter') {
      if (!this.props.games) { throw new Error('Can not start game because the game list is empty.'); }
      const index: number = this.state.scrollToIndex;
      if (index >= 0 && index < this.props.games.length) {
        const game = this.props.games[index];
        if (!game) { throw new Error('Can not start game because game is not in game list.'); }
        this.startGame(game);
      }
    }
  }

  /** When a list item is clicked */
  onItemClick(game: IGameInfo, index: number): void {
    this.setState({ scrollToIndex: index });
  }
  
  /** When a list item is double clicked */
  onItemDoubleClick(game: IGameInfo, index: number): void {
    this.startGame(game);
  }

  /** When a row/item is selected */
  onScrollToChange(params: Partial<ScrollIndices>): void {
    this.setState({
      scrollToIndex: params.scrollToRow !== undefined ? params.scrollToRow :
                                                        this.state.scrollToIndex
    });
  }

  /** When the game list renders - argument contains the indices of first/last rows rendered */
  onRowsRendered(onSectionRendered: (params: RenderedSection) => void, info: RowsRenderedInfo): void {
    onSectionRendered({
      columnOverscanStartIndex: 0,
      columnOverscanStopIndex: 0,
      columnStartIndex: 0,
      columnStopIndex: 0,
      rowOverscanStartIndex: info.overscanStartIndex,
      rowOverscanStopIndex: info.overscanStopIndex,
      rowStartIndex: info.startIndex,
      rowStopIndex: info.stopIndex,
    });
  }

  /** Start a game */
  startGame(game: IGameInfo): void {
    window.External.launchGameSync(game);
  }

  /** Update CSS Variables */
  updateCssVars() {
    const wrapper = this._wrapper.current;
    if (!wrapper) { throw new Error('Browse Page wrapper div not found'); }
    wrapper.style.setProperty('--height', this.props.rowHeight+'');
  }
}

/** The interface used by the only parameter of List's prop onRowsRendered */
interface RowsRenderedInfo {
  overscanStartIndex: number;
  overscanStopIndex: number;
  startIndex: number;
  stopIndex: number;
}
