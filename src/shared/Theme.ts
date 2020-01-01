import { getFileServerURL } from './Util';

/**
 * Element attribute used exclusively on the "global" theme element.
 * This is to make it searchable in the DOM tree.
 * (Custom HTML element attributes should start with "data-")
 */
const globalThemeAttribute = 'data-theme';

/** Set the theme data of the "global" theme style element. */
export function setTheme(entryPath: string | undefined): void {
  let element = findThemeGlobal();
  if (!element) {
    element = createThemeElement();
    element.setAttribute(globalThemeAttribute, 'true');
    if (document.head) { document.head.appendChild(element); }
  }
  if (entryPath) { element.setAttribute('href', `${getFileServerURL()}/Themes/${entryPath}`); }
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
