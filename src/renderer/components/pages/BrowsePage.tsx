import * as React from 'react';
import { IDefaultProps, ICentralState } from '../../interfaces';
import { ILaunchBoxPlatform, ILaunchBoxGame } from '../../../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';
import { List, AutoSizer, ListRowProps } from 'react-virtualized';
import { GameList } from '../gamelist/GameList';
import { IGameOrderChangeEvent, GameOrderBy, GameOrderReverse } from '../GameOrder';

export interface IBrowsePageProps extends IDefaultProps {
  central?: ICentralState;
  search?: ISearchOnSearchEvent;
  order?: IGameOrderChangeEvent;
}
export interface IBrowsePageState {
}

export class BrowsePage extends React.Component<IBrowsePageProps, IBrowsePageState> {
  constructor(props: IBrowsePageProps) {
    super(props);
    this.state = {
    };
  }
  
  render() {
    // Path to game icons
    let flashpointPath: string = (this.props.central && this.props.central.flashpointPath) || '';
    if (flashpointPath) { flashpointPath += '/Arcade/Images/Flash/Box - Front'; }
    // Order games
    const games: ILaunchBoxGame[] = this.orderGames();
    // Render
    const order = this.props.order || BrowsePage.defaultOrder;
    return (
      <div className="game-browser">
        <GameList games={games}
                  imageFolder={flashpointPath}
                  orderBy={order.orderBy}
                  orderReverse={order.orderReverse}
                  />
      </div>
    );
  }

  /** Order the games according to the current settings */
  private orderGames(): ILaunchBoxGame[] {
    // -- Get the array of games --
    const games = this.props.central && this.props.central.platform && this.props.central.platform.games;
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

type OrderFn = (a: ILaunchBoxGame, b: ILaunchBoxGame) => number;

/** Order games by their title alphabetically (ascending) */
function orderByTitle(a: ILaunchBoxGame, b: ILaunchBoxGame): number {
  if ((a.title||'') < (b.title||'')) { return -1; }
  if ((a.title||'') > (b.title||'')) { return  1; }
  return 0;
}

/** Order games by their genre alphabetically (ascending) */
function orderByGenre(a: ILaunchBoxGame, b: ILaunchBoxGame): number {
  if ((a.genre||'') < (b.genre||'')) { return -1; }
  if ((a.genre||'') > (b.genre||'')) { return  1; }
  return 0;
}

/** Reverse the order (makes an ascending order function descending instead) */
function reverseOrder(compareFn: OrderFn): OrderFn {
  return (a: ILaunchBoxGame, b: ILaunchBoxGame) => {
    const ret: number = compareFn(a, b);
    if (ret ===  1) { return -1; }
    if (ret === -1) { return  1; }
    return 0;
  }
}
