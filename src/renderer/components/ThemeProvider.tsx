import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { getFileServerURL } from '@shared/Util';
import { ITheme } from 'flashpoint-launcher';
import { PropsWithChildren, useEffect, useRef } from 'react';

type ThemeProviderProps = PropsWithChildren;

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemThemeVersion = useAppSelector(state => state.main.systemThemeVersion);
  const themeVersion = useAppSelector(state => state.main.themeVersion) + (systemThemeVersion || '');
  const availableThemes = useAppSelector(state => state.main.themeList);
  const currentTheme = useAppSelector(state => state.preferences.currentTheme);
  const coreHref = useRef(document.querySelector('[data-corecss="true"]')?.getAttribute('href') || undefined);
  const fancyHref = useRef(document.querySelector('[data-fancycss="true"]')?.getAttribute('href') || undefined);

  // Update system theme when needed
  useEffect(() => {
    if (systemThemeVersion) {
      // Don't need to update unless theme has incremented, first links are in raw HTML
      updateSystemThemeDom(systemThemeVersion, coreHref.current, fancyHref.current);
    }
  }, [systemThemeVersion]);

  // Update theme when needed
  useEffect(() => {
    const theme = availableThemes.find(t => t.id === currentTheme);
    updateThemeDom(themeVersion, theme);
  }, [themeVersion, currentTheme, availableThemes]);

  return children;
}

// Updates the System css links to force them to update with new version
function updateSystemThemeDom(version: string, coreHref?: string, fancyHref?: string): void {
  if (coreHref) {
    const existingElements = document.querySelectorAll('[data-corecss="true"]');
    const newElement = createThemeElement(`${coreHref}?v=${version}`);
    newElement.setAttribute('data-corecss', 'true');
    newElement.onload = () => {
      existingElements.forEach((elem) => {
        try {
          elem.remove();
        } catch {
          // Ignore, may have been removed earlier
        }
      });
    };
    if (document.head) { document.head.appendChild(newElement); }
  }

  if (fancyHref) {
    const existingElements = document.querySelectorAll('[data-fancycss="true"]');
    const newElement = createThemeElement(`${fancyHref}?v=${version}`);
    newElement.setAttribute('data-fancycss', 'true');
    newElement.onload = () => {
      existingElements.forEach((elem) => {
        try {
          elem.remove();
        } catch {
          // Ignore, may have been removed earlier
        }
      });
    };
    if (document.head) { document.head.appendChild(newElement); }
  }
}


// Updates the Theme css links to force them to update with new version, or with the newly selected them
function updateThemeDom(version: string, theme?: ITheme): void {
  const url = theme ? `${getFileServerURL()}/Themes/${theme.id}/${theme.entryPath}?v=${version}` : undefined;
  replaceThemeElement(url);
}

function replaceThemeElement(url?: string) {
  // Get list of old theme elems to remove after loading new theme elem
  const existingElements = document.head.querySelectorAll('[data-theme="true"]');
  if (url) {
    const newElement = createThemeElement(url);
    newElement.setAttribute('data-theme', 'true');
    newElement.onload = () => {
      existingElements.forEach((elem) => {
        try {
          elem.remove();
        } catch {
          // Ignore, may have been removed earlier
        }
      });
    };
    newElement.onerror = (err) => {
      log.warn('Launcher', `Failed to load theme from ${url}: ${err.toString()}`);
      existingElements.forEach((elem) => {
        try {
          elem.remove();
        } catch {
          // Ignore, may have been removed earlier
        }
      });
    };
    if (document.head) { document.head.appendChild(newElement); }
  } else {
    existingElements.forEach((elem) => {
      elem.remove();
    });
  }
}

/** Create an element that themes can be "applied" to. */
function createThemeElement(url: string): HTMLElement {
  const element = document.createElement('link');
  element.setAttribute('type', 'text/css');
  element.setAttribute('rel', 'stylesheet');
  element.setAttribute('href', url);
  return element;
}
