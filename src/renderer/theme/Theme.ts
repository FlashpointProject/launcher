import * as fs from 'fs';
import * as path from 'path';

export type ITheme = {
  /** Location (path) of the theme file. */
  location: string;
  /** Meta data of the theme file. */
  metaData: IThemeMetaData;
}

/** Meta data of a theme file (the data defined in the first comment of the theme file). */
export type IThemeMetaData = Partial<{
  name: string;
  version: string;
  description: string;
  author: string;
  launcherVersion: string;
}>;

export namespace Theme {
  /**
   * Element attribute used exclusively on the "global" theme element.
   * This is to make it searchable in the DOM tree.
   * (Custom HTML element attributes should start with "data-")
   */
  const globalThemeAttribute = 'data-theme';

  /**
   * Set the theme data of the "global" theme style element.
   * @param theme Theme data to set.
   */
  export function set(theme: ITheme): void {
    let element = findGlobal();
    if (!element) {
      element = createThemeElement();
      element.setAttribute(globalThemeAttribute, 'true');
      if (document.head) { document.head.appendChild(element); }
    }
    apply(theme, element);
  }

  /**
   * Apply a theme to a style element.
   * @param theme Theme data to apply to element.
   * @param element Element to apply theme data to.
   * @returns The element from the 2nd argument (or a new element if none was given).
   */
  export function apply(theme: ITheme, element?: HTMLElement): HTMLElement {
    if (!element) { element = createThemeElement(); }
    // Set location of theme file
    element.setAttribute('href', theme.location);
    // Return style element
    return element;
  }
  
  /**
   * Clear theme data from a style element.
   * @param element Element to clear theme data from. If undefined, this function will do nothing.
   */
  export function clear(element: HTMLElement | undefined): void {
    if (element) {
      if (element.hasAttribute('href')) {
        element.removeAttribute('href');
      }
    }
  }

  /** Create a new theme object. */
  export function create(): ITheme {
    return {
      location: '',
      metaData: {}
    };
  }

  /** Find the "global" theme style element. */
  export function findGlobal(): HTMLElement | undefined {
    // Go through all children of <head>
    if (document.head) {
      const children = document.head.children;
      for (let i = children.length; i >= 0; i--) {
        const child = children.item(i) as HTMLElement;
        if (child) {
          // Check if the child has the unqiue "global theme element" attribute
          const attribute = child.getAttribute(globalThemeAttribute);
          if (attribute) { return child; }
        }
      }
    }
  }

  /**
   * Get the entry path of a theme from its file or folder name.
   * @param filepath Filepath of the theme.
   * @returns Entry path of the theme, or undefined if no entry file was found.
   */
  export async function getEntryPath(filepath: string): Promise<string | undefined> {
    console.log(await getFileType(filepath));
    switch (await getFileType(filepath)) {
      case FileType.FILE: return filepath;
      case FileType.FOLDER:
        const entryPath = path.join(filepath, '/theme.css');
        const entryType = await getFileType(entryPath);
        return (entryType === FileType.FILE) ? entryPath : undefined;
      case FileType.NONE: return undefined;
    }
  }

  /**
   * Load and parse a theme file.
   * @param filepath Path of the theme file.
   * @returns If the parsing was (at least partially) successful, the parsed object is returned.
   *          Otherwise an error code is returned.
   */
  export function load(filepath: string): Promise<ITheme|LoadError> {
    return new Promise<ITheme|LoadError>(function(resolve, reject) {
      fs.readFile(filepath, 'utf8', function(error, data) {
        // Relay "expected" errors
        if (error) {
          if (error.code === 'ENOENT') { return resolve(LoadError.FileNotFound); }
          if (error.code === 'EISDIR') { return resolve(LoadError.FileIsFolder); }
          return reject(error);
        }
        // Create theme object
        const theme = create();
        const metaData = parseThemeMetaData(data);
        theme.location = filepath;
        if (metaData) { theme.metaData = metaData; }
        // Resolve
        resolve(theme);
      });
    });
  }

  /**
   * Get the error string of a load error code.
   * @param loadError Load error code to get error string of.
   * @returns Error string of load error code.
   */
  export function toError(loadError: LoadError): string | undefined {
    switch (loadError) {
      case LoadError.FileNotFound: return 'Failed to load theme (file not found).';
      case LoadError.FileIsFolder: return 'Failed to load theme (target is a folder).';
    }
  }
  
  /** Error code for when loading and parsing a theme json file. */
  export enum LoadError {
    /** If the file was not found. */
    FileNotFound,
    /** If the file is actually a folder. */
    FileIsFolder,
  }
}

/** Create an element that themes can be "applied" to. */
function createThemeElement(): HTMLElement {
  const element = document.createElement('link');
  element.setAttribute('type', 'text/css');
  element.setAttribute('rel', 'stylesheet');
  return element;
}

/**
 * Try to parse the meta data of a theme file.
 * @param content Content of a theme file.
 */
function parseThemeMetaData(content: string): IThemeMetaData | undefined {
  let comment = getContentOfFirstComment(content);
  if (comment !== undefined) {
    let block = getContentOfThemeBlock(comment);
    if (block !== undefined) {
      return getMetaDataFromThemeBlock(block);
    }
  }
  return undefined;
}

/**
 * Get the content of the first comment in a string of css and return it.
 * @param content CSS Content.
 * @returns Content of the first comment (or undefined if no comment was found).
 */
function getContentOfFirstComment(content: string): string | undefined {
  let isInComment = false;
  let commentStart = -1; // Index of the first character inside the comment
  let prevChar = '';
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (isInComment) {
      if (prevChar === '*' && char === '/' && commentStart !== i) { // (Stops "/*/" from counting as a comment)
        return content.substring(commentStart, i - 2);
      }
    } else {
      if (prevChar === '/' && char === '*') {
        isInComment = true;
        commentStart = i + 1;
      }
    }
    prevChar = char;
  }
  // No comment was found.
  return undefined;
}

/**
 * Get the content in a theme block from a string of text.
 * (Everything between "==Theme==" and "==/Theme==")
 * @param content Content to search through.
 * @returns Content of the theme block (or undefined if no block was found).
 */
function getContentOfThemeBlock(content: string): string | undefined {
  const match = content.match(/==Theme==([\s\S]*)==\/Theme==/);
  return match ? match[1] : undefined;
}

/**
 * Get the meta data from a string of theme block content.
 * @param content Theme block content.
 * @returns Theme meta data object with the values parsed from the content.
 */
function getMetaDataFromThemeBlock(content: string): IThemeMetaData {
  const rawMetaData = getRawMetaDataFromThemeBlock(content);
  // Convert raw meta data to a programmer friendly format
  const metaData: IThemeMetaData = {};
  for (let key in rawMetaData) {
    const val = rawMetaData[key];
    switch (key) {
      case 'name':             metaData.name            = val; break;
      case 'version':          metaData.version         = val; break;
      case 'description':      metaData.description     = val; break;
      case 'author':           metaData.author          = val; break;
      case 'launcher-version': metaData.launcherVersion = val; break;
    }
  }
  return metaData;
}

/**
 * Get the "raw" tag-value pairs from a theme's meta data block.
 * @param content Content of a theme's meta data block.
 * @returns Map of tag-value pairs (missing values are replaced with empty strings).
 */
function getRawMetaDataFromThemeBlock(content: string): { [key: string]: string } {
  // Examples: "  @tag  some value " => [ "tag", "some value" ]
  //           "  @another-tag "     => [ "another-tag" ]
  const tagRegex = /^[^\S\r\n]*@(\S*)[^\S\r\n]*(.*)[^\s]*/gim;
  const data: { [key: string]: string } = {};
  while (true) {
    const result = tagRegex.exec(content);
    if (!result) { break; } // No more tags left
    data[result[1]] = result[2] || '';
  }
  return data;
}

/**
 * Check if a path points at a file, folder or nothing.
 * @param filepath Path of the target.
 */
function getFileType(filepath: string): Promise<FileType> {
  return new Promise((resolve, reject) => {
    fs.stat(filepath, (error, stats) => {
      if (error) {
        if (error.code === 'NOENT') { resolve(undefined); }
        else                        { reject(); }
      } else {
        if      (stats.isFile())      { resolve(FileType.FILE); }
        else if (stats.isDirectory()) { resolve(FileType.FOLDER); }
        else                          { resolve(FileType.NONE); }
      }
    });
  });
}

enum FileType {
  FILE,
  FOLDER,
  NONE
}

function noop() {};
