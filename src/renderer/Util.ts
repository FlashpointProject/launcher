/**
 * Calls a defined callback function on each property of an object, and returns an array that contains the results.
 * Similar to Array#map but iterates over the properties of an object.
 * @param source The object whos properties this will iterate over
 * @param callbackfn This is called once per property in the object.
 * @param thisArg What the "this" keyword will refer to inside the callback function (undefined if omitted)
 */
export function forEach<T, U>(source: any, callbackfn: (value: T, key: string) => U, thisArg?: any): any[] {
  const array: any[] = [];
  let index:number = 0;
  for (let key in source) {
    array[index++] = callbackfn.call(thisArg, source[key], key);
  }
  return array;
};

/** Linear Interpolation */
export function lerp(from: number, to: number, value: number) {
  return from + (to - from) * value;
}
