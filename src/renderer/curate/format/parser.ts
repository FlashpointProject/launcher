import { CFTokenizer, tokenToString } from './tokenizer';

/** An object representation of text that follow the Curation Format. */
export type CurationFormatObject = {
  [key: string]: string | string[] | CurationFormatObject;
};

/**
 * Parse Curation Format tokens into a Curation Format object.
 * @param tokens Tokens to parse into an object.
 */
export function parseCurationFormat(tokens: CFTokenizer.AnyToken[]): CurationFormatObject {
  return parseObject(tokens, {
    startIndex: 0,
    lastIndex: -1,
    indentOverflow: 0,
  });
}

/**
 * Parse a single object from a set of tokens.
 * The "state" parameter object contains some properties that are used as additional
 * arguments for the parser, while some properties are used as additional return values.
 * @param tokens Tokens to parse from (not all tokens must be parsed).
 * @param state State of the parser (this is mutated during the parsing).
 * @returns The parsed object.
 */
function parseObject(tokens: CFTokenizer.AnyToken[], state: ParseState): CurationFormatObject {
  const parsed: CurationFormatObject = {};
  // Error function
  const createError = (text: string, token?: CFTokenizer.AnyToken): Error => {
    return new Error(
      'Failed to parse object.\n'+
      text+'\n'+
      'State:\n'+
      `  Token Index: ${index}\n`+
      `  Iterations: ${iterations} / ${maxIterations}\n`+
      (token ? (
        'Token:\n'+
        tokenToString(token)
      ) : '')
    );
  };
  // Iteration state (used to abort in case it enters an infinite loop)
  let iterations = 0;
  const maxIterations = 1 + (tokens.length - state.startIndex);
  // Parse the tokens, one by one
  let index = state.startIndex;
  mainLoop: // (Label used to make it possible to exit the loop while in a nested loop)
  while (index < tokens.length) {
    // Abort if it exceeds the maximum number of allowed iterations
    iterations += 1;
    if (iterations > maxIterations) {
      throw createError(
        'Maximum number of iterations was exceeded. \n'+
        'This indicates that there is a bug in the parser.'
      );
    }
    // Parse token
    const token = tokens[index];
    switch (token.type) {
      // (Tokens to ignore)
      case CFTokenizer.TokenType.COMMENT:
        index += 1;
        break;
      // (Unexpected tokens)
      case CFTokenizer.TokenType.VALUE:
      case CFTokenizer.TokenType.LIST_ITEM:
        throw createError('Unexpected token.', token);
      // End object
      case CFTokenizer.TokenType.INDENT_CHANGE:
        if (token.delta < 0) {
          index += 1;
          // Set the indent overflow
          state.indentOverflow = Math.abs(token.delta) - 1;
          // End the current object
          break mainLoop; // (Exit the main loop)
        } else {
          throw createError(
            'Indent Token was expected to be negative, but it was not.',
            token
          );
        }
        // break;
      // Identifier token, create a property and assign the next value to it
      case CFTokenizer.TokenType.IDENTIFIER: {
        // Get the next non-comment token
        const nextTokenIndex = indexOfNonComment(tokens, index + 1);
        const nextToken = tokens[nextTokenIndex];
        // Check if there is no next token
        if (!nextToken) {
          // Assign an empty value
          // (Empty values are not tokenized, so assume that it was just removed)
          parsed[token.name] = '';
          index += 1;
        } else {
          // Assign the contents of the token as the value
          switch (nextToken.type) {
            // Assign a string value
            case CFTokenizer.TokenType.VALUE:
              parsed[token.name] = nextToken.value;
              index += 2;
              break;
            // Assign a list
            case CFTokenizer.TokenType.LIST_ITEM: {
              const list: string[] = [];
              for (var i = nextTokenIndex; i < tokens.length; i++) {
                const itemToken = tokens[i];
                if (itemToken.type === CFTokenizer.TokenType.LIST_ITEM) {
                  list.push(itemToken.value);
                } else { break; }
              }
              parsed[token.name] = list;
              // Set the index to the token after the last list item
              index = i;
            } break;
            // Assign an object (or end this object)
            case CFTokenizer.TokenType.INDENT_CHANGE:
              // Check if this is the start of a new object
              if (nextToken.delta === 1) {
                // Parse and assign the child object
                const childState: ParseState = {
                  startIndex: nextTokenIndex + 1,
                  lastIndex: -1,
                  indentOverflow: 0,
                };
                parsed[token.name] = parseObject(tokens, childState);
                // Update the index to skip the tokens parsed by the child object
                index = childState.lastIndex;
                // Check if there was any indentation overflow (if multiple objects ended at once)
                if (childState.indentOverflow > 0) {
                  // Set the indent overflow
                  state.indentOverflow = childState.indentOverflow - 1;
                  // End the current object
                  break mainLoop; // (Exit the main loop)
                }
              }
              // Check if this is the end of the current object
              else if (nextToken.delta < 0) {
                index = nextTokenIndex;
                // Assign an empty string
                parsed[token.name] = '';
                // Set the indent overflow
                state.indentOverflow = Math.abs(nextToken.delta) - 1;
                // End the current object
                break mainLoop; // (Exit the main loop)
              } else {
                throw createError(
                  'Failed to assign value to identifier. '+
                  (nextToken.delta > 0) ? 'Index Token has a delta higher than 1.' :
                                          'Indent Token has a delta of 0.',
                  nextToken
                );
              }
              break;
            // Assign an empty value
            // (Empty values are not tokenized, so assume that it was just removed)
            default:
              parsed[token.name] = '';
              index += 1;
              break;
          }
        }
      } break;
    }
  }
  // Update state
  state.lastIndex = index;
  // Done
  return parsed;
}

/** State of the parser. */
type ParseState = {
  /**
   * Index of the token to begin parsing at.
   * This is an "additional argument" for the parser function.
   */
  startIndex: number;
  /**
   * Index of the token that was parsed last.
   * This is an "additional return value" for the parser function.
   */
  lastIndex: number;
  /**
   * Number of negative indentation levels that overflowed (after ending the parsed object).
   * (If the object ended with an indentation change of -3, this will be set to 2).
   * This is an "additional return value" for the parser function.
   */
  indentOverflow: number;
};

/**
 * Get the index of the first non-comment token (from first to last).
 * @param tokens Tokens to search through.
 * @param startIndex First index to check.
 * @returns The index of the first non-comment token, or -1 if none was found.
 */
function indexOfNonComment(tokens: CFTokenizer.AnyToken[], startIndex: number = 0): number {
  for (let i = startIndex; i < tokens.length; i++) {
    if (tokens[i].type !== CFTokenizer.TokenType.COMMENT) { return i; }
  }
  return -1;
}
