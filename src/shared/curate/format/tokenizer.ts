import { deepCopy } from '../../Util';

export namespace CFTokenizer {
  /** Type identifiers for all tokens. */
  export enum TokenType {
    COMMENT,
    IDENTIFIER,
    INDENT_CHANGE,
    LIST_ITEM,
    VALUE,
  }

  // ------ Token Sub-Types ------

  /** Base type of all tokens. */
  type TokenBase<T extends TokenType> = {
    /** Token type identifier. */
    type: T;
  };

  // ------ Token Types ------

  /** A comment (they always take up and entire line of text). */
  export type CommentToken = TokenBase<TokenType.COMMENT> & {
    /** Text of the comment. */
    content: string;
  };

  /** An identifier (the "name" part of a field/property assignment). */
  export type IdentifierToken = TokenBase<TokenType.IDENTIFIER> & {
    /** Name of the identifier. */
    name: string;
  };

  /** A change in the indentation level. */
  export type IndentChangeToken = TokenBase<TokenType.INDENT_CHANGE> & {
    /** Change in the indentation level (positive is increase, negative is decrease, should never be 0). */
    delta: number;
  };

  /** A list item. */
  export type ListItemToken = TokenBase<TokenType.LIST_ITEM> & {
    /** Value of the list item. */
    value: string;
  };

  /** A value (a string value, single- or multi-line). */
  export type ValueToken = TokenBase<TokenType.VALUE> & {
    /** The value. */
    value: string;
  };

  /** A combination of all token types. */
  export type AnyToken = (
    CommentToken |
    IdentifierToken |
    IndentChangeToken |
    ListItemToken |
    ValueToken
  );
}

/** State of the tokenizer (that is carried over between lines of text). */
type TokenizerState = {
  /** If it is currently inside the value of a multi-line declaration. */
  inMultiLine: boolean;
  /** Chunks of strings of the current multi-line declaration (if any). */
  multiLineChunks: string[];
  /** The indent each row of text in the current multi-line declaration should have. */
  multiLineIndent: number;
  /** Current level of indentation. Used to measure when it changes. */
  indent: number;
};

/**
 * Parse a string following the Curation Format into tokens.
 * These tokens can later be parsed into an object representation of the original text.
 * @param text Text to parse into tokens.
 */
export function tokenizeCurationFormat(text: string): CFTokenizer.AnyToken[] {
  const tokens: CFTokenizer.AnyToken[] = [];
  const lines = text.replace(/\r/g, '').split('\n');
  // State
  const state: TokenizerState = {
    inMultiLine: false,
    multiLineChunks: [],
    multiLineIndent: 0,
    indent: 0,
  };
  // Tokenize the text, line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let skipIndentUpdate = false; // (If "state.indent" should not be updated at the end of this line)
    // Check if the line is a comment
    if (line[0] === '#') {
      // Add comment token
      tokens.push({
        type: CFTokenizer.TokenType.COMMENT,
        content: line.substring(1),
      });
    } else {
      // Count spaces and indents
      const spaces = countSpacesLeft(line);
      const indent = calculateIndent(line);
      // Check if the multi-line value has ended, or if the indentation has changed
      if (state.inMultiLine) {
        // Check if the multi-line value has ended (by a lowering in indentation)
        if (indent < state.multiLineIndent) {
          // Consume state and add a value value token
          applyMultiLine(state, tokens);
        }
      } else {
        // Check if the indentation level changed
        if (indent !== state.indent) {
          // Check if the previous token is an indent token
          const prevTokenIndex = tokens.length - 1;
          const prevToken = tokens[prevTokenIndex];
          if (prevToken && prevToken.type === CFTokenizer.TokenType.INDENT_CHANGE) {
            // Add current delta to the previous token
            prevToken.delta += indent - state.indent;
            // Remove token if delta is 0
            if (prevToken.delta === 0) {
              tokens.splice(prevTokenIndex, 1);
            }
          } else {
            // Add indent token
            tokens.push({
              type: CFTokenizer.TokenType.INDENT_CHANGE,
              delta: indent - state.indent
            });
          }
        }
      }
      // Tokenize the remaining contents of the line
      if (state.inMultiLine) {
        // Copy data to state chunks
        state.multiLineChunks.push(line.substring(countIndentChars(line, state.multiLineIndent)).trimRight());
        // Set flag (because the indentation in the multi-line value shouldn't be confused with object indentation)
        skipIndentUpdate = true;
      } else {
        // Check if it is a list item
        if (line[spaces] === '-' && line[spaces + 1] === ' ') {
          // Add list item token
          tokens.push({
            type: CFTokenizer.TokenType.LIST_ITEM,
            value: line.substr(spaces + 1).trim(),
          });
        } else {
          // Check if it is an identifier/value pair
          const sepIndex = line.indexOf(':');
          if (sepIndex >= 0) {
            // Extract the name and value
            const fieldName  = line.substring(spaces, sepIndex);
            const fieldValue = line.substring(sepIndex + 1).trim();
            // Add identifier token
            tokens.push({
              type: CFTokenizer.TokenType.IDENTIFIER,
              name: fieldName,
            });
            // Check if there is any value
            if (fieldValue.length > 0) {
              // Check if this is the start of a multi-line declaration
              if (fieldValue === '|') {
                // Prepare state for tokenizing the multi-line value
                state.inMultiLine = true;
                state.multiLineIndent = indent + 1;
              } else {
                // Add value token
                tokens.push({
                  type: CFTokenizer.TokenType.VALUE,
                  value: fieldValue,
                });
              }
            }
          }
        }
      }
      // Update indentation state
      if (!skipIndentUpdate) {
        state.indent = indent;
      }
    }
  }
  // Apply remaining multi-line state (if any)
  applyMultiLine(state, tokens);
  // Done
  return tokens;
}

/**
 * Create a string representation of a token.
 * This is meant to be used for error messages and debugging.
 * @param token Token to create string of.
 */
export function tokenToString(token: CFTokenizer.AnyToken): string {
  const displayToken: any = deepCopy(token);
  displayToken.type = CFTokenizer.TokenType[token.type] || 'UNKNOWN';
  return JSON.stringify(displayToken, undefined, 2);
}

/**
 * Consume the current multi-line state, then create and add a token from it.
 * If there is no multi-line state to consume, do nothing.
 * @param state State of the tokenizer.
 * @param tokens Array to add the token to.
 */
function applyMultiLine(state: TokenizerState, tokens: CFTokenizer.AnyToken[]): void {
  // Check if the tokenizer is currently in a multi-line declaration
  if (state.inMultiLine) {
    // Insert value token
    tokens.push({
      type: CFTokenizer.TokenType.VALUE,
      value: state.multiLineChunks.join('\n'),
    });
    // Reset state
    state.inMultiLine = false;
    state.multiLineChunks.length = 0; // (This removes all items in the array)
    state.multiLineIndent = 0;
  }
}

/**
 * Count the number of space characters on the left side of a string.
 * @param str String to check.
 */
function countSpacesLeft(str: string): number {
  let count = 0;
  // (This is a "label", it here to make it possible to break out of the loop from
  // inside the nested switch statement)
  characterLoop:
  for (let i = 0; i < str.length; i++) {
    switch (str[i]) {
      // A space character
      case ' ':
      case '\t':
        count += 1;
        break;
      // Not a space character
      default: break characterLoop;
    }
  }
  return count;
}

/**
 * Calculate the indentation level of a line of text.
 * @param line Line of text (using the Curation Format).
 */
function calculateIndent(line: string): number {
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    const val = indentPowerOfChar(line[i]);
    if (val !== undefined) { count += val; }
    else { break; }
  }
  return (count / 4) | 0; // (Convert to indentation and round down)
}

/**
 * Count the maximum number of space characters at the start of a string needed to reach some indentation level.
 * @param line Line of text.
 * @param target Target indentation level.
 */
function countIndentChars(line: string, target: number): number {
  const targetPower = target * 4;
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    const val = indentPowerOfChar(line[i]);
    if (val !== undefined) {
      count += val;
      if (count > targetPower) { return i; }
    } else { return i; }
  }
  return 0;
}

/**
 * Get the indentation power of a character (or undefined if it's not an indent character).
 * @param char Character to get indentation power of.
 * @returns The indentation power of the character (4 indentation power is equal to 1 indentation), or undefined.
 */
function indentPowerOfChar(char: string): number | undefined {
  switch (char) {
    case ' ':  return 1; // Single space
    case '\t': return 4; // Tab
  }
}
