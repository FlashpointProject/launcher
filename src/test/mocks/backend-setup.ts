import { MsgEvent, SocketServer } from '@back/SocketServer';
import { BackIn, BackInTemplate } from '@shared/back/types';
import { ws } from 'msw';

type Callback<T, U extends (...args: any[]) => any> = (event: T, ...args: Parameters<U>) => (ReturnType<U> | Promise<ReturnType<U>>);

export const mockServerUrl = 'ws://localhost:10000';
export type MockHandlers = Partial<{
  [key in keyof BackInTemplate]: Callback<MsgEvent, BackInTemplate[key]>;
}>;
const mockServer = ws.link(mockServerUrl);

export const defaultHandlers: MockHandlers = {
  [BackIn.GET_START_TIME]: () => 0,
};

// Helper to create server handlers with specific mocked functions
export function createBackendHandler(
  customHandlers: MockHandlers = {}
) {
  const mergedHandlers = { ...defaultHandlers, ...customHandlers };
  const server: SocketServer = new SocketServer();
  server.port = 10000;
  server.api.registered = mergedHandlers;

  return mockServer.addEventListener('connection', ({ client }) => {
    server.onConnect(client as any);
  });
}
