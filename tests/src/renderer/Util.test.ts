/* Tests for src/main/renderer/Util.ts */
import { easterEgg, getGameImageURL, getPlatformIconURL, isFlashpointValidCheck, joinLibraryRoute, shuffle, toForcedURL, toURL } from '@renderer/Util';
import { SharedSocket } from '@shared/back/SharedSocket';
import * as Util from '@shared/Util';
import { STATIC_PATH } from '@tests/setup';
import * as path from 'path';

jest.mock('@shared/Util');

describe('Util.shuffle()', function () {
  const list: any[] = [9, '12', 29, 'Hello', 3.9, 'Flashpoint', -90];
  expect(shuffle(list)).not.toBe([ 9, '12', 29, 'Hello', 3.9, 'Flashpoint', -90 ]);
});

describe('Util.joinLibraryRoute()', function () {

  test('Empty Route', () => {
    const route = '';
    expect(joinLibraryRoute(route)).toBe('/browse');
  });
  test('Passing a route', () => {
    const route = 'arcade';
    expect(joinLibraryRoute(route)).toBe('/browse/arcade');
  });
  test('Lots of slashes', () => {
    const route = 'arcade/flash/plugin/shockwa///ve';
    expect(joinLibraryRoute(route)).toBe('/browse/arcadeflashpluginshockwave');
  });
  test('Double dots', () => {
    const route = '..';
    expect(joinLibraryRoute(route)).toBe('/browse');
  });
  test('Double dots with slashes', () => {
    const route = 'a/../b//c';
    expect(joinLibraryRoute(route)).toBe('/browse/a..bc');
  });
});

describe('Util Renderer Various', () => {
  const mockUtil = Util as jest.Mocked<typeof Util>;
  mockUtil.getFileServerURL.mockImplementation(() => 'http://mockserver');

  const mockSocket: SharedSocket<WebSocket> = jest.genMockFromModule('@shared/back/SharedSocket');
  mockSocket.send = jest.fn();

  test('Easter Egg Search', () => {
    window.Shared = {
      back: mockSocket
    } as any;
    easterEgg('taco');
    expect(window.Shared.back.send).not.toHaveBeenCalled();
    easterEgg('DarkMoe');
    expect(window.Shared.back.send).toHaveBeenCalled();
  });

  test('Get Game Image URL', () => {
    expect(getGameImageURL('test', 'abcd')).toBe('http://mockserver/images/test/ab/cd/abcd.png');
  });

  test('Get Platform Image URL', () => {
    expect(getPlatformIconURL('test')).toBe('http://mockserver/logos/test.png');
  });

  test('To (Forced) URL', () => {
    const alreadyURL = 'https://test/';
    const notUrl = 'test';

    // Always return a URL
    expect(toForcedURL(alreadyURL)).toHaveProperty('href', alreadyURL);
    expect(toForcedURL(notUrl)).toHaveProperty('href', 'http://test/');

    // Drop non-URLs
    expect(toURL(alreadyURL)).toHaveProperty('href', alreadyURL);
    expect(toURL(notUrl)).toBe(undefined);
  });

  test('Is Flashpoint Path Valid', async () => {
    await expect(isFlashpointValidCheck(path.join(STATIC_PATH, 'Util_Renderer', 'FlashpointPath'))).resolves.toBeTruthy();
    await expect(isFlashpointValidCheck('./')).resolves.toBeFalsy();
  });
});

// findElementAncestor() - to be tested (may need mocks)