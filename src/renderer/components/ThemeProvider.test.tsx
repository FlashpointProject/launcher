import { initialMainState, updateThemeCss } from '@renderer/store/main/slice';
import { initialPreferencesState, updatePreferences } from '@renderer/store/preferences/slice';
import { getFileServerURL } from '@shared/Util';
import { renderWithProviders } from '@test/redux';
import { useTestServer } from '@test/useTestServer';
import { ITheme } from 'flashpoint-launcher';
import { act } from 'react';
import uuid from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from './ThemeProvider';

describe('ThemeProvider', () => {
  useTestServer();

  afterEach(() => {
    // Clean up theme elements after test
    const themeElement = document.head.querySelector('[data-theme="true"]');
    if (themeElement) {
      themeElement.remove();
    }
  });

  it('update dom based on state change', async () => {
    const themeList = [
      createMockTheme(),
      createMockTheme(),
    ];

    const { container, store } = renderWithProviders(<ThemeProvider/>, {
      preloadedState: {
        main: {
          ...initialMainState(),
          themeList,
        },
        preferences: {
          ...initialPreferencesState(),
          currentTheme: themeList[0].id
        }
      }
    });

    // Check theme element was created
    const themeElement = container.ownerDocument.querySelector('[data-theme="true"]') as HTMLLinkElement;
    expect(themeElement).toBeInTheDocument();
    expect(themeElement.tagName).toBe('LINK');
    expect(themeElement.getAttribute('type')).toBe('text/css');
    expect(themeElement.getAttribute('rel')).toBe('stylesheet');
    const expectedUrl = `${getFileServerURL()}/Themes/${themeList[0].id}/${themeList[0].entryPath}?v=0`;
    expect(themeElement.getAttribute('href')).toBe(expectedUrl);

    // Check theme element is updated with new current theme
    act(() => {
      store.dispatch(updatePreferences({
        currentTheme: themeList[1].id
      }));
    });

    const updatedElement = container.ownerDocument.querySelector('[data-theme="true"]') as HTMLLinkElement;
    const newExpectedUrl = `${getFileServerURL()}/Themes/${themeList[1].id}/${themeList[1].entryPath}?v=0`;
    expect(updatedElement.getAttribute('href')).toBe(newExpectedUrl);

    // Check theme element is updated with new version number
    act(() => {
      store.dispatch(updateThemeCss());
    });

    const updatedVerElement = container.ownerDocument.querySelector('[data-theme="true"]') as HTMLLinkElement;
    const newExpectedVerUrl = `${getFileServerURL()}/Themes/${themeList[1].id}/${themeList[1].entryPath}?v=1`;
    expect(updatedVerElement.getAttribute('href')).toBe(newExpectedVerUrl);

    // Check theme element href is unset when no theme selected
    act(() => {
      store.dispatch(updatePreferences({
        currentTheme: undefined
      }));
    });

    const elementAfterUnset = container.ownerDocument.querySelector('[data-theme="true"]') as HTMLLinkElement;
    expect(elementAfterUnset).toBeInTheDocument();
    expect(elementAfterUnset.getAttribute('href')).toBeNull();
  });
});

function createMockTheme(): ITheme {
  const id = uuid();
  return {
    id,
    themePath: 'unused',
    entryPath: id + '.css',
    meta: {},
    files: []
  };
}

