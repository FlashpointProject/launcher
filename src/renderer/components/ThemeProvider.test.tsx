import { initialMainState, updateSystemThemeCss, updateThemeCss } from '@renderer/store/main/slice';
import { initialPreferencesState, updatePreferences } from '@renderer/store/preferences/slice';
import { getFileServerURL } from '@shared/Util';
import { renderWithProviders } from '@test/redux';
import { useTestServer } from '@test/useTestServer';
import { ITheme } from 'flashpoint-launcher';
import { act } from 'react';
import uuid from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from './ThemeProvider';


describe('ThemeProvider', () => {
  const coreHref = './styles/core.css';
  const fancyHref = './styles/fancy.css';

  useTestServer();

  beforeEach(() => {
    // Add core and fancy CSS elements that normally exist in the template
    const coreLink = document.createElement('link');
    coreLink.setAttribute('data-corecss', 'true');
    coreLink.setAttribute('href', coreHref);
    coreLink.setAttribute('type', 'text/css');
    coreLink.setAttribute('rel', 'stylesheet');
    document.head.appendChild(coreLink);

    const fancyLink = document.createElement('link');
    fancyLink.setAttribute('data-fancycss', 'true');
    fancyLink.setAttribute('href', fancyHref);
    fancyLink.setAttribute('type', 'text/css');
    fancyLink.setAttribute('rel', 'stylesheet');
    document.head.appendChild(fancyLink);
  });

  afterEach(() => {
    // Clean up all theme-related elements after test
    const themeElements = document.head.querySelectorAll('[data-theme="true"]');
    const coreElements = document.head.querySelectorAll('[data-corecss="true"]');
    const fancyElements = document.head.querySelectorAll('[data-fancycss="true"]');

    themeElements.forEach((elem) => {
      try { elem.remove(); } catch { /** Ignore, may have been removed already */ }
    });
    coreElements.forEach((elem) => {
      try { elem.remove(); } catch { /** Ignore, may have been removed already */ }
    });
    fancyElements.forEach((elem) => {
      try { elem.remove(); } catch { /** Ignore, may have been removed already */ }
    });
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
    const expectedUrl = `${getFileServerURL()}/Themes/${themeList[0].id}/${themeList[0].entryPath}?v=0`;
    const themeElement = container.ownerDocument.querySelector(`[data-theme="true"][href="${expectedUrl}"]`) as HTMLLinkElement;
    expect(themeElement).toBeInTheDocument();
    expect(themeElement.tagName).toBe('LINK');
    expect(themeElement.getAttribute('type')).toBe('text/css');
    expect(themeElement.getAttribute('rel')).toBe('stylesheet');
    expect(themeElement.getAttribute('href')).toBe(expectedUrl);

    // Check theme element is updated with new current theme
    act(() => {
      store.dispatch(updatePreferences({
        currentTheme: themeList[1].id
      }));
    });

    const newExpectedUrl = `${getFileServerURL()}/Themes/${themeList[1].id}/${themeList[1].entryPath}?v=0`;
    const updatedElement = container.ownerDocument.querySelector(`[data-theme="true"][href="${newExpectedUrl}"]`) as HTMLLinkElement;
    expect(updatedElement.getAttribute('href')).toBe(newExpectedUrl);

    // Check theme element is updated with new version number
    act(() => {
      store.dispatch(updateThemeCss());
    });

    const newExpectedVerUrl = `${getFileServerURL()}/Themes/${themeList[1].id}/${themeList[1].entryPath}?v=1`;
    const updatedVerElement = container.ownerDocument.querySelector(`[data-theme="true"][href="${newExpectedVerUrl}"]`) as HTMLLinkElement;
    expect(updatedVerElement.getAttribute('href')).toBe(newExpectedVerUrl);

    // Check system themes also update with new version number
    act(() => {
      store.dispatch(updateSystemThemeCss());
    });

    const coreHrefNew = `${coreHref}?v=1`;
    const fancyHrefNew = `${fancyHref}?v=1`;
    const coreVerElement = container.ownerDocument.querySelector(`[data-corecss="true"][href="${coreHrefNew}"]`) as HTMLLinkElement;
    const fancyVerElement = container.ownerDocument.querySelector(`[data-fancycss="true"][href="${fancyHrefNew}"]`) as HTMLLinkElement;
    expect(coreVerElement).toBeInTheDocument();
    expect(fancyVerElement).toBeInTheDocument();

    // Check theme elements are gone when no theme is set
    act(() => {
      store.dispatch(updatePreferences({
        currentTheme: undefined
      }));
    });

    const elementAfterUnset = container.ownerDocument.querySelector('[data-theme="true"]') as HTMLLinkElement;
    expect(elementAfterUnset).toBe(null);
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

