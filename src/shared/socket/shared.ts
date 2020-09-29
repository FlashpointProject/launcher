import { SocketRequestData, SocketResponseData } from './types';

/**
 * Parse WebSocket data as a JSON string.
 * Note: This expects the raw_data to be a string or buffer (of some sort). Arbitrary objects will not work!
 * @param raw_data Raw JSON data to parse.
 */
export function parse_message_data(raw_data: any): [unknown | undefined, Error | undefined] {
  // @TODO Look up what types "data" can be of
  // Parse message data to string
  let data_string: string | undefined;
  let data_string_error: any | undefined;
  try {
    if (typeof raw_data === 'string') {
      data_string = raw_data;
    } else if (Buffer.isBuffer(raw_data)) {
      data_string = raw_data.toString();
    } else if (Array.isArray(raw_data)) {
      data_string = raw_data.reduce((acc, buffer) => acc + buffer.toString(), '');
    } else {
      data_string = Buffer.from(raw_data as any).toString();
    }
  } catch (e) {
    data_string_error = e;
  }

  if (data_string_error) { return [undefined, data_string_error]; }
  if (data_string === undefined) { return [undefined, new Error('Failed to parse message data into string.')]; }

  // Parse data string to object
  let data_object: any | undefined;
  let data_object_error: any | undefined;
  try {
    data_object = JSON.parse(data_string);
  } catch (e) {
    data_object_error = e;
  }

  if (data_object_error) { return [undefined, data_object_error]; }

  return [data_object, undefined];
}

/**
 * Validate that an object is a valid socket request/response.
 * @param data Object to validate.
 * @returns Same object (if valid) or an error.
 */
export function validate_socket_message<T>(data: any): [SocketRequestData | SocketResponseData<T> | undefined, Error | undefined] {
  // Verify shared types
  const shared_errors = [];
  if (typeof data !== 'object') {
    shared_errors.push(`The data object is not of type "object" (it is "${typeof data}").`);
  }
  if (typeof data.id !== 'number' && data.id !== undefined) {
    shared_errors.push(`"id" is not of type "number" (it is "${typeof data.id}").`);
  }

  if (shared_errors.length > 0) {
    return [undefined, new Error('Message is incorrectly formatted. ' + shared_errors.join(' '))];
  }

  // Verify request
  // @TODO Verify more of the message (perhaps even the argument and result data?)
  const request_errors: string[] = [];

  if ('args' in data && 'type' in data) {
    if (!Array.isArray(data.args)) {
      request_errors.push(`"args" is not an array (it is "${typeof data.args}").`);
    }
    if (typeof data.type !== 'number' && typeof data.type !== 'string') {
      request_errors.push(`"type" is not of type "number" or "string" (it is "${typeof data.type}").`);
    }
  }

  if (request_errors.length === 0) {
    return [data, undefined];
  } else {
    return [undefined, new Error('Message is incorrectly formatted. ' + request_errors.join(' '))];
  }
}
