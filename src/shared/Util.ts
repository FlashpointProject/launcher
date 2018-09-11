/**
 * Recursively copy values from data to target (for every property of the same name)
 * @param target Target object to copy data to
 * @param source Source object to copy data from
 * @returns Target object
 */
export function recursiveReplace(target: any, source: any): any {
  // Skip if either is missing
  if (!target || !source) { return; }
  // Go through all properties of target
  for (let key in source) {
    // Check if data has a property of the same name
    if (key in target) {
      const val = source[key];
      // If the value is an object
      if (val !== null && typeof val === 'object') {
        // Go one object deeper and continue copying
        recursiveReplace(target[key], val);
      } else {
        // Copy the value
        target[key] = val;
      }
    }
  }
  return target;
}

/**
 * Recursively copy and object and its "sub-objects"
 * (WARNING: This will overflow the stack if it tries to copy circular references)
 * @param source Object to copy from
 * @returns New copy of source
 */
export function deepCopy<T = any>(source: T): T {
  const copy: any = {};
  for (let key in source) {
    let val = source[key];
    if (val !== null && typeof val === 'object') {
      val = deepCopy(val);
    }
    copy[key] = val;
  }
  return copy;
}

/** Try parsing a JSON string into an object and return that object, or an error if one occurred */
export function tryParseJSON(jsonString: string): any|Error {
  let ret: any|Error;
  try {
    ret = JSON.parse(jsonString);
  } catch(error) {
    ret = error;
  }
  return ret;
}
