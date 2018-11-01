import { IGameInfo, IGameSearchQuery } from './interfaces';
import { IGameOrderChangeEvent } from '../../renderer/components/GameOrder';
import { IGamePlaylist } from 'src/renderer/playlist/interfaces';

export type OrderFn = (a: IGameInfo, b: IGameInfo) => number;

/** Order games by their order title alphabetically (ascending) */
export function orderByTitle(a: IGameInfo, b: IGameInfo): number {
  if (a.orderTitle < b.orderTitle) { return -1; }
  if (a.orderTitle > b.orderTitle) { return  1; }
  return 0;
}

/** Order games by their genre alphabetically (ascending) */
export function orderByGenre(a: IGameInfo, b: IGameInfo): number {
  if (a.genre < b.genre) { return -1; }
  if (a.genre > b.genre) { return  1; }
  return orderByTitle(a, b);
}

/** Order games by the date-time they were added (ascending) */
export function orderByDateAdded(a: IGameInfo, b: IGameInfo): number {
  if (a.dateAdded < b.dateAdded) { return -1; }
  if (a.dateAdded > b.dateAdded) { return  1; }
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
    case 'dateAdded':
      orderFn = orderByDateAdded;
      break;
  }
  if (order.orderReverse === 'descending') {
    orderFn = reverseOrder(orderFn);
  }
  return orderFn;
}

/** Return a new array with all broken games removed (if showBroken is false) */
export function filterBroken(showBroken: boolean, games: IGameInfo[]): IGameInfo[] {
  if (showBroken) { return games; }
  const filteredGames: IGameInfo[] = [];
  for (let game of games) {
    if (!game.broken) {
      filteredGames.push(game);
    }
  }
  return filteredGames;
}

/** Return a new array with all extreme games removed (if showExtreme is false) */
export function filterExtreme(showExtreme: boolean, games: IGameInfo[]): IGameInfo[] {
  if (showExtreme) { return games; }
  const filteredGames: IGameInfo[] = [];
  for (let game of games) {
    if (!game.extreme) {
      filteredGames.push(game);
    }
  }
  return filteredGames;
}

/** Return a new array with all games that are not in the playlist removed (if playlist isnt undefined) */
export function filterPlaylist(playlist: IGamePlaylist|undefined, games: IGameInfo[]): IGameInfo[] {
  if (!playlist) { return games; }
  const filteredGames: IGameInfo[] = [];
  for (let gameEntry of playlist.games) {
    const id = gameEntry.id;
    for (let game of games) {
      if (game.id === id) {
        filteredGames.push(game);
        break;
      }
    }
  }
  return filteredGames;
}

/** Return a new array with all games that doesn't match the search removed (if there is a search) */
export function filterSearch(search: IGameSearchQuery, games: IGameInfo[]): IGameInfo[] {
  const filteredGames: Array<IGameInfo|undefined> = games.slice();
  if (search.text) {
    const text = search.text;
    for (let i = filteredGames.length - 1; i >= 0; i--) {
      const game = filteredGames[i];
      if (game) {
        if (game.title.toLowerCase().indexOf(text)     === -1 &&
            game.developer.toLowerCase().indexOf(text) === -1 &&
            game.publisher.toLowerCase().indexOf(text) === -1 &&
            game.series.toLowerCase().indexOf(text)    === -1) {
          filteredGames[i] = undefined;
        }
      }

    }
  }
  if (search.developers) {
    for (let developer of search.developers) {
      for (let i = filteredGames.length - 1; i >= 0; i--) {
        const game = filteredGames[i];
        if (game && game.developer.toLowerCase().indexOf(developer) === -1) {
          filteredGames[i] = undefined;
        }
      }
    }
  }
  if (search.platforms) {
    for (let platform of search.platforms) {
      for (let i = filteredGames.length - 1; i >= 0; i--) {
        const game = filteredGames[i];
        if (game && game.platform.toLowerCase().indexOf(platform) === -1) {
          filteredGames[i] = undefined;
        }
      }
    }
  }
  if (search.genres) {
    for (let genre of search.genres) {
      for (let i = filteredGames.length - 1; i >= 0; i--) {
        const game = filteredGames[i];
        if (game && game.genre.toLowerCase().indexOf(genre) === -1) {
          filteredGames[i] = undefined;
        }
      }
    }
  }
  const finalFilteredGames = [];
  for (let game of filteredGames) {
    if (game) { finalFilteredGames.push(game); }
  }
  return finalFilteredGames;
}
