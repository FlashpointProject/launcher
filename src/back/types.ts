import * as WebSocket from 'ws';
import { Server } from 'ws';
import { IAppConfigData } from '../shared/config/interfaces';
import { IAppPreferencesData } from '../shared/preferences/interfaces';
import { GameManager } from './game/GameManager';

export type BackState = {
  isInit: boolean;
  server: Server;
  secret: string;
  preferences: IAppPreferencesData;
  config: IAppConfigData;
  configFolder: string;
  gameManager: GameManager;
  messageQueue: WebSocket.MessageEvent[];
  isHandling: boolean;
}
