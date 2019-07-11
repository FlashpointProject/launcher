import { deepCopy } from '../../../shared/Util';

export namespace CFTokenizer {
  /** Type identifiers for all tokens. */
  export enum TokenType {
    COMMENT,
    IDENTIFIER,
    INDENT_CHANGE,
    LIST_ITEM,
    VALUE,
  };

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
  /** The index the multi-line token should be inserted at. */
  multiLineIndex: number;
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
    multiLineIndex: 0,
    indent: 0,
  };
  // Tokenize the text, line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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
      // Check if the multi-line value has ended (by a change in indentation)
      if (state.inMultiLine && indent !== state.multiLineIndent) {
        // Consume state and add a value value token
        if (state.inMultiLine) {
          applyMultiLine(state, tokens);
        }
      }
      // Tokenize the remaining contents of the line
      if (state.inMultiLine) {
        // Copy data to state chunks
        state.multiLineChunks.push(line.substring(spaces));
      } else {
        // Check if it is a list item
        if (line[spaces] === '-' && line[spaces + 1] === ' ') {
          // Add list item token
          tokens.push({
            type: CFTokenizer.TokenType.LIST_ITEM,
            value: line.substr(spaces + 1).trimLeft(),
          });
        } else {
          // Check if it is an identifier/value pair
          const sepIndex = line.indexOf(':');
          if (sepIndex >= 0) {
            // Extract the name and value
            const fieldName  = line.substring(spaces, sepIndex);
            const fieldValue = line.substring(sepIndex + 1).trimLeft();
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
                state.multiLineIndex = tokens.length;
              }
              else {
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
      // Update state
      state.indent = indent;
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
  return JSON.stringify(displayToken, undefined, 2)
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
    tokens.splice(state.multiLineIndex, 0, {
      type: CFTokenizer.TokenType.VALUE,
      value: state.multiLineChunks.join('\n'),
    });
    // Reset state
    state.inMultiLine = false;
    state.multiLineChunks.length = 0; // (This removes all items in the array)
    state.multiLineIndent = 0;
    state.multiLineIndex = 0;
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
  // (This is a "label", it here to make it possible to break out of the loop from
  // inside the nested switch statement)
  characterLoop:
  for (let i = 0; i < line.length; i++) {
    switch (line[i]) {
      // Single space
      case ' ':
        count += 1;
        break;
      // Tab
      case '\t':
        count += 4;
        break;
      // Not a space character
      default: break characterLoop;
    }
  }
  // Convert and return the count
  return (count / 4) | 0;
}
