import * as React from 'react';
import { ArrowKeyStepper, AutoSizer, List, ListRowProps, ScrollIndices } from 'react-virtualized';
import { IGameInfo } from '../../shared/game/interfaces';
import { GameOrderBy, GameOrderReverse } from '../../shared/order/interfaces';
import { GameImageCollection } from '../image/GameImageCollection';
import { findElementAncestor } from '../Util';
import { GameItemContainer } from './GameItemContainer';
import { GameListHeader } from './GameListHeader';
import { GameListItem } from './GameListItem';

/** A function that receives an HTML element. */
type RefFunc<T extends HTMLElement> = (instance: T | null) => void;

export type GameListProps = {
  gameImages: GameImageCollection;
  /** All games that will be shown in the list. */
  games?: IGameInfo[];
  /** Currently selected game (if any). */
  selectedGame?: IGameInfo;
  /** Currently dragged game (if any). */
  draggedGame?: IGameInfo;
  /** Height of each row in the list (in pixels). */
  rowHeight: number;
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
  listRef?: RefFunc<HTMLDivElement>;
};

/** A list of rows, where each rows displays a game. */
export class GameList extends React.Component<GameListProps> {
  private _wrapper: React.RefObject<HTMLDivElement> = React.createRef();

  componentDidMount(): void {
    this.updateCssVars();
  }

  componentDidUpdate(): void {
    this.updateCssVars();
  }

  render() {
    const games = this.props.games || [];
    // Render
    return (
      <div
        className='game-list-wrapper'
        ref={this._wrapper}>
        <GameListHeader />
        <GameItemContainer
          className='game-browser__center-inner'
          onGameSelect={this.onGameSelect}
          onGameLaunch={this.onGameLaunch}
          onGameContextMenu={this.onGameContextMenu}
          onGameDragStart={this.onGameDragStart}
          onGameDragEnd={this.onGameDragEnd}
          findGameId={this.findGameId}
          onKeyPress={this.onKeyPress}>
          <AutoSizer>
            {({ width, height }) => {
              // Calculate column and row of selected item
              const rowCount = games.length;
              let scrollToIndex: number = -1;
              if (this.props.selectedGame) {
                scrollToIndex = games.indexOf(this.props.selectedGame);
              }
              return (
                <ArrowKeyStepper
                  onScrollToChange={this.onScrollToChange}
                  mode='cells'
                  isControlled={true}
                  columnCount={1}
                  rowCount={rowCount}
                  scrollToRow={scrollToIndex}>
                  {({ onSectionRendered, scrollToColumn, scrollToRow }) => (
                    <List
                      className='game-list simple-scroll'
                      width={width}
                      height={height}
                      rowHeight={this.props.rowHeight}
                      rowCount={rowCount}
                      overscanRowCount={15}
                      noRowsRenderer={this.props.noRowsRenderer}
                      rowRenderer={this.rowRenderer}
                      // ArrowKeyStepper props
                      scrollToIndex={scrollToRow}
                      onSectionRendered={onSectionRendered}
                      // Pass-through props (they have no direct effect on the list)
                      // (If any property is changed the list is re-rendered, even these)
                      orderBy={this.props.orderBy}
                      orderReverse={this.props.orderReverse}
                      />
                  )}
                </ArrowKeyStepper>
              );
            }}
          </AutoSizer>
        </GameItemContainer>
      </div>
    );
  }

  /** Renders a single row in the game list. */
  rowRenderer = (props: ListRowProps): React.ReactNode => {
    const { draggedGame, games, gameImages, rowHeight, selectedGame } = this.props;
    if (!games) { throw new Error('Trying to render a row in game list, but no games are found?'); }
    const game = games[props.index];
    return (
      <GameListItem
        { ...props }
        key={props.key}
        game={game}
        isDraggable={true}
        isSelected={game === selectedGame}
        isDragged={game === draggedGame} />
    );
  }

  /** When a key is pressed (while the list, or one of its children, is selected). */
  onKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      if (this.props.selectedGame) {
        this.props.onGameLaunch(this.props.selectedGame);
      }
    }
  }

  /** When a row is clicked. */
  onGameSelect = (event: React.MouseEvent, gameId: string | undefined): void => {
    this.onGameSelected(this.findGame(gameId));
  }

  /** When a row is double clicked. */
  onGameLaunch = (event: React.MouseEvent, gameId: string): void => {
    const game = this.findGame(gameId);
    if (game) { this.props.onGameLaunch(game); }
  }

  /** When a row is right clicked. */
  onGameContextMenu = (event: React.MouseEvent<HTMLDivElement>, gameId: string | undefined): void => {
    if (this.props.onContextMenu) {
      const game = this.findGame(gameId);
      if (game) { this.props.onContextMenu(game); }
    }
  }

  /** When a row is starting to be dragged. */
  onGameDragStart = (event: React.DragEvent, gameId: string | undefined): void => {
    if (this.props.onGameDragStart) {
      const game = this.findGame(gameId);
      if (game) { this.props.onGameDragStart(event, game); }
    }
  }

  /** When a row is ending being dragged. */
  onGameDragEnd = (event: React.DragEvent, gameId: string | undefined): void => {
    if (this.props.onGameDragEnd) {
      const game = this.findGame(gameId);
      if (game) { this.props.onGameDragEnd(event, game); }
    }
  }

  /** When a row is selected. */
  onScrollToChange = (params: ScrollIndices): void => {
    if (!this.props.games) { throw new Error('Games array is missing.'); }
    if (params.scrollToRow === -1) {
      this.onGameSelected(undefined);
    } else {
      const game = this.props.games[params.scrollToRow];
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
    const game = findElementAncestor(element as Element, target => GameListItem.isElement(target), true);
    if (game) { return GameListItem.getId(game); }
  }

  /** Update CSS Variables */
  updateCssVars() {
    const ref = this._wrapper.current;
    if (!ref) { throw new Error('Browse Page wrapper div not found'); }
    ref.style.setProperty('--height', this.props.rowHeight+'');
  }
}
