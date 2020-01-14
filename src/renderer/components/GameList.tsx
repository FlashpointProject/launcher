import * as React from 'react';
import { ArrowKeyStepper, AutoSizer, List, ListRowProps, ScrollIndices, ScrollParams } from 'react-virtualized';
import { ViewGame } from '@shared/back/types';
import { GameOrderBy, GameOrderReverse } from '@shared/order/interfaces';
import { GAMES } from '../interfaces';
import { findElementAncestor } from '../Util';
import { GameItemContainer } from './GameItemContainer';
import { GameListHeader } from './GameListHeader';
import { GameListItem } from './GameListItem';
/** A function that receives an HTML element. */
type RefFunc<T extends HTMLElement> = (instance: T | null) => void;

const RENDERER_OVERSCAN = 15;
const BACK_OVERSCAN = 100;

export type GameListProps = {
  onRequestGames: (start: number, end: number) => void;
  /** All games that will be shown in the list. */
  games?: GAMES;
  /** Total number of games there are. */
  gamesTotal: number;
  /** Currently selected game (if any). */
  selectedGameId?: string;
  /** Currently dragged game (if any). */
  draggedGameId?: string;
  /** Height of each row in the list (in pixels). */
  rowHeight: number;
  /** Function that renders the elements to show instead of the grid if there are no games (render prop). */
  noRowsRenderer?: () => JSX.Element;
  /** Called when the user attempts to select a game. */
  onGameSelect: (gameId?: string) => void;
  /** Called when the user attempts to launch a game. */
  onGameLaunch: (gameId: string) => void;
  /** Called when the user attempts to open a context menu (at a game). */
  onContextMenu: (gameId: string) => void;
  /** Called when the user starts to drag a game. */
  onGameDragStart: (event: React.DragEvent, gameId: string) => void;
  /** Called when the user stops dragging a game (when they release it). */
  onGameDragEnd: (event: React.DragEvent, gameId: string) => void;
  // React-Virtualized pass-through props (their values are not used for anything other than updating the grid when changed)
  orderBy?: GameOrderBy;
  orderReverse?: GameOrderReverse;
  /** Function for getting a reference to grid element. Called whenever the reference could change. */
  listRef?: RefFunc<HTMLDivElement>;
};

/** A list of rows, where each rows displays a game. */
export class GameList extends React.Component<GameListProps> {
  private _wrapper: React.RefObject<HTMLDivElement> = React.createRef();
  /** Currently displayed games. */
  currentGames: GAMES | undefined = undefined;

  componentDidMount(): void {
    this.updateCssVars();
  }

  componentDidUpdate(): void {
    this.updateCssVars();
  }

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
              let scrollToIndex: number = -1;
              if (this.props.selectedGameId) {
                scrollToIndex = findGameIndex(games, this.props.selectedGameId);
              }
              return (
                <ArrowKeyStepper
                  onScrollToChange={this.onScrollToChange}
                  mode='cells'
                  isControlled={true}
                  columnCount={1}
                  rowCount={this.props.gamesTotal}
                  scrollToRow={scrollToIndex}>
                  {({ onSectionRendered, scrollToColumn, scrollToRow }) => (
                    <List
                      className='game-list simple-scroll'
                      width={width}
                      height={height}
                      rowHeight={this.props.rowHeight}
                      rowCount={this.props.gamesTotal}
                      overscanRowCount={RENDERER_OVERSCAN}
                      noRowsRenderer={this.props.noRowsRenderer}
                      rowRenderer={this.rowRenderer}
                      onScroll={this.onScroll}
                      // ArrowKeyStepper props
                      scrollToIndex={scrollToRow}
                      onSectionRendered={onSectionRendered}
                      // Pass-through props (they have no direct effect on the list)
                      // (If any property is changed the list is re-rendered, even these)
                      pass_orderBy={this.props.orderBy}
                      pass_orderReverse={this.props.orderReverse}
                      pass_gamesChanged={gamesChanged}
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
    const { draggedGameId, games, selectedGameId } = this.props;
    if (!games) { throw new Error('Trying to render a row in game list, but no games are found?'); }
    const game = games[props.index];
    return game ? (
      <GameListItem
        { ...props }
        key={props.key}
        id={game.id}
        title={game.title}
        platform={game.platform}
        tags={game.genre}
        developer={game.developer}
        publisher={game.publisher}
        isDraggable={true}
        isSelected={game.id === selectedGameId}
        isDragged={game.id === draggedGameId} />
    ) : <div key={props.key} style={props.style} />;
  }

  onScroll = (params: ScrollParams) => {
    const top = Math.max(0, Math.floor(params.scrollTop / this.props.rowHeight) - BACK_OVERSCAN);
    const bot = Math.min(Math.ceil((params.scrollTop + params.clientHeight) / this.props.rowHeight) + BACK_OVERSCAN, this.props.gamesTotal);
    this.props.onRequestGames(top, (bot - top));
  }

  /** When a key is pressed (while the list, or one of its children, is selected). */
  onKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      if (this.props.selectedGameId) {
        this.props.onGameLaunch(this.props.selectedGameId);
      }
    }
  }

  /** When a row is clicked. */
  onGameSelect = (event: React.MouseEvent, gameId: string | undefined): void => {
    this.props.onGameSelect(gameId);
  }

  /** When a row is double clicked. */
  onGameLaunch = (event: React.MouseEvent, gameId: string): void => {
    this.props.onGameLaunch(gameId);
  }

  /** When a row is right clicked. */
  onGameContextMenu = (event: React.MouseEvent<HTMLDivElement>, gameId: string): void => {
    this.props.onContextMenu(gameId);
  }

  /** When a row is starting to be dragged. */
  onGameDragStart = (event: React.DragEvent, gameId: string): void => {
    this.props.onGameDragStart(event, gameId);
  }

  /** When a row is ending being dragged. */
  onGameDragEnd = (event: React.DragEvent, gameId: string): void => {
    this.props.onGameDragEnd(event, gameId);
  }

  /** When a row is selected. */
  onScrollToChange = (params: ScrollIndices): void => {
    if (!this.props.games) { throw new Error('Games array is missing.'); }
    if (params.scrollToRow === -1) {
      this.props.onGameSelect(undefined);
    } else {
      const game = this.props.games[params.scrollToRow];
      if (game) { this.props.onGameSelect(game.id); }
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

function findGameIndex(games: GAMES | undefined, gameId: string | undefined): number {
  if (gameId !== undefined && games) {
    for (let index in games) {
      const game = games[index];
      if (game && game.id === gameId) { return (index as any) | 0; }
    }
  }
  return -1;
}

function findGame(games: GAMES | undefined, gameId: string | undefined): ViewGame | undefined {
  if (gameId !== undefined && games) {
    for (let index in games) {
      const game = games[index];
      if (game && game.id === gameId) { return game; }
    }
  }
}
