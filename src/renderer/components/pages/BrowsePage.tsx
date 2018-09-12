import * as React from 'react';
import { IDefaultProps, ICentralState } from '../../interfaces';
import { ISearchOnSearchEvent } from '../Search';
import { GameList } from '../GameList';
import { IGameOrderChangeEvent } from '../GameOrder';
import { IGameInfo } from '../../../shared/game/interfaces';
import { lerp } from '../../Util';
import { BrowseSidebar } from '../BrowseSidebar';
import { GameGrid } from '../GameGrid';
import { BrowsePageLayout } from '../../../shared/BrowsePageLayout';

export interface IBrowsePageProps extends IDefaultProps {
  central?: ICentralState;
  search?: ISearchOnSearchEvent;
  order?: IGameOrderChangeEvent;
  /** Scale of the games */
  gameScale: number;
  /** Layout of the games */
  gameLayout: BrowsePageLayout;
}

export interface IBrowsePageState {
  /** Currently selected game (if any) */
  selectedGame?: IGameInfo;
}

export class BrowsePage extends React.Component<IBrowsePageProps, IBrowsePageState> {
  constructor(props: IBrowsePageProps) {
    super(props);
    this.state = {};
    this.noRowsRenderer = this.noRowsRenderer.bind(this);
    this.onGameSelect = this.onGameSelect.bind(this);
  }

  render() {
    const games: IGameInfo[] = this.orderGames();
    const order = this.props.order || BrowsePage.defaultOrder;
    const selectedGame = this.state.selectedGame;
    return (
      <div className="game-browser">
        <div className="game-browser__left">
          {(() => {
            if (this.props.gameLayout === BrowsePageLayout.grid) {
              // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
              const height: number = lerp(188, 691, this.props.gameScale) | 0; // ("x|0" is the same as Math.floor(x))
              const width: number = (height * 0.666) | 0;
              return (
                <GameGrid games={games}
                          gameThumbnails={this.props.central && this.props.central.gameThumbnails}
                          noRowsRenderer={this.noRowsRenderer}
                          onGameSelect={this.onGameSelect}
                          orderBy={order.orderBy}
                          orderReverse={order.orderReverse}
                          cellWidth={width}
                          cellHeight={height} />
              );
            } else {
              const height: number = lerp(50, 225, this.props.gameScale) | 0; // ("x|0" is the same as Math.floor(x))
              return (
                <GameList games={games}
                          gameThumbnails={this.props.central && this.props.central.gameThumbnails}
                          noRowsRenderer={this.noRowsRenderer}
                          onGameSelect={this.onGameSelect}
                          orderBy={order.orderBy}
                          orderReverse={order.orderReverse}
                          rowHeight={height}
                          />
              );
            }
          })()}
        </div>
        {(games.length > 0)?(
          <div className={'game-browser__right'+(selectedGame?'':' game-browser__right--none')}>
            <BrowseSidebar selectedGame={this.state.selectedGame} />
          </div>
        ):undefined}
      </div>
    );
  }

  private noRowsRenderer() {
    return (
      <div className="game-list__no-games">
        {this.props.central?( // (Game loading complete - kind of a hacky way to check)
          <>
            <h1 className="game-list__no-games__title">No Games Found!</h1>
            <br/>
            {(this.props.central.collection && this.props.central.collection.games.length > 0)?(
              <>
                No game title matched your search.<br/>
                Try searching for something less restrictive.
              </>
            ):(
              <>
                Have you set the path to the <b>Flashpoint directory</b> at the <i>Config</i> page?<br/>
                <br/>
                Note: You have to press <b>"Save & Restart"</b> for the games to load.
              </>
            )}
          </>
        ):(
          <>
            Loading...
          </>
        )}
      </div>
    );
  }

  private onGameSelect(game?: IGameInfo): void {
    if (this.state.selectedGame !== game) {
      this.setState({ selectedGame: game });
    }
  }

  /** Order the games according to the current settings */
  private orderGames(): IGameInfo[] {
    // -- Get the array of games --
    const games = this.props.central && this.props.central.collection && this.props.central.collection.games;
    if (!games) { return []; } // (No games found)
    // -- Filter games --
    const search = this.props.search;
    const searchText: string = (search && search.input.toLocaleLowerCase()) || '';
    const filteredGames = [];
    for (let game of games) {
      if (game.title !== undefined &&
          game.title.toLowerCase().indexOf(searchText) !== -1) {
        filteredGames.push(game);
      }
    }
    // -- Order games --
    const order = this.props.order || BrowsePage.defaultOrder;
    let orderFn: OrderFn;
    switch (order.orderBy) {
      default: //case 'title':
        orderFn = orderByTitle;
        break;
      case 'genre':
        orderFn = orderByGenre;
        break;
    }
    if (order.orderReverse === 'descending') {
      orderFn = reverseOrder(orderFn);
    }
    const orderedGames = filteredGames.sort(orderFn);
    // -- Return --
    return orderedGames;
  }

  private static defaultOrder: Readonly<IGameOrderChangeEvent> = {
    orderBy: 'title',
    orderReverse: 'ascending',
  }
}

type OrderFn = (a: IGameInfo, b: IGameInfo) => number;

/** Order games by their title alphabetically (ascending) */
function orderByTitle(a: IGameInfo, b: IGameInfo): number {
  if (a.title < b.title) { return -1; }
  if (a.title > b.title) { return  1; }
  return 0;
}

/** Order games by their genre alphabetically (ascending) */
function orderByGenre(a: IGameInfo, b: IGameInfo): number {
  if (a.genre < b.genre) { return -1; }
  if (a.genre > b.genre) { return  1; }
  return 0;
}

/** Reverse the order (makes an ascending order function descending instead) */
function reverseOrder(compareFn: OrderFn): OrderFn {
  return (a: IGameInfo, b: IGameInfo) => {
    const ret: number = compareFn(a, b);
    if (ret ===  1) { return -1; }
    if (ret === -1) { return  1; }
    return 0;
  }
}
