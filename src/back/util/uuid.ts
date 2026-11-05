import { randomBytes } from 'crypto';
import { v4 as guid } from 'uuid';

/**
 * Wrapper function over uuid's v4 method that attempts to source
 * entropy using the window Crypto instance rather than through
 * Node.JS.
 */
export function uuid() {
  return guid({ random: randomBytes(16) });
}
