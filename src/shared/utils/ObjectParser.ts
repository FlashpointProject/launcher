/** Interface for ObjectParserError. */
interface IObjectParserError {
  /** Stack of property names. */
  stack: string[];
  /** Error message. */
  message: string;
  /** Returns a string representation of the error. */
  toString(): string;
};

/** Collection of arguments for the constructor of ObjectParserProp. */
type ObjectParserOptions<T> = {
  /** Object to parse (usually a newly parsed JSON object). */
  input: T;
  /** Called whenever an error that occurs (can be called multiple times). */
  onError?: (error: IObjectParserError) => void;
};

/** Object shared across each "tree" of ObjectParserProps. */
type Context = {
  onError: (error: IObjectParserError) => void;
};

/** Interface for ObjectParserProp. */
export interface IObjectParserProp<P> {
  /** Raw value this is wrapping. */
  readonly value: P;

  /**
   * Call a function for each property of this object.
   * (An error will be "fired" if this is not a non-array object).
   * @param func Called for each property of this object.
   */
  map(func: (item: IObjectParserProp<P[Extract<keyof P, string>]>, label: keyof P) => void): this;

  /**
   * Call a function for each property of this object.
   * (An error will be "fired" if this is not a non-array object).
   * (This uses the raw values of the object - it does NOT wrap the properties in "ObjectParserProp").
   * @param func Called for each property of this object.
   */
  mapRaw(func: (item: P[Extract<keyof P, string>], label: Extract<keyof P, string>) => void): this;

  /**
   * Call a function for each element in this array.
   * (If this is not an array an error will be "fired" instead).
   * @param func Called for each element in the array (starting at index 0 and counting up).
   */
  array(func: (item: P extends Array<any> ? IObjectParserProp<P[number]> : never, index: number, array: P) => void): this;

  /**
   * Call a function for each element in this array.
   * (If this is not an array an error will be "fired" instead).
   * (This uses the raw values of the array - it does NOT wrap the element in "ObjectParserProp").
   * @param func Called for each element in the array (starting at index 0 and counting up).
   */
  arrayRaw(func: (item: P extends Array<any> ? P[number] : never, index: number, array: P) => void): this;

  /**
   * Get a property of this object.
   * @param label Label of the property (also known as "property name").
   * @param optional If the property is optional (no error is "fired" if it is not found, default is false).
   * @returns Property with given label (wrapped in ObjectParserProp).
   */
  prop<L extends keyof P>(label: L, optional?: boolean): IObjectParserProp<P[L]>;

  /**
   * Get a property of this object.
   * @param label Label of the property (also known as "property name").
   * @param func Called if the property was found (and passes the unwrapped property value).
   * @param optional If the property is optional (no error is "fired" if it is not found, default is false).
   * @returns Property with given label (wrapped in ObjectParserProp).
   */
  prop<L extends keyof P>(label: L, func?: (prop: P[L]) => void, optional?: boolean): IObjectParserProp<P[L]>;
}

/** Contains information about an error that occurred in ObjectParserProp. */
class ObjectParserError implements IObjectParserError {
  public stack: string[];
  public message: string;

  constructor(stack: string[], message: string) {
    this.stack = stack;
    this.message = message;
  }

  toString(): string {
    return `${this.message} (stack: "${stackToString(this.stack)}")`;
  }
}

/**
 * A wrapper around a single value (usually a property of an object/array)
 * that makes it easy to iterate over properties of the value, and extract
 * them.
 */
class ObjectParserProp<P> implements IObjectParserProp<P> {
  /** The value this is wrapping. */
  private _property: P;
  /** The context of this object parser tree. */
  private _context: Context;
  /** Stack of property names that lead to this value. */
  private _stack: string[];

  get value(): P {
    return this._property;
  }

  constructor(property: P, context: Context, stack: string[]) {
    this._property = property;
    this._context = context;
    this._stack = stack;
  }

  map(func: (item: IObjectParserProp<P[Extract<keyof P, string>]>, label: keyof P) => void): this {
    const prop = this._property;
    if (typeof prop === 'object' && prop !== null && !Array.isArray(prop)) {
      for (let label in prop) {
        const item = new ObjectParserProp(prop[label], this._context, createStack(this._stack, label));
        func(item, label);
      }
    } else {
      this._context.onError(new ObjectParserError(this._stack, 'Property is not a non-array object.'));
    }
    return this;
  }

  mapRaw(func: (item: P[Extract<keyof P, string>], label: Extract<keyof P, string>) => void): this {
    const prop = this._property;
    if (typeof prop === 'object' && prop !== null && !Array.isArray(prop)) {
      for (let label in prop) {
        func(prop[label], label);
      }
    } else {
      this._context.onError(new ObjectParserError(this._stack, 'Property is not a non-array object.'));
    }
    return this;
  }

  array(func: (item: P extends Array<any> ? IObjectParserProp<P[number]> : never, index: number, array: P) => void): this {
    const prop = this._property;
    if (Array.isArray(prop)) {
      for (let i = 0; i < prop.length; i++) {
        const item = new ObjectParserProp(prop[i], this._context, createStack(this._stack, i));
        func(item as any, i, prop);
      }
    } else {
      this._context.onError(new ObjectParserError(this._stack, 'Property is not an array.'));
    }
    return this;
  }
  
  arrayRaw(func: (item: P extends Array<any> ? P[number] : never, index: number, array: P) => void): this {
    const prop = this._property;
    if (Array.isArray(prop)) {
      for (let i = 0; i < prop.length; i++) {
        func(prop[i], i, prop);
      }
    } else {
      this._context.onError(new ObjectParserError(this._stack, 'Property is not an array.'));
    }
    return this;
  }

  prop<L extends keyof P>(label: L, funcOrOptional?: ((prop: P[L]) => void) | boolean, optional?: boolean): IObjectParserProp<P[L]> {
    // Figure out which argument is used for what purpose
    let func: ((prop: P[L]) => void)|undefined; // ("func" from parameter)
    let isOptional: boolean = false; // ("optional" from parameter)
    if (typeof funcOrOptional === 'function') {
      func = funcOrOptional;
      isOptional = !!optional;
    } else { isOptional = !!funcOrOptional; }
    
    if (this._property !== null &&
        this._property !== undefined &&
        Object.prototype.hasOwnProperty.call(this._property, label)) {
      if (func) { func(this._property[label]); }
    } else if (!isOptional) {
      this._context.onError(new ObjectParserError(this._stack, `Property "${label}" was not found.`));
    }
    const prop = this._property && this._property[label];
    return new ObjectParserProp(prop, this._context, createStack(this._stack, label));
  }
}

export class ObjectParser<T> extends ObjectParserProp<T> {
  constructor(options: ObjectParserOptions<T>) {
    const context: Context = {
      onError: options.onError || noop
    };
    super(options.input, context, []);
  }
}

/**
 * Copy a label stack and add a label to the end of it.
 * @param stack Stack to add element to.
 * @param label Label to put at the end of the stack.
 */
function createStack(stack: string[], label: string | number | Symbol): string[] {
  const newStack = stack.slice();
  newStack.push(label + '');
  return newStack;
}

/**
 * Create a (pretty) string from a stack.
 * @param stack Stack to create string from.
 */
function stackToString(stack: string[]): string {
  if (stack.length === 0) return '';
  return stack.reduce((prev, cur) => prev + (isArrayIndex(cur) ? `[${cur}]` : `.${cur}`));
}

/**
 * Check if a string is a valid array index (whole number, not NaN, etc.).
 * @param index String to check.
 */
function isArrayIndex(index: string): boolean {
  return (parseInt(index)+'' === index) && (index !== 'NaN');
}

function noop() { /* Do nothing. */ }
