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
   * Coerce a value to a string.
   * If the value is undefined, an empty string is returned instead.
   * @param value Value to coerce.
   */
  export function strArray(value: any[]): string[] {
    return value.map(val => str(val));
  }

  /**
   * Coere a value to a number.
   * If the coerced value is NaN, 0 will be returned instead.
   * @param value Value to coerce.
   */
  export function num(value: any): number {
    return (value * 1) || 0;
  }

  /**
   * Convert a string to a boolean (case insensitive).
   * @param str String to convert ("true" and "yes" is true, "false" and "no" is false).
   * @param defaultVal Value returned if the string is neither true nor false.
   */
  export function strToBool(str: string, defaultVal: boolean = false): boolean {
    const lowerStr = str.toLowerCase();
    if (lowerStr === 'yes' || lowerStr === 'true') { return true;  }
    if (lowerStr === 'no' || lowerStr === 'false') { return false; }
    return defaultVal;
  }
}
