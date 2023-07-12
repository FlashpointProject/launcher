import { BaseSocket, SocketRequestData, SocketResponseData, isErrorResponse, SocketTemplate } from './types';

// Base types of generics
type T_BASE = number
type U_BASE<T extends T_BASE> = SocketTemplate<T, any>

export type SocketServerData<
  T extends T_BASE,
  U extends U_BASE<T>,
  SOCKET extends BaseSocket
> = {
  /** All connected clients. */
  clients: SocketServerClient<T, U, SOCKET>[];
  /** ID of the next client that connects. */
  next_client_id: number;
}

export type SocketServerClient<
  T extends T_BASE,
  U extends U_BASE<T>,
  SOCKET extends BaseSocket
> = {
  /** Unique ID of the client. */
  id: number;
  /** ID to use for the next message sent to this client. */
  next_id: number;
  /** Sent messages waiting for a response. */
  sent: SentRequest<U[T]>[];
  /** WebSocket. */
  socket?: SOCKET;
}

type SentRequest<T> = {
  id: number;
  resolve: (sent: SocketResponseData<T>) => void;
}

export function create_server<
  T extends T_BASE,
  U extends U_BASE<T>,
  SOCKET extends BaseSocket
>(): SocketServerData<T, U, SOCKET> {
  return {
    clients: [],
    next_client_id: 0,
  };
}

export function server_add_client<
  T extends T_BASE,
  U extends U_BASE<T>,
  SOCKET extends BaseSocket
>(server: SocketServerData<T, U, SOCKET>): SocketServerClient<T, U, SOCKET> {
  const client: SocketServerClient<T, U, SOCKET> = {
    id: server.next_client_id,
    next_id: 0,
    sent: [],
    socket: undefined,
  };

  server.next_client_id += 1;

  server.clients.push(client);

  return client;
}

export function server_request<
  T extends T_BASE,
  U extends U_BASE<T>,
  SOCKET extends BaseSocket,
  TYPE extends keyof SocketTemplate<T, U>
>(
  client: SocketServerClient<T, U, SOCKET>,
  type: TYPE,
  ...args: Parameters<SocketTemplate<T, U>[TYPE]>
): Promise<ReturnType<SocketTemplate<T, U>[TYPE]>> {
  // @TODO Time-out the request if it is not responded to within some time frame
  return new Promise((resolve, reject) => {
    if (client.socket) {
      const id = client.next_id;

      client.next_id += 1;

      client.sent.push({
        id: id,
        resolve: (sent) => {
          if (isErrorResponse(sent)) {
            reject(sent.error);
          } else {
            resolve(sent.result);
          }
        },
      });

      server_send_internal(client, id, type, ...args);
    } else {
      reject(new Error(`Failed to send message. Client does not have a socket (Client ID: ${client.id}).`));
    }
  });
}

export function server_send<
  T extends T_BASE,
  U extends U_BASE<T>,
  SOCKET extends BaseSocket,
  TYPE extends keyof SocketTemplate<T, U>
>(
  client: SocketServerClient<T, U, SOCKET>,
  type: TYPE,
  ...args: Parameters<SocketTemplate<T, U>[TYPE]>
): void {
  server_send_internal(client, undefined, type, ...args);
}

function server_send_internal<
  T extends T_BASE,
  U extends U_BASE<T>,
  SOCKET extends BaseSocket,
  TYPE extends keyof SocketTemplate<T, U>
>(
  client: SocketServerClient<T, U, SOCKET>,
  id: number | undefined,
  type: TYPE,
  ...args: Parameters<SocketTemplate<T, U>[TYPE]>
): void {
  if (client.socket) {
    const request: SocketRequestData = {
      id: id,
      type: type,
      args: args,
    };

    client.socket.send(JSON.stringify(request));
  } else {
    throw new Error(`Failed to send message. Client does not have a socket (Client ID: ${client.id}).`);
  }
}

export function server_broadcast<
  T extends T_BASE,
  U extends U_BASE<T>,
  SOCKET extends BaseSocket,
  TYPE extends keyof SocketTemplate<T, U>
>(
  server: SocketServerData<T, U, SOCKET>,
  type: TYPE,
  ...args: Parameters<SocketTemplate<T, U>[TYPE]>
) {
  server.clients.map(client => server_send(client, type, ...args));
}
