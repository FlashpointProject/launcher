import { SocketClient } from '@shared/back/SocketClient';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeEach } from 'vitest';
import { createBackendHandler, MockHandlers, mockServerUrl } from './mocks/backend-setup';

export function useTestServer(mockHandlers?: MockHandlers) {
  const server = setupServer(createBackendHandler(mockHandlers));
  let socket: any;

  beforeEach(async () => {
    server.listen();
    socket = await SocketClient.connect(WebSocket, mockServerUrl, 'flashpoint-launcher');
    window.Shared.back = new SocketClient(WebSocket);
    window.Shared.back.secret = 'flashpoint-launcher';
    window.Shared.back.url = mockServerUrl;
    window.Shared.back.setSocket(socket);
  });

  afterEach(async () => {
    server.resetHandlers();
    if (socket) {
      await socket.close();
    }
    window.Shared.back = null as any;
  });

  afterAll(() => server.close());
}
