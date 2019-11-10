export namespace Coerce {
  /**
   * Coerce a value to a string.
   * If the value is undefined, an empty string is returned instead.
   * @param value Value to coerce.
   */
  export function str(value: any): string {
    return (value === undefined)
      ? ''
      : value + '';
  }

  /**
   * Coere a value to a number.
   * If the coerced value is NaN, 0 will be returned instead.
   * @param value Value to coerce.
   */
  export function num(value: any): number {
    return (value * 1) || 0;
  }
}
