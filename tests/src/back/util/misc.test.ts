import * as path from 'path';
import { pathExists, copyError } from '@back/util/misc';

describe('Miscellanous Backend', () => {
  test('Check Path Exists', () => {
    const realPath = './';
    const fakePath = path.join('./', 'FAKE_PATH');

    expect(pathExists(realPath)).resolves;
    expect(pathExists(fakePath)).rejects;
  });

  test('Copy Error', () => {
    // Basic Error
    const errorBasic = { name: 'test', message: 'test' };
    expect(copyError(errorBasic)).toEqual(errorBasic);

    // @TODO Check error standards for the custom copies
  });
});