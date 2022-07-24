/**
 * Check if two arrays are shallowly strictly equal.
 * @param a Array to compare.
 * @param b Array to compare.
 */
export function arrayShallowStrictEquals(a: unknown[], b: unknown[]): boolean {
  if (a === b) { return true; }

  if (a.length !== b.length) { return false; }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) { return false; }
  }

  return true;
}
