import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import { BackInit, ViewGame } from '../shared/back/types';
import { IAppConfigData } from '../shared/config/interfaces';
import { IGameInfo } from '../shared/game/interfaces';
import { ILogEntry } from '../shared/Log/interface';
import { GameOrderBy, GameOrderReverse } from '../shared/order/interfaces';
import { IAppPreferencesData } from '../shared/preferences/interfaces';
import { GameManager } from './game/GameManager';

export type BackState = {
  isInit: boolean;
  server: WebSocket.Server;
  secret: string;
  preferences: IAppPreferencesData;
  config: IAppConfigData;
  configFolder: string;
  gameManager: GameManager;
  messageQueue: WebSocket.MessageEvent[];
  isHandling: boolean;
  init: { [key in BackInit]: boolean; };
  initEmitter: InitEmitter;
  queries: Record<string, BackQueryChache>;
  log: ILogEntry[];
}

export type BackQueryChache = {
  query: BackQuery;
  games: IGameInfo[];
  viewGames: ViewGame[];
}

export type BackQuery = {
  extreme: boolean;
  broken: boolean;
  library: string;
  search: string;
  orderBy: GameOrderBy;
  orderReverse: GameOrderReverse;
}

type InitEmitter = (
  EmitterPart<BackInit, () => void>
) & EventEmitter

interface EmitterPart<E extends string | number | Symbol, F extends (...args: any[]) => void> {
  on(event: E, listener: F): this;
  once(event: E, listener: F): this;
  off(event: E, listener: F): this;
  emit(event: E, ...args: Parameters<F>): boolean;
}
