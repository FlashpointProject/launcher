import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { List, AutoSizer, ListRowProps, ArrowKeyStepper, ScrollIndices } from 'react-virtualized';
import { GameListItem } from './GameListItem';
import { GameOrderBy, GameOrderReverse } from '../GameOrder';
import { IGameInfo } from '../../../shared/game/interfaces';
import { GameThumbnailCollection } from '../../GameThumbnailCollection';
import { RenderedSection } from 'react-virtualized/dist/es/Grid';

export interface IGameListProps extends IDefaultProps {
  gameThumbnails?: GameThumbnailCollection;
  games?: IGameInfo[];
  rowHeight: number;
  noRowsRenderer?: () => JSX.Element;
  // React-Virtualized Pass-through
  orderBy?: GameOrderBy;
  orderReverse?: GameOrderReverse;
}

export interface IGameListState {
  scrollToIndex: number;
}

export class GameList extends React.Component<IGameListProps, IGameListState> {
  constructor(props: IGameListProps) {
    super(props);
    this.state = {
      scrollToIndex: -1,
    }
    this.rowRenderer = this.rowRenderer.bind(this);
    this.onItemClick = this.onItemClick.bind(this);
    this.onItemDoubleClick = this.onItemDoubleClick.bind(this);
    this.onKeyPress = this.onKeyPress.bind(this);
    this.selectIndex = this.selectIndex.bind(this);
    this.onRowsRendered = this.onRowsRendered.bind(this);
  }

  render() {
    const games = this.props.games || [];
    const rowCount = games.length;
    return (
      <div className="game-browser" onKeyPress={this.onKeyPress}>
        <AutoSizer>
          {({ width, height }) => (
            <ArrowKeyStepper
              onScrollToChange={this.selectIndex}
              mode='cells'
              isControlled={true}
              columnCount={1}
              rowCount={rowCount}
              scrollToRow={this.state.scrollToIndex}>
              {({ onSectionRendered, scrollToColumn, scrollToRow }) => (
                <List
                  className="game-list"
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

  /** */
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
  onItemClick(index: number): void {
    this.setState({ scrollToIndex: index });
  }
  
  /** When a list item is double clicked */
  onItemDoubleClick(game: IGameInfo): void {
    this.startGame(game);
  }

  /** Select a row / list item */
  selectIndex(params: Partial<ScrollIndices>): void {
    this.setState({
      scrollToIndex: params.scrollToRow === undefined ? 
                   this.state.scrollToIndex :
                   params.scrollToRow
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
}

/** The interface used by the only parameter of List's prop onRowsRendered */
interface RowsRenderedInfo {
  overscanStartIndex: number;
  overscanStopIndex: number;
  startIndex: number;
  stopIndex: number;
}
