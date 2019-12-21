/**
 * Create a string representation of a value in the curation format.
 * This is the Curation Format's answer to "JSON.stringify()".
 * @param value Value to stringify.
 */
export function stringifyCurationFormat(value: any): string {
  return stringifyObject(value, 0);
}

/**
 * Create a string representation of an object in the curation format.
 * @param obj Object to stringify.
 * @param indent Indentation level of object (in case it is nested).
 */
function stringifyObject(obj: any, indent: number): string {
  const indentStr = createIndent(indent);
  let str = '';
  for (let key in obj) {
    const val = obj[key];
    // Don't include values with certain values
    if (val === undefined || val === null) { continue; }
    // Push first part of the declaration
    str += `${indentStr}${key}:`;
    // Push the value of the declaration
    switch (typeof val) {
      default:
        str += ' \n';
        break;
      case 'boolean':
        str += ` ${val ? 'true' : 'false'}\n`;
        break;
      case 'number':
        str += ` ${val}\n`;
        break;
      case 'object':
        // @TODO Watch out for empty objects, they might create too many empty lines?
        if (Array.isArray(val) && isCondenseArray(val)) { // (List)
          const arrayIndentStr = indentStr + createIndent(1);
          for (let i = 0; i < val.length; i++) {
            str += `${arrayIndentStr}- ${val[i]}\n`;
          }
        } else { // (Object)
          str += `\n${stringifyObject(val, indent + 1)}`;
        }
        break;
      case 'string':
        let index = val.indexOf('\n');
        if (index >= 0) { // (Multi-line)
          // Split the string into a multi-line string declaration
          const multiIndentStr = indentStr + createIndent(1);
          let splitVal = ' |\n';
          let startIndex = 0;
          while (index >= 0) {
            splitVal += `${multiIndentStr}${val.substring(startIndex, index)}\n`;
            // Get next index and update prev index
            startIndex = index + 1;
            index = val.indexOf('\n', startIndex);
          }
          str += splitVal;
        } else { // (Single-line)
          str += ` ${val}\n`;
        }
        break;
    }
  }
  return str;
}

/**
 * Check if an array starts at index 0 and has no "gaps" (no undefined or null values).
 * @param array Array to check.
 */
function isCondenseArray(array: any[]): boolean {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === undefined || array[i] === null) {
      return false;
    }
  }
  return true;
}

/**
 * Create a string of indentation characters.
 * @param indent Level of indentation of the returned string.
 */
function createIndent(indent: number): string {
  return ' '.repeat(indent * 4);
}
