import { SharedSocket } from '@shared/back/SharedSocket';
import { BackIn, GetGameData, WrappedRequest } from '@shared/back/types';
import { WS } from 'jest-websocket-mock';

describe('Shared Socket', () => {
  const socketHref = 'ws://localhost:1234';
  let mockServer: WS;
  const client: SharedSocket<WebSocket> = new SharedSocket(WebSocket);

  beforeEach(async () => {
    console.log('--SETUP--');
    // Open fresh mock server, do auth to setup client
    mockServer = new WS(socketHref);
    mockServer.nextMessage.then(() => { mockServer.send('secretResponse'); console.log('Mock Server - Auth Sent'); });
    const socket = await SharedSocket.connect(WebSocket, socketHref, 'secret');
    // Fill socket data
    client.setSocket(socket);
    client.url = socketHref;
    client.secret = 'secret';
    console.log('--SETUP DONE--');
  });

  afterEach(async () => {
    // Close all connections before next test
    console.log('--CLEAN UP--');
    client.disconnect();
    WS.clean();
    console.log('--CLEAN UP DONE--');
  });

  test('Simple Reconnect', async () => {
    // Close the mock server, client should try and reconnect
    mockServer.close();
    console.log('Mock Server - Closed Own Connection');
    // Create a new mock server and response to the first connected message (auth)
    mockServer = new WS(socketHref);
    console.log('Mock Server - Recreated Own Connection');
    // If we get a message, they must've connected
    await mockServer.connected;
    console.log('Mock Server - Someone Connected');
    await mockServer.nextMessage.then(() => { mockServer.send('secretResponse'); console.log('Mock Server - Auth Sent');  });
  });

  test('Send Request', async () => {
    console.log('TEST - Send Request');
    const req: WrappedRequest<any> = {
      id: 'Success',
      type: BackIn.GENERIC_RESPONSE
    };
    client.sendReq<any, GetGameData>(req);
    await expect(mockServer).toReceiveMessage(JSON.stringify(req));
  });

  // test('Reconnect on Error', async () => {
  //   const reconnectSpy = jest.spyOn(sharedSocket, 'reconnect');
  //   expect(reconnectSpy).not.toHaveBeenCalled();
  //   // Error server to trigger reconnect
  //   console.log('Mock Server - Erroring');
  //   mockServer.error();
  //   mockServer = new WS(socketHref);
  //   console.log('Mock Server - Recreated');
  //   // Reconnect will be trying to auth, respond first
  //   await mockServer.connected;
  //   console.log('Mock Server - Got a connection, responding to next message with auth');
  //   await mockServer.nextMessage.then(() => { console.log('RESPONDING'); mockServer.send('secretResponse'); });
  //   console.log('Mock Server - Authed, connection should be successful');
  // });
});