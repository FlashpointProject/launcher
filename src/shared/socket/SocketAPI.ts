import { SocketRequestData, SocketResponseData, SocketTemplate } from './types';

/** Callback that is registered to a specific type. */
type Callback<T, U extends (...args: any[]) => any> = (event: T, ...args: Parameters<U>) => (ReturnType<U> | Promise<ReturnType<U>>)

/** Callback that is registered to all messages. */
type AnyCallback<T, U extends number> = (event: T, type: U, args: any[]) => void

// Base types of generics
type T_BASE = number
type U_BASE<T extends T_BASE> = SocketTemplate<T, any>
type EVENT_BASE = {}

export type SocketAPIData<
  T extends T_BASE,
  U extends U_BASE<T>,
  EVENT extends EVENT_BASE
> = {
  /** Message handlers for specific message types (one per each message type). */
  registered: Partial<{
    [key in keyof U]: Callback<EVENT, U[key]>;
  }>;
  /** Message handlers for all message types (all are called for each message). */
  registered_any: AnyCallback<EVENT, T>[];
}

export function create_api<
  T extends T_BASE,
  U extends U_BASE<T>,
  EVENT extends EVENT_BASE
>(): SocketAPIData<T, U, EVENT> {
  return {
    registered: {},
    registered_any: [],
  };
}

export function api_register<
  T extends T_BASE,
  U extends U_BASE<T>,
  EVENT extends EVENT_BASE,
  TYPE extends T
>(
  api: SocketAPIData<T, U, EVENT>,
  type: TYPE,
  callback: Callback<EVENT, U[TYPE]>
): void {
  if (type in api.registered) {
    console.warn(`Registering callback over an already used type (type: ${type}). You can ignore this message if it is intentional.`);
  }

  api.registered[type] = callback;
}

export function api_unregister<
  T extends T_BASE,
  U extends U_BASE<T>,
  EVENT extends EVENT_BASE
>(
  api: SocketAPIData<T, U, EVENT>,
  type: T
): void {
  if (type in api.registered) {
    delete api.registered[type];
  }
}

export function api_register_any<
  T extends T_BASE,
  U extends U_BASE<T>,
  EVENT extends EVENT_BASE
>(
  api: SocketAPIData<T, U, EVENT>,
  callback: AnyCallback<EVENT, T>
): void {
  api.registered_any.push(callback);
}

export function api_unregister_any<
  T extends T_BASE,
  U extends U_BASE<T>,
  EVENT extends EVENT_BASE
>(
  api: SocketAPIData<T, U, EVENT>,
  callback: AnyCallback<EVENT, T>
): void {
  const index = api.registered_any.indexOf(callback);
  if (index >= 0) {
    api.registered_any.splice(index, 1);
  }
}

export async function api_handle_message<
  T extends T_BASE,
  U extends U_BASE<T>,
  EVENT extends EVENT_BASE
>(
  api: SocketAPIData<T, U, EVENT>,
  data: SocketRequestData | SocketResponseData<unknown>,
  event: EVENT,
): Promise<[
    SocketResponseData<unknown> | undefined, // Incoming response (resolve/reject promise)
    SocketResponseData<unknown> | undefined, // Outgoing response (send this)
  ]> {
  log('Socket Server - Message received');

  if ('type' in data) { // Request
    log(
      '  Request',
      '\n    ID:  ', data.id,
      '\n    Type:', data.type,
      '\n    Args:', data.args,
    );

    // Handle message
    for (let i = 0; i < api.registered_any.length; i++) {
      const callback_any = api.registered_any[i];
      callback_any(event, data.type as T, data.args);
    }

    const callback = api.registered[data.type];
    let result: any;
    let error: any;
    if (callback) {
      try {
        result = await callback(event, ...data.args as any);
      } catch (e) {
        // console.error(`An error was thrown from inside a callback (type: ${data.type}).`, e);
        error = e.toString();
      }
    }

    // Respond
    if (data.id !== undefined) {
      if (typeof data.id === 'number') {
        const response: SocketResponseData<T> = {
          id: data.id,
        };
        if (result !== undefined) { response.result = result; }
        if (error !== undefined) { response.error = error; }

        log(
          '  Response',
          '\n    Result:', response.result,
          '\n    Error: ', response.error,
        );

        return [undefined, response];
      } else {
        console.error(`Socket Client - Failed to respond to request, request ID is not of type "number" (type: "${typeof data.id}").`);
      }
    }
  } else { // Response
    return [data, undefined];
  }

  return [undefined, undefined];
}

function log(...args: any[]): void {
  // console.log(...args);
}
