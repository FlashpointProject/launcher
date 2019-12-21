export type Theme = {
  /** Path of the theme's entry file (the css file that should be applied). */
  entryPath: string;
  /** Meta data of the theme. */
  meta: ThemeMeta;
}

/** Meta data of a theme file (the data defined in the first comment of the theme file). */
export type ThemeMeta = Partial<{
  name: string;
  version: string;
  description: string;
  author: string;
  launcherVersion: string;
}>;

/** Filename of the entry file inside a theme folder. */
export const themeEntryFilename = 'theme.css';

/**
 * Try to parse the meta data of a theme file.
 * @param content Content of a theme file.
 */
export function parseThemeMetaData(content: string): ThemeMeta | undefined {
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
function getMetaDataFromThemeBlock(content: string): ThemeMeta {
  const rawMetaData = getRawMetaDataFromThemeBlock(content);
  // Convert raw meta data to a programmer friendly format
  const metaData: ThemeMeta = {};
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
