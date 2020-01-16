/* Tests for src/main/renderer/Util.ts */
import { shuffle, joinLibraryRoute, getGameImageURL, getPlatformIconURL, toForcedURL, toURL, openConfirmDialog, isFlashpointValidCheck, easterEgg, findElementAncestor } from '@renderer/Util';
import * as Util from '@shared/Util';
import * as path from 'path';
import { STATIC_PATH } from '@tests/setup';
import { SharedSocket } from '@shared/back/SharedSocket';

jest.mock('@shared/Util');

describe('Util.shuffle()', function () {
  const list: any[] = [9, '12', 29, 'Hello', 3.9, 'Flashpoint', -90];
  expect(shuffle(list)).not.toBe([ 9, '12', 29, 'Hello', 3.9, 'Flashpoint', -90 ]);
});

describe('Util.joinLibraryRoute()', function () {

  test('Empty Route', () => {
    const route: string = '';
    expect(joinLibraryRoute(route)).toBe('/browse');
  });
  test('Passing a route', () => {
    const route: string = 'arcade';
    expect(joinLibraryRoute(route)).toBe('/browse/arcade');
  });
  test('Lots of slashes', () => {
    const route: string = 'arcade/flash/plugin/shockwa///ve';
    expect(joinLibraryRoute(route)).toBe('/browse/arcadeflashpluginshockwave');
  });
  test('Double dots', () => {
    const route: string = '..';
    expect(joinLibraryRoute(route)).toBe('/browse');
  });
  test('Double dots with slashes', () => {
    const route: string = 'a/../b//c';
    expect(joinLibraryRoute(route)).toBe('/browse/a..bc');
  });
});

describe('Util Renderer Various', () => {
  const mockUtil = Util as jest.Mocked<typeof Util>;
  mockUtil.getFileServerURL.mockImplementation(() => 'http://mockserver');

  const mockSocket: SharedSocket<WebSocket> = jest.genMockFromModule('@shared/back/SharedSocket');
  mockSocket.send = jest.fn();

  test('Easter Egg Search', () => {
    window.External = {
      back: mockSocket
    } as any;
    easterEgg('taco');
    expect(window.External.back.send).not.toHaveBeenCalled();
    easterEgg('DarkMoe');
    expect(window.External.back.send).toHaveBeenCalled();
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