export type SocketTemplate<T extends number, U extends { [key in T]: (...args: any[]) => any; }> = {
  [key in keyof U]: U[key];
}

/** Data of a websocket request message. */
export type SocketRequestData = {
  /** Unique ID of the message (undefined if not tracked). */
  id?: number;
  /** Type of message (determines what callback to use). */
  type: any;
  /** Arguments to call the callback with. */
  args: any[];
}

/** Data of a websocket response message. */
export type SocketResponseData<T> = SocketResponseData_Error<T> | SocketResponseData_Result<T>;

export type SocketResponseData_Error<T> = {
  /** Unique ID of the message. */
  id: number;
  /** Arguments to call the callback with. */
  error: any;
}

export type SocketResponseData_Result<T> = {
  /** Unique ID of the message. */
  id: number;
  /** Type of message (determines what callback to use). */
  result: T;
}

export function isErrorResponse<T>(variable: SocketResponseData<T>): variable is SocketResponseData_Error<T> {
  return Object.prototype.hasOwnProperty.call(variable, 'error');
}

/** Minimal WebSocket interface. */
export interface BaseSocket {
  onclose:   CB;
  onerror:   CB;
  onmessage: CB;
  onopen:    CB;
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  readyState: number;
}
type CB = ((ev: any) => any) | null;
