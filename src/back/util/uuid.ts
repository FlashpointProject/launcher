import { randomBytes } from 'crypto';

// Work around synchronously seeding of random buffer in the v1
// version of uuid by explicitly only requiring v4. As far as I'm
// aware we cannot use an import statement here without causing webpack
// to load the v1 version as well.
//
// See
//  https://github.com/kelektiv/node-uuid/issues/189
const guid = require('uuid/v4') as (options?: { random?: Buffer }) => string;

/**
 * Wrapper function over uuid's v4 method that attempts to source
 * entropy using the window Crypto instance rather than through
 * Node.JS.
 */
export function uuid() {
  return guid({ random: randomBytes(16) });
}
