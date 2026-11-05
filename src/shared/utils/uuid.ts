import { v4 as guid } from 'uuid';

/**
 * Fills a buffer with the required number of random bytes.
 *
 * Attempt to use the Chromium-provided crypto library rather than
 * Node.JS. For some reason the Node.JS randomBytes function adds
 * _considerable_ (1s+) synchronous load time to the start up.
 *
 * See
 *  https://developer.mozilla.org/en-US/docs/Web/API/Window/crypto
 *  https://github.com/kelektiv/node-uuid/issues/189
 *
 *  @param count Number of bytes to return
 */
function getRandomBytes(count: number): Uint8Array {
  const rndBuf = new Uint8Array(count);
  crypto.getRandomValues(rndBuf);
  return rndBuf;
}

/**
 * Wrapper function over uuid's v4 method that attempts to source
 * entropy using the window Crypto instance rather than through
 * Node.JS.
 */
export function uuid() {
  return guid({ random: getRandomBytes(16) });
}

/**
 * Check if a semi-UUIDv4 string is valid
 * (since a lot of games in Flashpoint does not follow the UUIDv4 spec entirely
 *  we have to make a more lenient script for validating them)
 * (A "semi-UUIDv4" follows the following pattern:
 *  "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" where "x" is any hexadecimal character)
 *
 * @param uuid Semi-UUIDv4 string to check the validity of
 * @returns Whether or not the argument is a valid semi-UUIDv4 string
 */
export function validateSemiUUID(uuid: string): boolean {
  if (uuid.length !== 36) { return false; }
  for (let i = 0; i < 36; i++) {
    switch (i) {
      case 8:
      case 13:
      case 18:
      case 23:
        if (uuid[i] !== '-') { return false; }
        break;
      default:
        switch (uuid[i]) {
          case '0':
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
          case 'a':
          case 'b':
          case 'c':
          case 'd':
          case 'e':
          case 'f': break;
          default: return false;
        }
        break;
    }
  }
  return true;
}
