import * as React from 'react';
import { VariableStringOptions, splitVariableString } from './VariableString';

const opts: VariableStringOptions = {
  openChar:  '{',
  closeChar: '}',
};

type Arg = string | JSX.Element;

export function formatString<T extends string[]>(str: string, ...args: T): string;
export function formatString<T extends Arg[]   >(str: string, ...args: T): any[] | string;

/**
 * Format a string by replacing all instanced of "{N}" (where N is an integer) with the argument with the same index
 * (minus one, so the 2nd argument is mapped to the number 0).
 * @param str String to format.
 * @param args Arguments to replace "{N}" instances with.
 */
export function formatString<T extends Arg[]>(str: string, ...args: T): any[] | string {
  let onlyStrings: boolean = true;
  const map = splitVariableString(str, opts).map((val, index) => {
    if (index % 2 === 1) {
      const i = parseInt(val, 10);
      if (i >= 0 && i < args.length) {
        const arg = args[i];
        if (React.isValidElement(arg)) {
          onlyStrings = false;
          return React.Children.toArray(arg).map(component => Object.assign({ key: index.toString() }, component));
        }
        return arg;
      } else { throw new Error(`Failed to format string. Index out of bounds (index: "${i}", string: "${str}").`); }
    } else {
      return val;
    }
  });
  return onlyStrings
    ? map.join('')
    : map;
}
