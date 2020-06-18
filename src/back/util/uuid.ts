import { randomBytes } from 'crypto';
import * as guid from 'uuid/v4';

/**
 * Wrapper function over uuid's v4 method that attempts to source
 * entropy using the window Crypto instance rather than through
 * Node.JS.
 */
export function uuid() {
  return guid({ random: bufferToNumbers(randomBytes(16)) });
}

function bufferToNumbers(buffer: Buffer): number[] {
  const array: number[] = [];
  for (let i = 0; i < buffer.length; i++) {
    array[i] = buffer[i];
  }
  return array;
}
