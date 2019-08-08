import { AnyFunction, ArgumentTypesOf, ReturnTypeOf } from './interfaces';
import { shallowStrictEquals } from './Util';

/** Callable object, A is the arguments, R is the return value */
interface Callable<A extends any[], R> extends Function {
  (...args: A): R;
}

/** A short-hand for a callable function that has the same argument and return types as a "normal" function */
type CallableWrap<T extends AnyFunction> = Callable<ArgumentTypesOf<T>, ReturnTypeOf<T>>;

type EqualsCheck<T extends any[]> = (newArgs: T, prevArgs: T) => boolean;

/**
 * Memoize a function with a cache size of one (only store the last return value)
 * Note: This does not make copies of the arguments when caching them, you have to do that yourself beforehand
 * @param func Function to memoize
 * @param equalsFunc Function that compares the the new and previous arguments
 * @returns Memoized function
 */
export function memoizeOne<T extends AnyFunction>(func: T, equalsFunc: EqualsCheck<ArgumentTypesOf<T>> = defaultEqualsFunc): CallableWrap<T> {
  let prevArgs: ArgumentTypesOf<T>;
  let prevReturn: ReturnTypeOf<T>;
  let firstCall: boolean = true;

  const memo: CallableWrap<T> = (...args) => {
    // Figure out if the function has to be called or if the previous return value should be used
    let doRefresh = false;
    if (firstCall || !equalsFunc(args, prevArgs)) {
      doRefresh = true;
    }
    firstCall = false;
    // Refresh return value if necessary
    if (doRefresh) {
      prevArgs = Object.assign([], args);
      prevReturn = func(...args);
    }
    return prevReturn;
  };

  return memo;
}

/** Default function used to compare arguments */
function defaultEqualsFunc<T extends any[]>(newArgs: T, prevArgs: T): boolean {
  return newArgs.length === prevArgs.length &&
         shallowStrictEquals(newArgs, prevArgs);
}
