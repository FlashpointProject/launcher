import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { getFileServerURL } from '@shared/Util';
import { ITheme } from 'flashpoint-launcher';
import { PropsWithChildren, useState } from 'react';

const globalThemeAttribute = 'data-theme';

type ThemeProviderProps = PropsWithChildren;

export function ThemeProvider({ children }: ThemeProviderProps) {
  const currentThemeVersion = useAppSelector(state => state.main.themeVersion);
  const availableThemes = useAppSelector(state => state.main.themeList);
  const selectedTheme = useAppSelector(state => state.preferences.currentTheme);
  const [currentTheme, setCurrentTheme] = useState(selectedTheme);
  const [themeVersion, setThemeVersion] = useState(currentThemeVersion);
  const [firstRender, setFirstRender] = useState(true);

  // Must update DOM on very first render if we have a theme
  if (firstRender) {
    setFirstRender(false);
    const theme = availableThemes.find(t => t.id === currentTheme);
    if (theme) {
      updateDom(theme, themeVersion);
    }
  }

  // Update DOM if the theme changes
  if (selectedTheme !== currentTheme) {
    const newTheme = availableThemes.find(t => t.id === selectedTheme);
    setCurrentTheme(selectedTheme);
    updateDom(newTheme, themeVersion);
  }

  // Update DOM if the theme is invalidated (version changes)
  if (themeVersion !== currentThemeVersion) {
    setThemeVersion(currentThemeVersion);
    const theme = availableThemes.find(t => t.id === currentTheme);
    updateDom(theme, currentThemeVersion);
  }

  return children;
}

/**
 * Set the theme data of the "global" theme style element.
 *
 * @param theme Theme to apply on top of the default
 */
function updateDom(theme: ITheme | undefined, version: number): void {
  let element = findThemeGlobal();
  if (!element) {
    element = createThemeElement();
    element.setAttribute(globalThemeAttribute, 'true');
    if (document.head) { document.head.appendChild(element); }
  }
  if (theme) {
    const url = `${getFileServerURL()}/Themes/${theme.id}/${theme.entryPath}?v=${version}`;
    if (element.getAttribute('href') !== url) {
      element.setAttribute('href', url);
    }
  }
  else { element.removeAttribute('href'); }
}


/** Find the "global" theme style element. */
function findThemeGlobal(): HTMLElement | undefined {
  // Go through all children of <head>
  if (document.head) {
    const children = document.head.children;
    for (let i = children.length; i >= 0; i--) {
      const child = children.item(i) as HTMLElement;
      if (child) {
        // Check if the child has the unique "global theme element" attribute
        const attribute = child.getAttribute(globalThemeAttribute);
        if (attribute) { return child; }
      }
    }
  }
}

/** Create an element that themes can be "applied" to. */
function createThemeElement(): HTMLElement {
  const element = document.createElement('link');
  element.setAttribute('type', 'text/css');
  element.setAttribute('rel', 'stylesheet');
  return element;
}
