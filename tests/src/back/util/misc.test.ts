import * as path from 'path';
import { pathExists, copyError } from '@back/util/misc';

describe('Miscellaneous Backend', () => {
  test('Check Path Exists', async () => {
    const realPath = './';
    const fakePath = path.join('./', 'FAKE_PATH');
    const brokenPath = '*';

    await expect(pathExists(realPath)).resolves.toBeTruthy();
    await expect(pathExists(fakePath)).resolves.toBeFalsy();
    await expect(pathExists(brokenPath)).rejects;
  });

  test('Copy Error', () => {
    // Basic Error
    const errorBasic = { name: 'test', message: 'test' };
    expect(copyError(errorBasic)).toEqual(errorBasic);

    // @TODO Check error standards for the custom copies
  });
});