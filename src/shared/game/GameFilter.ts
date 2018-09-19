import { IGameInfo } from './interfaces';
import { IGameOrderChangeEvent } from '../../renderer/components/GameOrder';

export type OrderFn = (a: IGameInfo, b: IGameInfo) => number;

/** Order games by their title alphabetically (ascending) */
export function orderByTitle(a: IGameInfo, b: IGameInfo): number {
  if (a.title < b.title) { return -1; }
  if (a.title > b.title) { return  1; }
  return 0;
}

/** Order games by their genre alphabetically (ascending) */
export function orderByGenre(a: IGameInfo, b: IGameInfo): number {
  if (a.genre < b.genre) { return -1; }
  if (a.genre > b.genre) { return  1; }
  return 0;
}

/** Reverse the order (makes an ascending order function descending instead) */
export function reverseOrder(compareFn: OrderFn): OrderFn {
  return (a: IGameInfo, b: IGameInfo) => {
    const ret: number = compareFn(a, b);
    if (ret ===  1) { return -1; }
    if (ret === -1) { return  1; }
    return 0;
  }
}

/** Get the order function for a given game order */
export function getOrderFunction(order: IGameOrderChangeEvent): OrderFn {
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
  return orderFn;
}

/** Return a new array with all extreme games removed (if showExtreme is false) */
export function filterExtreme(games: IGameInfo[], showExtreme: boolean): IGameInfo[] {
  if (showExtreme) { return games; }
  const filteredGames: IGameInfo[] = [];
  for (let game of games) {
    if (!game.extreme) {
      filteredGames.push(game);
    }
  }
  return filteredGames;
}

/** Return a new array with all games that doesn't match the search removed (if there is a search) */
export function filterSearch(games: IGameInfo[], searchText?: string): IGameInfo[] {
  if (!searchText) { return games; }
  const filteredGames: IGameInfo[] = [];
  for (let game of games) {
    if (game.title !== undefined &&
        game.title.toLowerCase().indexOf(searchText) !== -1) {
      filteredGames.push(game);
    }
  }
  return filteredGames;
}
