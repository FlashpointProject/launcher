/** The character that appears before a variable name. */
const openChar  = '<';
/** The character that appears after a variable name. */
const closeChar = '>';

/** Function that provides variable values when parsing a "variable string". */
export type GetVariableStringValue = (name: string) => string;

/**
 * Parse a "variable string" by replacing the variable references with the appropriate values.
 * @param str Variable string to parse.
 * @param getValue Function the provide variable values.
 */
export function parseVariableString(str: string, getValue: GetVariableStringValue): string {
  return splitVariableString(str).reduce((acc, val, index) => acc + (
    (index % 2 === 1)
      ? getValue(val)
      : val
  ));
}

/**
 * Split a "variable string" into an array.
 * @param str Variable string to split.
 * @returns Array of string segments from the variable string.
 *          All elements with even indices are variable names, and those with odd indices are plain text.
 */
function splitVariableString(str: string): string[] {
  const splits: string[] = [];
  let prevCutIndex = 0; // (Index of the character after the previous split end)
  // Look for all "open" characters in the string
  for (let i = 0; i < str.length; i++) {
    if (str[i] === openChar) {
      // Look for the next "close" character
      const closeIndex = str.indexOf(closeChar, i + 1);
      if (closeIndex >= 0) {
        // Push preceding plain text
        splits.push(str.substring(prevCutIndex, i));
        // Push variable name
        splits.push(str.substring(i + 1, closeIndex));
        // Update index
        prevCutIndex = closeIndex + 1;
      }
    }
  }
  // Add the remaining characters
  if (prevCutIndex < str.length) {
    splits.push(str.substring(prevCutIndex));
  }
  // Done
  return splits;
}
